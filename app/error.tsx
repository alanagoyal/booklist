"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="p-6 text-text">
      <p>Couldn’t load the booklist.</p>
      <button className="mt-2 underline" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
