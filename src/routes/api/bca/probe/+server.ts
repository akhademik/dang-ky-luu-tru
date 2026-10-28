import { json, type RequestHandler } from "@sveltejs/kit";
import { probeBcaConnection } from "$lib/server/bcaProbe.js";

export const GET: RequestHandler = async ({ url }) => {
	const timeoutStr = url.searchParams.get("timeout");
	const timeoutMs = timeoutStr ? Number.parseInt(timeoutStr, 10) : 15000;
	const result = await probeBcaConnection({ timeoutMs });
	return json(result);
};
