"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { useTheme } from "next-themes";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Expand, X } from "lucide-react";

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
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [lastInteractedNode, setLastInteractedNode] = useState<Node | null>(
    null
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const { theme } = useTheme();

  // Add comment for htis
  // Reset graph state when component mounts/remounts
  useEffect(() => {
    setSelectedNode(null);
    setHoveredNode(null);
    setLastInteractedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
    setExpandedRows(new Set());

    return () => {
      if (graphRef.current) {
        // Force cleanup of graph instance
        graphRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchGraphData = async () => {
      const { data, error } = await supabase.rpc("get_recommendation_network");

      if (error) {
        console.error("Error fetching graph data:", error);
        return;
      }

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
      setGraphData(newData);
    };

    fetchGraphData();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        // Update dimensions
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });

        // Trigger graph update
        if (graphRef.current) {
          graphRef.current.d3ReheatSimulation();
        }
      }
    };

    // Initial dimensions
    handleResize();

    // Update on resize
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get node color based on recommendation count
  const getNodeColor = (node: Node) => {
    const isDark = theme === "dark";
    const maxRecommendations = Math.max(
      ...graphData.nodes
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

  // Handle node hover
  const handleNodeHover = (node: Node | null) => {
    if (!selectedNode) {
      setHoveredNode(node);
      if (node) {
        setLastInteractedNode(node);
      }
      setHighlightNodes(new Set(node ? [node.id] : []));
    }
  };

  // Handle node click
  const handleNodeClick = (node: Node | null) => {
    if (node?.id === selectedNode?.id) {
      setSelectedNode(null);
      setHoveredNode(node);
      if (node) {
        setLastInteractedNode(node);
      }
      setHighlightNodes(new Set(node ? [node.id] : []));
    } else {
      setSelectedNode(node);
      if (node) {
        setLastInteractedNode(node);
      }
      setHighlightNodes(new Set(node ? [node.id] : []));
    }
    if (node) {
      // Center view on clicked node
      graphRef.current?.centerAt(node.x, node.y, 1000);
      graphRef.current?.zoom(2.5, 1000);
    }
  };

  // Handle background click
  const handleBackgroundClick = () => {
    setSelectedNode(null);
    setHoveredNode(null);
    setHighlightNodes(new Set());
  };

  const handleResetZoom = () => {
    setSelectedNode(null);
    setHoveredNode(null);
    setLastInteractedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
    setExpandedRows(new Set());
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setSelectedNode(null);
      setHighlightNodes(new Set());
      if (graphRef.current) {
        graphRef.current.zoomToFit(400);
      }
      return;
    }

    const lowerQuery = query.toLowerCase();
    const matchedNode = graphData.nodes.find((node) =>
      node.name.toLowerCase().includes(lowerQuery)
    );

    if (matchedNode) {
      handleNodeClick(matchedNode);
    }
  };

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-5">
      {/* Node Details Panel */}
      <div className="hidden md:flex order-2 col-span-2 h-full border-l border-border p-4 bg-[#ecfdf5] dark:bg-[#0a1a0a] flex-col">
        <div className="relative flex-1 overflow-hidden">
          <div
            className={`absolute inset-0 transition-opacity duration-200 ${!lastInteractedNode ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <div className="flex flex-col items-center justify-center h-full text-text/70">
              <p className="text-base text-center">
                Hover or click to explore connections
              </p>
              <p className="text-sm mt-2 text-center">Scroll to zoom in/out</p>
            </div>
          </div>

          <div
            className={`absolute inset-0 transition-opacity duration-200 ${lastInteractedNode ? "opacity-100" : "opacity-0 pointer-events-none"} flex flex-col`}
          >
            {lastInteractedNode &&
              (() => {
                const node = selectedNode || hoveredNode || lastInteractedNode;
                return (
                  <div className="flex flex-col h-full">
                    <div className="flex-none pb-4 bg-[#ecfdf5] dark:bg-[#0a1a0a]">
                      <div className="flex justify-between items-start">
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
                        <Link
                          href={`/?recommenders=${encodeURIComponent(node.name)}`}
                          className="text-text/70 transition-colors duration-200 hover:text-text"
                        >
                          <Expand className="w-5 h-5" />
                        </Link>
                      </div>
                      <h4 className="text-sm font-bold mt-4">
                        Books and Recommenders
                      </h4>
                    </div>

                    <div className="overflow-y-auto flex-1">
                      <div>
                        <table className="w-full text-sm">
                          <thead className="bg-[#d1fae5] dark:bg-[#065f46] sticky top-0">
                            <tr>
                              <th className="text-left p-2 w-1/2">Book</th>
                              <th className="text-left p-2 w-1/2">
                                Recommender
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const connections = graphData.links.filter(
                                (link) =>
                                  (link.source as Node).id === node.id ||
                                  (link.target as Node).id === node.id
                              );

                              // Create a map of books to their recommenders
                              const bookMap = new Map<string, Set<string>>();
                              connections.forEach((link) => {
                                const otherNode =
                                  (link.source as Node).id === node.id
                                    ? (link.target as Node)
                                    : (link.source as Node);

                                link.books.forEach((book) => {
                                  if (!bookMap.has(book)) {
                                    bookMap.set(book, new Set());
                                  }
                                  bookMap.get(book)!.add(otherNode.name);
                                });
                              });

                              // Convert to array and sort by number of recommenders, then alphabetically
                              const bookEntries = Array.from(
                                bookMap.entries()
                              ).sort((a, b) => {
                                // First sort by number of recommenders (descending)
                                const recommendersDiff = b[1].size - a[1].size;
                                // If same number of recommenders, sort alphabetically
                                return recommendersDiff !== 0
                                  ? recommendersDiff
                                  : a[0].localeCompare(b[0]);
                              });

                              return bookEntries.length > 0 ? (
                                bookEntries.map(
                                  ([book, recommenders], index) => {
                                    const recommendersList =
                                      Array.from(recommenders);
                                    const displayCount = 3;
                                    const hasMore =
                                      recommendersList.length > displayCount;
                                    const isExpanded = expandedRows.has(book);

                                    return (
                                      <tr
                                        key={index}
                                        className="border-b last:border-b-0 border-[#0a1a0a]/20 dark:border-[#f0f7f0]/20 hover:bg-[#a7f3d0] dark:hover:bg-[#0a1a0a]/50 cursor-pointer transition-colors duration-200"
                                        onClick={() => {
                                          setExpandedRows((prev) => {
                                            const next = new Set(prev);
                                            if (isExpanded) {
                                              next.delete(book);
                                            } else {
                                              next.add(book);
                                            }
                                            return next;
                                          });
                                        }}
                                      >
                                        <td className="p-2 w-1/2">
                                          <div
                                            className={`whitespace-pre-line transition-all duration-200 break-words overflow-hidden ${
                                              !isExpanded ? "line-clamp-2" : ""
                                            }`}
                                          >
                                            {book}
                                          </div>
                                        </td>
                                        <td className="p-2 w-1/2">
                                          <div
                                            className={`whitespace-pre-line transition-all duration-200 overflow-hidden ${
                                              !isExpanded ? "line-clamp-2" : ""
                                            }`}
                                          >
                                            <div className="inline">
                                              {recommendersList.map(
                                                (recommender, idx) => (
                                                  <span key={idx}>
                                                    <span
                                                      className="hover:underline cursor-pointer hover:text-text"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const recommenderNode =
                                                          graphData.nodes.find(
                                                            (n) =>
                                                              n.name ===
                                                              recommender
                                                          );
                                                        if (recommenderNode) {
                                                          handleNodeClick(
                                                            recommenderNode
                                                          );
                                                        }
                                                      }}
                                                    >
                                                      {recommender}
                                                    </span>
                                                    {idx <
                                                      recommendersList.length -
                                                        1 && ", "}
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  }
                                )
                              ) : (
                                <p className="text-sm text-text/70">
                                  No books found.
                                </p>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="relative order-1 col-span-1 md:col-span-3 h-full bg-[#f0f7f0] dark:bg-[#0a1a0a] overflow-hidden"
      >
        {/* Search input overlay */}
        <div className="absolute top-3 left-3 right-3 z-10 flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by recommender"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-3 py-1 text-sm border border-[#0a1a0a]/20 dark:border-[#f0f7f0]/20 bg-[#f0f7f0]/80 dark:bg-[#0a1a0a]/80 backdrop-blur-sm text-text placeholder:text-text/70 selection:bg-main selection:text-mtext focus:outline-none text-ellipsis rounded-none"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text/70 transition-colors duration-200 hover:text-text p-1 -mr-1"
                onClick={() => handleSearch("")}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={handleResetZoom}
            className="w-28 px-3 py-1 text-sm border border-[#0a1a0a]/20 dark:border-[#f0f7f0]/20 bg-[#f0f7f0]/80 dark:bg-[#0a1a0a]/80 backdrop-blur-sm text-text/70 transition-colors duration-200 hover:text-text hover:bg-accent/50"
          >
            Reset View
          </button>
        </div>

        {/* People count overlay */}
        <div className="absolute bottom-5 right-5 z-10 text-text/70 text-xs whitespace-pre-line transition-all duration-200 bg-[#f0f7f0]/80 dark:bg-[#0a1a0a]/80 backdrop-blur-sm p-2 selection:bg-main selection:text-mtext">
          {graphData.nodes.length} people
        </div>
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node: Node) => node.name}
          nodeColor={getNodeColor}
          nodeRelSize={4}
          linkWidth={(link: Link) => (highlightLinks.has(link) ? 2 : 0.3)}
          linkColor={() => (theme === "dark" ? "#f0f7f0" : "#0a1a0a")}
          linkDirectionalParticles={(link: Link) =>
            highlightLinks.has(link) ? 4 : 0
          }
          linkDirectionalParticleWidth={(link: Link) =>
            highlightLinks.has(link) ? 2 : 0
          }
          linkDirectionalParticleSpeed={0.005}
          linkOpacity={0.15}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          cooldownTicks={100}
          onEngineStop={() => {
            // Only zoom to fit if graph ref exists and no node is selected
            if (graphRef.current && !selectedNode) {
              graphRef.current.zoomToFit(400);
            }
          }}
          onNodeDragEnd={(node: Node) => {
            // Update node position in graphData to maintain position after re-renders
            setGraphData((prev) => ({
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === node.id ? { ...n, x: node.x, y: node.y } : n
              ),
            }));
          }}
          nodeCanvasObject={(
            node: Node,
            ctx: CanvasRenderingContext2D,
            globalScale: number
          ) => {
            const { x, y, name } = node as Node & {
              x: number;
              y: number;
            };
            const fontSize = 12 / globalScale;
            const textWidth = ctx.measureText(name).width;
            const isHighlighted = highlightNodes.has(node.id);

            // Draw node circle
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = getNodeColor(node as Node);
            ctx.fill();

            // Draw node border with width scaled by zoom
            ctx.strokeStyle = theme === "dark" ? "#f0f7f0" : "#0a1a0a";
            ctx.lineWidth = isHighlighted
              ? 0.5 / globalScale
              : 0.2 / globalScale;
            ctx.stroke();

            // Draw node label only when significantly zoomed in
            if (globalScale > 2.5) {
              ctx.fillStyle = theme === "dark" ? "#f0f7f0" : "#0a1a0a";
              ctx.font = `${fontSize}px monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillText(name, x, y + 8);
            }
          }}
        />
      </div>
    </div>
  );
}
