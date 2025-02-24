import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  try {
    const fontData = await fetch(
      'https://cdn.jsdelivr.net/npm/@fontsource/space-mono/files/space-mono-latin-400-normal.woff'
    ).then((res) => res.arrayBuffer());

    return new ImageResponse(
      (
        <div
          style={{
            background: 'black',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'Space Mono',
              fontSize: 128,
              color: 'white',
              letterSpacing: '-0.05em',
            }}
          >
            booklist
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Space Mono',
            data: fontData,
            style: 'normal',
            weight: 400,
          },
        ],
      }
    );
  } catch (e) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}