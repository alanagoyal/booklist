import { getBlogPost } from "@/lib/markdown";
import MarkdownRenderer from "@/components/markdown-renderer";
import "@/styles/markdown.css";

export default async function AboutPage() {
  const aboutPost = await getBlogPost("about");

  return (
    <div className="h-full p-4 bg-background text-text overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4">
        {aboutPost ? (
          <MarkdownRenderer content={aboutPost.content} />
        ) : (
          <div className="text-text/70">About content not available.</div>
        )}
      </div>
    </div>
  );
}
