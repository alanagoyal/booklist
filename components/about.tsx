export default function About() {
  return (
    <div className="h-full p-4 bg-background text-text overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-base mb-6">About</h1>

        <div className="space-y-4 text-text/70">
          <p>
            Booklist is a curated collection of{" "}
            <span className="font-bold">
              the most frequently recommended books on the internet
            </span>
            . We've scoured the world wide web to find book recommendations from
            artists, authors, economists, entrepreneurs, historians,
            philosophers, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
