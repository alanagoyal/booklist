import RecommendationGraph from "@/components/graph";

export default function GraphPage() {
    return (
      <div className="h-full p-4 bg-background text-text overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-base mb-6">Recommendation Graph</h1>
          <RecommendationGraph />
        </div>
      </div>
    );
  }
  