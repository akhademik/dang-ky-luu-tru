//#region src/routes/api/events/+server.ts
var GET = async () => {
	const stream = new ReadableStream({ start(controller) {
		const data = `retry: 2000\ndata: ${JSON.stringify({ type: "connected" })}\n\n`;
		controller.enqueue(new TextEncoder().encode(data));
	} });
	return new Response(stream, { headers: {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		"Connection": "keep-alive"
	} });
};
//#endregion
export { GET };
