import { json, type RequestHandler } from "@sveltejs/kit";
import { verifyWebhookAuth } from "$lib/server/auth.js";
import { getDb } from "$lib/server/db.js";
import { stayService } from "$lib/server/stayService.js";

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	try {
		if (!verifyWebhookAuth(request, cookies, platform)) {
			return json(
				{
					success: false,
					message:
						"Yêu cầu khóa API xác thực hợp lệ (Unauthorized Webhook - Invalid or Missing API Key).",
				},
				{ status: 401 },
			);
		}

		const db = getDb(platform);
		const body = await request.json();

		let rows: Array<Record<string, unknown>> = [];
		let tabName = "OCR";

		if (Array.isArray(body)) {
			rows = body;
		} else if (body && typeof body === "object") {
			if (Array.isArray(body.rows)) {
				rows = body.rows;
			} else if (Array.isArray(body.data)) {
				rows = body.data;
			} else {
				rows = [body];
			}
			if (typeof body.tabName === "string") {
				tabName = body.tabName;
			}
		}

		if (rows.length === 0) {
			return json(
				{ success: false, message: "Payload không chứa dòng dữ liệu OCR nào" },
				{ status: 400 },
			);
		}

		const result = await stayService.ingestOcrRows(
			db,
			rows as unknown as import("$lib/server/dataTransformer.js").RawOcrRow[],
			tabName,
		);

		return json({
			success: result.success,
			total: result.total,
			created: result.created,
			updated: result.updated,
			items: result.items,
			errors: result.errors,
			message: `Đã xử lý ${result.created} lượt lưu trú vào Cloudflare Database`,
		});
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};
