import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenAddress = searchParams.get('address');
  
  if (!tokenAddress) {
    return new NextResponse('Missing token address', { status: 400 });
  }
  
  const imageUrl = `https://cdn.skymavis.com/ronin/2020/erc20/${tokenAddress.toLowerCase()}/logo.png`;
  
  try {
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return NextResponse.redirect(new URL('/token_logo.png', request.url));
    }
    
    const imageBuffer = await response.arrayBuffer();
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=86400' // Cache for a day
      }
    });
  } catch (error) {
    console.error('Error fetching token image:', error);
    return NextResponse.redirect(new URL('/token_logo.png', request.url));
  }
}
