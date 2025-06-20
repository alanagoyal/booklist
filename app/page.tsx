import { GridSkeleton } from "@/components/grid-skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";
import HomeContent from "@/components/home-content";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const key = params.key;
  
  const ogImageUrl = key
    ? `/booklist/api/og?key=${encodeURIComponent(key)}`
    : "/booklist/api/og";

  return {
    openGraph: {
      images: [ogImageUrl],
    },
    twitter: {
      images: [ogImageUrl],
    },
  };
}

export default function Home() {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
