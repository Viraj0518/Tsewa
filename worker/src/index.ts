// Persistent API proxy — proxies through the Cloudflare tunnel to the backend
// Update TUNNEL_URL when the tunnel restarts (or set up a named tunnel for permanence)
export default {
  async fetch(request: Request, env: { TUNNEL_URL: string }): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = `${env.TUNNEL_URL}${url.pathname}${url.search}`;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const headers = new Headers(request.headers);
    headers.delete('host');

    const init: RequestInit = {
      method: request.method,
      headers,
    };

    if (!['GET', 'HEAD'].includes(request.method)) {
      init.body = request.body;
    }

    try {
      const response = await fetch(targetUrl, init);
      const respHeaders = new Headers(response.headers);
      respHeaders.set('Access-Control-Allow-Origin', '*');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: respHeaders,
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Backend unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
