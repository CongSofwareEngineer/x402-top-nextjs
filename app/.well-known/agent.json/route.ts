// app/.well-known/agent.json/route.ts
export async function GET() {
  return Response.json(
    {
      name: 'X402 TOP AGENT',
      description: 'Agent-Native Blockchain Gateway',
      version: '1.0.0',
      endpoints: [
        {
          path: '/api/send-token',
          method: 'GET',
          x402: true,
        },
        {
          path: '/api/report',
          method: 'GET',
          x402: true,
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}
