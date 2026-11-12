// MCP endpoint (Streamable HTTP). Disabled unless MCP_TOKEN is set; clients
// authenticate with `Authorization: Bearer <MCP_TOKEN>`.
import { createHash, timingSafeEqual } from 'node:crypto';

import { createMcpHandler } from '@modelcontextprotocol/server';

import { buildMcpServer } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';

const handler = createMcpHandler(() => buildMcpServer());

// Hash both sides so the comparison is constant-time regardless of length
function tokenMatches(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

async function handle(request: Request): Promise<Response> {
  const expected = process.env.MCP_TOKEN;
  if (!expected) return new Response('Not Found', { status: 404 });

  // MCP clients aren't browsers; refusing any Origin stops web pages from
  // driving the endpoint (e.g. via DNS rebinding)
  if (request.headers.get('origin')) {
    return new Response('Browser requests are not allowed', { status: 403 });
  }

  const auth = request.headers.get('authorization') ?? '';
  const provided = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (!provided || !tokenMatches(provided, expected)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' },
    });
  }

  return handler.fetch(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
