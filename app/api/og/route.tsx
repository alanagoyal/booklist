import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  if (!process.env.NEXT_PUBLIC_VERCEL_URL) {
    return new Response('Missing NEXT_PUBLIC_VERCEL_URL', { status: 500 });
  }
  try {
    const fontData = await fetch(
      new URL('/booklist/fonts/SpecialElite-Regular.ttf', process.env.NEXT_PUBLIC_VERCEL_URL)
    ).then((res) => res.arrayBuffer());

    return new ImageResponse(
      (
        <div
          style={{
            background: 'hsl(151,80%,70%)', // Using level 6 light mode color for consistent OG image
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'Special Elite',
              fontSize: 72,
              color: 'white',
              letterSpacing: '-0.05em',
            }}
          >
            Booklist.
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Special Elite',
            data: fontData,
            style: 'normal',
            weight: 400,
          },
        ],
      }
    );
  } catch (error) {
    console.error('Failed to generate OG image:', error);
    return new Response('Failed to generate the image', { status: 500 });
  }
}