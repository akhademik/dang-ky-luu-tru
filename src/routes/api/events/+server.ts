import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  const stream = new ReadableStream({
    start(controller) {
      const data = `retry: 2000\ndata: ${JSON.stringify({ type: 'connected' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
};
