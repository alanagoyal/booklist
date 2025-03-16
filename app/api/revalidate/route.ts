import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to handle CORS
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, revalidate-token',
  };
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('revalidate-token');
  
  if (token !== process.env.REVALIDATE_TOKEN) {
    return NextResponse.json({ message: 'Invalid token' }, { 
      status: 401,
      headers: corsHeaders()
    });
  }

  try {
    revalidatePath('/');
    return NextResponse.json({ revalidated: true, now: Date.now() }, {
      headers: corsHeaders()
    });
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating' }, { 
      status: 500,
      headers: corsHeaders()
    });
  }
}
