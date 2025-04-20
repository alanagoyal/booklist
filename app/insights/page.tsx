import { getAllBlogPosts } from "@/lib/markdown";
import MarkdownRenderer from "@/components/markdown-renderer";
import "./insights.css";

export default async function InsightsPage() {
  const posts = await getAllBlogPosts();
  const insightsPost = posts.find(
    (post) => post.slug === "insights"
  );

  return (
    <div className="h-full p-4 bg-background text-text overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        {insightsPost ? (
          <MarkdownRenderer content={insightsPost.content} />
        ) : (
          <div className="text-text/70">No insights available.</div>
        )}
      </div>
    </div>
  );
}
