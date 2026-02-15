export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      valid: false,
      error: 'PIN verification endpoint has migrated to Firebase-backed services.',
    }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
