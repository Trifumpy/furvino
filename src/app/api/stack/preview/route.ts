export const runtime = 'nodejs';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const t = searchParams.get('t');   // share URL token
  const id = searchParams.get('id'); // node ID
  const h = searchParams.get('h') ?? searchParams.get('height') ?? '1200'; // height, default 1200
  const w = searchParams.get('w') ?? searchParams.get('width') ?? undefined; // optional width
  const format = searchParams.get('format') ?? undefined; // optional format (jpeg, png, mp4, pdf)
  const pw = searchParams.get('pw'); // optional password
  
  if (!t || !id) {
    return new Response('Missing required parameters: t (share token) and id (node ID)', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  try {
    const base = (process.env.STACK_API_URL ?? '').replace(/\/+$/,'');
    
    // Prepare auth body (include password if provided)
    const body = pw ? JSON.stringify({ password: pw }) : undefined;

    // Authorize to get X-ShareToken
    console.log(`[STACK Preview] Authorizing share ${t}...`);
    const auth = await fetch(`${base}/share/${t}`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: body && Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
    });
    
    if (auth.status !== 201) {
      console.error(`[STACK Preview] Share auth failed with status ${auth.status}`);
      return new Response(`Share authentication failed (status: ${auth.status})`, { 
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    const shareToken = auth.headers.get('x-sharetoken');
    if (!shareToken) {
      console.error('[STACK Preview] No ShareToken in response headers');
      return new Response('Share authentication failed - no token received', { 
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    console.log(`[STACK Preview] Got ShareToken, fetching preview for node ${id}...`);
    
    // Fetch preview using the ShareToken
    const upstream = await fetch(`${base}/share/${t}/files/${id}/preview?height=${h}`, {
      headers: { 'X-ShareToken': String(shareToken) }, 
      cache: 'no-store'
    });
    
    if (!upstream.ok) {
      console.error(`[STACK Preview] Preview fetch failed with status ${upstream.status}`);
      const errorText = await upstream.text();
      return new Response(errorText, { 
        status: upstream.status,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // Get content type from upstream response
    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    
    console.log(`[STACK Preview] Successfully fetched preview for node ${id}`);
    
    // Return the preview with appropriate headers
    return new Response(upstream.body, { 
      headers: { 
        'Content-Type': contentType, 
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'Access-Control-Allow-Origin': '*'
      } 
    });
    
  } catch (error) {
    console.error('[STACK Preview] Error:', error);
    return new Response(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
