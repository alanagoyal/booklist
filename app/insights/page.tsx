import { getAllBlogPosts } from "@/lib/markdown";
import MarkdownRenderer from "@/components/markdown-renderer";
import "@/styles/markdown.css";

export default async function InsightsPage() {
  const posts = await getAllBlogPosts();
  const insightsPost = posts.find(
    (post) => post.slug === "insights"
  );

  return (
    <div className="h-full p-4 bg-background text-text overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4">
        {insightsPost ? (
          <MarkdownRenderer content={insightsPost.content} />
        ) : (
          <div className="text-muted-foreground">No insights available.</div>
        )}
      </div>
    </div>
  );
}
