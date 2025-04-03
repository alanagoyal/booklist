import RecommendationGraph from "@/components/graph";

export default function GraphPage() {
    return (
      <div className="h-full p-4 bg-background text-text overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <RecommendationGraph />
        </div>
      </div>
    );
  }
  