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
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            padding: '100px',
          }}
        >
          <div
            style={{
              fontFamily: 'Special Elite',
              fontSize: 112,
              color: 'white',
              letterSpacing: '-0.05em',
              marginBottom: '20px',
            }}
          >
            Booklist.
          </div>
          <div
            style={{
              fontFamily: 'Special Elite',
              fontSize: 28,
              color: 'rgba(255, 255, 255, 0.9)',
              letterSpacing: '-0.02em',
              maxWidth: '600px',
              lineHeight: 1.3,
            }}
          >
            The most frequently recommended books on the internet.
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