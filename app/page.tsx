import { GridSkeleton } from "@/components/grid-skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import HomeContent from "@/components/home-content";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const key = params.key;

  // Get the base URL - this is crucial for OG images
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : process.env.NODE_ENV === "production"
      ? siteConfig.url // Replace with your actual domain
      : "http://127.0.0.1:3000";

  const ogImageUrl = key
    ? `${baseUrl}/booklist/api/og?key=${encodeURIComponent(key)}`
    : `${baseUrl}/booklist/api/og`;

  return {
    title: siteConfig.title,
    description: siteConfig.description,
    openGraph: {
      title: siteConfig.title,
      description: siteConfig.description,
      url: siteConfig.url,
      siteName: siteConfig.title,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: siteConfig.title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.title,
      description: siteConfig.description,
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
