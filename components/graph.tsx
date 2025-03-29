'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ForceGraphMethods } from 'react-force-graph-2d';
import { useTheme } from 'next-themes';
import { createClient } from '@supabase/supabase-js';

// Dynamically import ForceGraph2D with no SSR
const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
) as any; // Using any for the component type to avoid type conflicts

// Define our node and link types
interface Node {
  id: string;
  name: string;
  type: string;
  connections: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  [key: string]: any;
}

interface Link {
  source: string | Node;
  target: string | Node;
  value: number;
  books: string[];
  [key: string]: any;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface QueryResult {
  source_id: string;
  source_name: string;
  source_type: string;
  target_id: string;
  target_name: string;
  target_type: string;
  shared_book_count: number;
  shared_book_titles: string[];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RecommendationGraph() {
  const graphRef = useRef<{ centerAt: (x: number, y: number, ms: number) => void; zoom: (k: number, ms: number) => void }>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [hoveredLink, setHoveredLink] = useState<Link | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [minSharedBooks, setMinSharedBooks] = useState(2);
  const { theme } = useTheme();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    // Update dimensions based on window size
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Set initial dimensions
    updateDimensions();

    // Add resize listener
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  useEffect(() => {
    const fetchGraphData = async () => {
      const { data, error } = await supabase
        .rpc('get_recommendation_network', {
          min_shared_books: minSharedBooks
        });

      if (error) {
        console.error('Error fetching graph data:', error);
        return;
      }

      // Process data into nodes and links
      const nodesMap = new Map<string, Node>();
      const links: Link[] = [];

      (data as QueryResult[]).forEach((row) => {
        // Add source node if not exists
        if (!nodesMap.has(row.source_id)) {
          nodesMap.set(row.source_id, {
            id: row.source_id,
            name: row.source_name,
            type: row.source_type,
            connections: 0
          });
        }

        // Add target node if not exists
        if (!nodesMap.has(row.target_id)) {
          nodesMap.set(row.target_id, {
            id: row.target_id,
            name: row.target_name,
            type: row.target_type,
            connections: 0
          });
        }

        // Increment connection count for both nodes
        const sourceNode = nodesMap.get(row.source_id)!;
        const targetNode = nodesMap.get(row.target_id)!;
        sourceNode.connections++;
        targetNode.connections++;

        // Add link
        links.push({
          source: row.source_id,
          target: row.target_id,
          value: row.shared_book_count,
          books: row.shared_book_titles
        });
      });

      setGraphData({
        nodes: Array.from(nodesMap.values()),
        links
      });
    };

    fetchGraphData();
  }, [minSharedBooks]);

  // Color scale based on connection count
  const getNodeColor = (node: Node) => {
    const maxConnections = Math.max(...graphData.nodes.map(n => n.connections));
    const intensity = node.connections / maxConnections;
    
    return theme === 'dark'
      ? `hsla(160, 84%, ${5 + intensity * 20}%, 1)`  // Dark mode: 5% to 25% lightness
      : `hsla(151, 80%, ${95 - intensity * 20}%, 1)`; // Light mode: 95% to 75% lightness
  };

  // Filter nodes based on search
  const filteredData = {
    nodes: graphData.nodes.filter(node => 
      searchTerm === '' || 
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.type.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    links: graphData.links.filter(link => {
      const sourceNode = graphData.nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
      const targetNode = graphData.nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id));
      return (
        searchTerm === '' ||
        (sourceNode && sourceNode.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (targetNode && targetNode.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    })
  };

  const handleNodeHover = (node: Node | null, prev: Node | null) => {
    setHoveredNode(node);
  };

  const handleLinkHover = (link: Link | null, prev: Link | null) => {
    setHoveredLink(link);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-4 bg-background/80 p-4 rounded-base backdrop-blur">
        <input
          type="text"
          placeholder="Search people or types..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64 px-3 py-2 bg-background border-border text-text selection:bg-main selection:text-mtext"
        />
        <div className="flex items-center gap-2">
          <label className="text-text">Min shared books:</label>
          <input
            type="range"
            min="2"
            max="10"
            value={minSharedBooks}
            onChange={(e) => setMinSharedBooks(parseInt(e.target.value))}
            className="w-32"
          />
          <span className="text-text/70">{minSharedBooks}</span>
        </div>
      </div>

      {/* Tooltips */}
      {hoveredNode && (
        <div className="absolute top-4 right-4 z-10 p-4 bg-background/80 backdrop-blur rounded-base">
          <h3 className="font-base text-text">{hoveredNode.name}</h3>
          <p className="text-text/70">{hoveredNode.type}</p>
          <p className="text-text/70">{hoveredNode.connections} connections</p>
        </div>
      )}

      {hoveredLink && (
        <div className="absolute bottom-4 right-4 z-10 p-4 bg-background/80 backdrop-blur rounded-base max-w-md">
          <h3 className="font-base text-text">{hoveredLink.value} books in common</h3>
          <ul className="mt-2 text-text/70 whitespace-pre-line line-clamp-2">
            {hoveredLink.books.map((book, i) => (
              <li key={i}>{book}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Graph */}
      <ForceGraph2D
        ref={graphRef}
        graphData={filteredData}
        nodeId="id"
        nodeLabel="name"
        nodeColor={getNodeColor}
        nodeRelSize={6}
        nodeVal={(node: Node) => node.connections}
        linkWidth={(link: Link) => Math.sqrt(link.value)}
        linkColor={() => theme === 'dark' ? '#d0fbed70' : '#12121270'}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
        onNodeClick={(node: Node) => {
          if (!node.x || !node.y) return;
          const distance = 100;
          const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z || 0);
          graphRef.current?.centerAt(node.x * distRatio, node.y * distRatio, 1000);
          graphRef.current?.zoom(2, 1000);
        }}
        warmupTicks={100}
        cooldownTicks={0}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}
