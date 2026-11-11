// Liveness endpoint for the Docker HEALTHCHECK
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok' });
}
