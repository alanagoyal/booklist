import { Recommendations } from "@/components/recommendations";

export default async function RecommendationsPage() {
  return (
    <div className="h-full p-4 bg-background text-text overflow-y-auto">
      <Recommendations />
    </div>
  );
}
