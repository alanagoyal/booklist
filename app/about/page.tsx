import About from "@/components/about";

export default function AboutPage() {
  return (
    <div className="h-full p-4 bg-background text-text overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-[28px] leading-none font-bold mt-8 mb-4">About</h1>
        <About />
      </div>
    </div>
  );
}
