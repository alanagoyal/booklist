import { getAllBlogPosts } from "@/lib/markdown";
import MarkdownRenderer from "@/components/markdown-renderer";
import "./insights.css";

export default async function InsightsPage() {
  const posts = await getAllBlogPosts();
  const literaryGalaxyPost = posts.find(
    (post) => post.slug === "literary-galaxy"
  );

  return (
    <div className="h-[calc(100dvh-4rem)] overflow-auto">
      <div className="container mx-auto px-4 py-8">
        {literaryGalaxyPost ? (
          <div className="p-6 max-w-4xl mx-auto">
            <MarkdownRenderer content={literaryGalaxyPost.content} />
          </div>
        ) : (
          <div className="text-text/70">No insights available.</div>
        )}
      </div>
    </div>
  );
}
