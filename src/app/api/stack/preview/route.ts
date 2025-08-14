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
    const maxRetries = Number(process.env.STACK_PREVIEW_AUTH_RETRIES ?? 6);
    const retryDelayMs = Number(process.env.STACK_PREVIEW_AUTH_RETRY_MS ?? 500);
    
    // Prepare auth body (include password if provided)
    const bodyObj: { password: string } | undefined = pw ? { password: pw } : undefined;

    // Authorize to get X-ShareToken
    console.log(`[STACK Preview] Authorizing share ${t}...`);
    let auth: Response | undefined;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      auth = await fetch(`${base}/share/${t}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyObj ? JSON.stringify(bodyObj) : undefined,
      });
      if (auth.status === 201) break;
      if ([404, 409, 412, 423, 503].includes(auth.status) && attempt < maxRetries) {
        console.warn(`[STACK Preview] Auth attempt ${attempt}/${maxRetries} failed (${auth.status}). Retrying in ${retryDelayMs}ms...`);
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
      console.error(`[STACK Preview] Share auth failed with status ${auth.status}`);
      return new Response(`Share authentication failed (status: ${auth.status})`, {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    
    const shareToken = (auth as Response).headers.get('x-sharetoken');
    if (!shareToken) {
      console.error('[STACK Preview] No ShareToken in response headers');
      return new Response('Share authentication failed - no token received', { 
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    console.log(`[STACK Preview] Got ShareToken, acquiring CSRF token...`);

    // Acquire CSRF token using AppToken (server-side only, never exposed)
    const appToken = process.env.STACK_APP_TOKEN;
    if (!appToken) {
      console.error('[STACK Preview] Missing STACK_APP_TOKEN for CSRF retrieval');
      return new Response('Server misconfiguration: missing STACK_APP_TOKEN', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const csrfResp = await fetch(`${base}/authenticate/csrf-token`, {
      headers: { 'X-AppToken': appToken },
      cache: 'no-store',
    });
    if (csrfResp.status !== 200) {
      console.error(`[STACK Preview] CSRF fetch failed with status ${csrfResp.status}`);
      return new Response(`Failed to fetch CSRF token (status: ${csrfResp.status})`, {
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    const csrfToken = csrfResp.headers.get('x-csrf-token');
    if (!csrfToken) {
      console.error('[STACK Preview] Missing x-csrf-token header');
      return new Response('Failed to fetch CSRF token', { status: 502 });
    }

    console.log(`[STACK Preview] CSRF acquired, fetching preview for node ${id}...`);

    // Fetch preview using the ShareToken; include CSRF-Token in query
    const previewUrl = new URL(`${base}/share/${t}/files/${id}/preview`);
    if (h) previewUrl.searchParams.set('height', String(h));
    if (w) previewUrl.searchParams.set('width', String(w));
    if (format) previewUrl.searchParams.set('format', String(format));
    previewUrl.searchParams.set('CSRF-Token', csrfToken);

    const upstream = await fetch(previewUrl.toString(), {
      headers: { 'X-ShareToken': String(shareToken) },
      cache: 'no-store',
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
