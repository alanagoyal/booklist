"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { useTheme } from "next-themes";
import { createClient } from "@supabase/supabase-js";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as any;

interface Node {
  id: string;
  name: string;
  recommendationCount: number;
  x?: number;
  y?: number;
  details?: {
    personType?: string;
  };
}

interface Link {
  source: string | Node;
  target: string | Node;
  value: number;
  books: string[];
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
  const graphRef = useRef<ForceGraphMethods>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [filteredData, setFilteredData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [minRecommendations, setMinRecommendations] = useState(1);
  const { theme } = useTheme();

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(500, window.innerHeight * 0.6),
        });
      }
    };

    window.addEventListener("resize", updateDimensions);
    updateDimensions();

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    const fetchGraphData = async () => {
      console.log(
        "Fetching graph data with min recommendations:",
        minRecommendations
      );
      const { data, error } = await supabase.rpc("get_recommendation_network", {
        min_shared_books: minRecommendations,
      });

      if (error) {
        console.error("Error fetching graph data:", error);
        return;
      }

      console.log("Raw data from Supabase:", data);

      const nodesMap = new Map<string, Node>();
      const links: Link[] = [];

      (data as QueryResult[]).forEach((row) => {
        // Add source node
        if (!nodesMap.has(row.source_id)) {
          nodesMap.set(row.source_id, {
            id: row.source_id,
            name: row.source_name,
            recommendationCount: 0,
            details: {
              personType: row.source_type,
            },
          });
        }

        // Add target node
        if (!nodesMap.has(row.target_id)) {
          nodesMap.set(row.target_id, {
            id: row.target_id,
            name: row.target_name,
            recommendationCount: 0,
            details: {
              personType: row.target_type,
            },
          });
        }

        const sourceNode = nodesMap.get(row.source_id)!;
        const targetNode = nodesMap.get(row.target_id)!;
        sourceNode.recommendationCount++;
        targetNode.recommendationCount++;

        links.push({
          source: row.source_id,
          target: row.target_id,
          value: row.shared_book_count,
          books: row.shared_book_titles,
        });
      });

      const newData = {
        nodes: Array.from(nodesMap.values()),
        links,
      };

      console.log("Processed graph data:", newData);
      setGraphData(newData);
      setFilteredData(newData);
    };

    fetchGraphData();
  }, [minRecommendations]);

  const getNodeColor = (node: Node) => {
    const isDark = theme === "dark";
    const maxRecommendations = Math.max(
      ...filteredData.nodes
        .filter((n) => n.recommendationCount)
        .map((n) => n.recommendationCount)
    );

    const count = node.recommendationCount;
    const percentile = maxRecommendations > 0 ? count / maxRecommendations : 0;
    const level = Math.min(6, Math.max(1, Math.ceil(percentile * 6)));
    const isHighlighted = highlightNodes.has(node.id);

    if (isDark) {
      const baseColors = [
        "#064e3b", // Level 1 (darkest)
        "#065f46",
        "#047857",
        "#059669",
        "#10b981",
        "#34d399", // Level 6 (lightest)
      ];
      return isHighlighted ? "#6ee7b7" : baseColors[level - 1];
    } else {
      const baseColors = [
        "#d1fae5", // Level 1 (lightest)
        "#a7f3d0",
        "#6ee7b7",
        "#34d399",
        "#10b981",
        "#059669", // Level 6 (darkest)
      ];
      return isHighlighted ? "#047857" : baseColors[level - 1];
    }
  };

  const handleNodeHover = (node: Node | null) => {
    if (!selectedNode) {  // Only update hover state if no node is selected
      setHoveredNode(node);
      setHighlightNodes(new Set(node ? [node.id] : []));
    }
  };

  const handleNodeClick = (node: Node | null) => {
    if (node?.id === selectedNode?.id) {
      // If clicking the same node, deselect it
      setSelectedNode(null);
      setHoveredNode(node); // Restore hover state
      setHighlightNodes(new Set(node ? [node.id] : []));
    } else {
      // Select new node
      setSelectedNode(node);
      setHighlightNodes(new Set(node ? [node.id] : []));
    }
    if (node) {
      // Center view on clicked node
      const distance = 40;
      const distRatio = 1 + distance/Math.hypot(node.x!, node.y!);
      graphRef.current?.centerAt(node.x, node.y, 1000);
      graphRef.current?.zoom(2.5, 1000);
    }
  };

  const handleBackgroundClick = () => {
    setSelectedNode(null);
    setHoveredNode(null);
    setHighlightNodes(new Set());
  };

  const handleResetZoom = () => {
    graphRef.current?.zoomToFit(400, 50);
  };

  const getConnectedNodes = (id: string) => {
    console.log("Getting connected nodes for:", id);
    console.log("Current filtered data:", filteredData);

    const node = filteredData.nodes.find((n) => n.id === id);
    if (!node) {
      console.log("Node not found:", id);
      return [];
    }

    const connectedNodes = filteredData.nodes.filter((n) => {
      const link = filteredData.links.find(
        (l) =>
          ((typeof l.source === "string"
            ? l.source === node.id
            : l.source.id === node.id) &&
            (typeof l.target === "string"
              ? l.target === n.id
              : l.target.id === n.id)) ||
          ((typeof l.source === "string"
            ? l.source === n.id
            : l.source.id === n.id) &&
            (typeof l.target === "string"
              ? l.target === node.id
              : l.target.id === node.id))
      );
      return link !== undefined;
    });

    console.log("Found connected nodes:", connectedNodes);
    return connectedNodes;
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs block mb-1">Min Recommendations</label>
              <select
                value={minRecommendations}
                onChange={(e) => setMinRecommendations(Number(e.target.value))}
                className="w-32 p-1 text-sm bg-[#f0f7f0] dark:bg-[#0a1a0a] border border-[#0a1a0a]/20 dark:border-[#f0f7f0]/20"
              >
                {[1, 2, 3, 5, 10, 15, 20].map((value) => (
                  <option key={value} value={value}>
                    {value}+
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleResetZoom}
              className="px-3 py-1 text-sm border border-[#0a1a0a]/20 dark:border-[#f0f7f0]/20 hover:bg-[#a7f3d0] dark:hover:bg-[#065f46]"
            >
              Reset View
            </button>
          </div>
          <div className="text-sm">
            {filteredData.nodes.length} people
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div
              ref={containerRef}
              className="relative w-2/3 border border-[#0a1a0a]/20 dark:border-[#f0f7f0]/20 bg-[#f0f7f0] dark:bg-[#0a1a0a]"
            >
              {filteredData.nodes.length > 0 ? (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={filteredData}
                  width={dimensions.width}
                  height={dimensions.height}
                  nodeLabel={(node: Node) => node.name}
                  nodeColor={getNodeColor}
                  nodeRelSize={4}
                  linkWidth={(link: Link) => (highlightLinks.has(link) ? 2 : 0.5)}
                  linkColor={() => (theme === "dark" ? "#f0f7f0" : "#0a1a0a")}
                  linkDirectionalParticles={(link: Link) =>
                    highlightLinks.has(link) ? 4 : 0
                  }
                  linkDirectionalParticleWidth={(link: Link) =>
                    highlightLinks.has(link) ? 2 : 0
                  }
                  linkDirectionalParticleSpeed={0.005}
                  linkOpacity={0.3}
                  onNodeHover={handleNodeHover}
                  onNodeClick={handleNodeClick}
                  onBackgroundClick={handleBackgroundClick}
                  cooldownTicks={100}
                  onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
                  nodeCanvasObject={(node: Node, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    const { x, y, name } = node as Node & {
                      x: number;
                      y: number;
                    };
                    const fontSize = 12 / globalScale;
                    const textWidth = ctx.measureText(name).width;
                    const isHighlighted = highlightNodes.has(node.id);

                    // Draw node circle
                    ctx.beginPath();
                    ctx.arc(x, y, isHighlighted ? 5 : 3, 0, 2 * Math.PI);
                    ctx.fillStyle = getNodeColor(node as Node);
                    ctx.fill();

                    // Draw node border
                    ctx.strokeStyle = theme === "dark" ? "#f0f7f0" : "#0a1a0a";
                    ctx.lineWidth = isHighlighted ? 1 : 0.5;
                    ctx.stroke();

                    // Draw node label if zoomed in or highlighted
                    if (globalScale > 1.5 || isHighlighted) {
                      ctx.fillStyle = theme === "dark" ? "#f0f7f0" : "#0a1a0a";
                      ctx.font = `${fontSize}px monospace`;
                      ctx.textAlign = "center";
                      ctx.textBaseline = "top";
                      ctx.fillText(name, x, y + 8);
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-[500px]">
                  <p className="text-sm">
                    No data matches your current filters. Try adjusting your
                    criteria.
                  </p>
                </div>
              )}
            </div>

            {/* Node Details Panel */}
            {(selectedNode || hoveredNode) && (() => {
              const node = (selectedNode || hoveredNode)!;
              return (
                <div className="w-1/3 border border-[#0a1a0a]/20 dark:border-[#f0f7f0]/20 p-4 bg-[#ecfdf5] dark:bg-[#022c22] overflow-y-auto" style={{ height: dimensions.height }}>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold">{node.name}</h3>

                      <p className="text-sm">
                        Recommended {node.recommendationCount} books
                      </p>
                      {node.details?.personType && (
                        <p className="text-sm mt-1">
                          Type: {node.details.personType}
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold mb-2">
                        Mutual Recommendations
                      </h4>
                      <div className="overflow-y-auto">
                        {(() => {
                          const connections = filteredData.links
                            .filter(link => 
                              (link.source as Node).id === node.id || (link.target as Node).id === node.id
                            )
                            .map(link => ({
                              node: (link.source as Node).id === node.id 
                                ? (link.target as Node) 
                                : (link.source as Node),
                              books: link.books
                            }));
                            
                          return connections.length > 0 ? (
                            <table className="w-full text-sm">
                              <thead className="bg-[#d1fae5] dark:bg-[#064e3b]">
                                <tr>
                                  <th className="text-left p-2">
                                    People
                                  </th>
                                  <th className="text-left p-2">Shared Books</th>
                                </tr>
                              </thead>
                              <tbody>
                                {connections.map(({ node: connectedNode, books }, index) => (
                                  <tr
                                    key={index}
                                    className="border-b border-[#0a1a0a]/20 dark:border-[#f0f7f0]/20 hover:bg-[#a7f3d0] dark:hover:bg-[#065f46]"
                                  >
                                    <td className="p-2">{connectedNode.name}</td>
                                    <td className="p-2">
                                      <div className="space-y-1">
                                        {books.map((book, i) => (
                                          <div key={i} className="text-sm">
                                            {book}
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-sm text-text/70">No connections found.</p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
