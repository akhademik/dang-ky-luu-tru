import { CONFIG } from "./config.js";
import { CatalogManager, catalogManager } from "./catalogManager.js";
import { TokenManager, tokenManager } from "./tokenManager.js";
import { DataTransformer, type RawOcrRow } from "./dataTransformer.js";
import { GoogleSheetService } from "./googleSheetService.js";
import { KbttClient } from "./kbttClient.js";

export interface SyncResult {
	step: string;
	success: boolean;
	status: string;
	message: string;
	row?: RawOcrRow;
	branch?: "VN" | "FOREIGN";
	payload?: Record<string, unknown>;
	response?: unknown;
}

export class SyncPipeline {
	public catalogManager: CatalogManager;
	public tokenManager: TokenManager;
	public dataTransformer: DataTransformer;
	public googleSheetService: GoogleSheetService;
	public kbttClient: KbttClient;

	public constructor() {
		this.catalogManager = catalogManager;
		this.tokenManager = tokenManager;
		this.dataTransformer = new DataTransformer(this.catalogManager);
		this.googleSheetService = new GoogleSheetService();
		this.kbttClient = new KbttClient(this.tokenManager);
	}

	public async initialize(): Promise<void> {
		await this.catalogManager.initialize();
	}

	public async processRows(rows: RawOcrRow[]): Promise<SyncResult[]> {
		const results: SyncResult[] = [];
		const vnBatch: {
			row: RawOcrRow;
			payload: Record<string, unknown>;
			index: number;
		}[] = [];
		const foreignBatch: {
			row: RawOcrRow;
			payload: Record<string, unknown>;
			index: number;
		}[] = [];

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const check = DataTransformer.checkCompleteness(row);
			const isVN = DataTransformer.isGuestVN(row);

			if (!check.isComplete) {
				results.push({
					step: "VALIDATION",
					row,
					branch: isVN ? "VN" : "FOREIGN",
					success: false,
					status: "Thiếu thông tin",
					message: `Dòng ${i + 1} thiếu: ${check.missingFields.join(", ")}`,
				});
				continue;
			}

			if (isVN) {
				vnBatch.push({
					row,
					payload: DataTransformer.transformToPayloadVn(row),
					index: i,
				});
			} else {
				foreignBatch.push({
					row,
					payload: DataTransformer.transformToPayloadForeign(row),
					index: i,
				});
			}
		}

		if (vnBatch.length > 0) {
			try {
				const res = await this.kbttClient.submitVietnameseGuests(
					vnBatch.map((b) => b.payload),
				);
				vnBatch.forEach((b) => {
					results.push({
						step: "API_5_VN",
						row: b.row,
						branch: "VN",
						payload: b.payload,
						success: res.success,
						status: res.success ? "Thành công" : "Thất bại",
						message: res.message,
						response: res.raw,
					});
				});
			} catch (err) {
				const errMsg = (err as Error).message;
				vnBatch.forEach((b) => {
					results.push({
						step: "API_5_VN",
						row: b.row,
						branch: "VN",
						payload: b.payload,
						success: false,
						status: "Lỗi",
						message: errMsg,
					});
				});
			}
		}

		if (foreignBatch.length > 0) {
			try {
				const res = await this.kbttClient.submitForeignGuests(
					foreignBatch.map((b) => b.payload),
				);
				foreignBatch.forEach((b) => {
					results.push({
						step: "API_4_FOREIGN",
						row: b.row,
						branch: "FOREIGN",
						payload: b.payload,
						success: res.success,
						status: res.success ? "Thành công" : "Thất bại",
						message: res.message,
						response: res.raw,
					});
				});
			} catch (err) {
				const errMsg = (err as Error).message;
				foreignBatch.forEach((b) => {
					results.push({
						step: "API_4_FOREIGN",
						row: b.row,
						branch: "FOREIGN",
						payload: b.payload,
						success: false,
						status: "Lỗi",
						message: errMsg,
					});
				});
			}
		}

		return results;
	}
}

export const syncPipeline = new SyncPipeline();
