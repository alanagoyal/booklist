import About from "@/components/about";

export default function AboutPage() {
  return (
    <div className="h-full p-4 bg-background text-text overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-base mb-6">About</h1>
        <About />
      </div>
    </div>
  );
}
