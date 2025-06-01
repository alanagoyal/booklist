import { Recommendations } from "@/components/recommendations";

export default async function RecommendationsPage() {
  return (
    <div className="h-full p-4 bg-background text-text overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-3xl leading-none font-bold mt-8 mb-4">Recommendations</h1>
        <Recommendations />
      </div>
    </div>
  );
}
