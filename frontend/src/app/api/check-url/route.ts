import { NextRequest, NextResponse } from 'next/server';

// Server-side URL reachability probe used by the website field in Step 1
// of the Vendor Registration Form. Running the check server-side avoids
// CORS failures that would block a direct browser fetch to arbitrary origins.

export async function GET(request: NextRequest) {
  const rawUrl = new URL(request.url).searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ reachable: false, error: 'No URL provided' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ reachable: false, error: 'Only HTTP/HTTPS URLs are supported' });
    }
  } catch {
    return NextResponse.json({ reachable: false, error: 'Invalid URL format' });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(parsed.toString(), {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Identify the bot so well-configured servers don't block it.
        'User-Agent': 'Mozilla/5.0 (compatible; M2C-SiteVerify/1.0)',
      },
    });

    clearTimeout(timer);

    // Treat any non-5xx response as reachable (404, 403, etc. still mean the
    // server is alive; only server errors indicate the site is broken).
    const reachable = response.status < 500;
    return NextResponse.json({ reachable, status: response.status });
  } catch (err: unknown) {
    const timedOut = (err as { name?: string })?.name === 'AbortError';
    return NextResponse.json({
      reachable: false,
      error: timedOut ? 'Website took too long to respond' : 'Website could not be reached',
    });
  }
}
