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
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { theme } = useTheme();

  // Add comment for htis
  // Reset graph state when component mounts/remounts
  useEffect(() => {
    setSelectedNode(null);
    setHoveredNode(null);
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
      // Only update hover state if no node is selected
      setHoveredNode(node);
      setHighlightNodes(new Set(node ? [node.id] : []));
    }
  };

  // Handle node click
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

  // Handle reset zoom
  const handleResetZoom = () => {
    graphRef.current?.zoomToFit(400, 50);
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Reset view button */}
            <button
              onClick={handleResetZoom}
              className="px-3 py-1 text-sm border border-[#0a1a0a]/20 dark:border-[#f0f7f0]/20 hover:bg-[#a7f3d0] dark:hover:bg-[#065f46]"
            >
              Reset View
            </button>
          </div>
          <div className="text-sm">{graphData.nodes.length} people</div>
        </div>

        {/* Graph */}
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-4">
            <div
              ref={containerRef}
              className="relative col-span-3 min-h-[500px] h-[70vh] border border-[#0a1a0a]/20 dark:border-[#f0f7f0]/20 bg-[#f0f7f0] dark:bg-[#0a1a0a]"
            >
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={containerRef.current?.clientWidth ?? 0}
                height={containerRef.current?.clientHeight ?? 0}
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
                    graphRef.current.zoomToFit(400, 50);
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
            </div>

            {/* Node Details Panel */}
            {(selectedNode || hoveredNode) &&
              (() => {
                const node = (selectedNode || hoveredNode)!;
                return (
                  <div className="col-span-2 min-h-[500px] h-[70vh] border border-[#0a1a0a]/20 dark:border-[#f0f7f0]/20 p-4 bg-[#ecfdf5] dark:bg-[#022c22] overflow-y-auto">
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
                          Books and Recommenders
                        </h4>
                        <div className="overflow-y-auto">
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
                              <table className="w-full text-sm">
                                <thead className="bg-[#d1fae5] dark:bg-[#064e3b]">
                                  <tr>
                                    <th className="text-left p-2 w-1/2">
                                      Book
                                    </th>
                                    <th className="text-left p-2 w-1/2">
                                      Recommended By
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bookEntries.map(
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
                                          className="border-b border-[#0a1a0a]/20 dark:border-[#f0f7f0]/20 hover:bg-[#a7f3d0] dark:hover:bg-[#065f46] cursor-pointer"
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
                                                !isExpanded
                                                  ? "line-clamp-2"
                                                  : ""
                                              }`}
                                            >
                                              {book}
                                            </div>
                                          </td>
                                          <td className="p-2 w-1/2">
                                            <div
                                              className={`whitespace-pre-line transition-all duration-200 overflow-hidden ${
                                                !isExpanded
                                                  ? "line-clamp-2"
                                                  : ""
                                              }`}
                                            >
                                              <div className="inline">
                                                {recommendersList.map(
                                                  (recommender, idx) => (
                                                    <span key={idx}>
                                                      <span
                                                        className="hover:underline cursor-pointer md:hover:text-text"
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
                                  )}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-sm text-text/70">
                                No books found.
                              </p>
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
