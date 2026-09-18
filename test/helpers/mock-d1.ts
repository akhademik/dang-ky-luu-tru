import type {
	D1DatabaseLike,
	D1PreparedStatement,
} from "../../src/lib/types/index.js";

interface Row {
	[key: string]: unknown;
}

export class MockD1Database implements D1DatabaseLike {
	private tables: Map<string, Row[]> = new Map([
		["guests", []],
		["stays", []],
		["kbtt_logs", []],
	]);

	private getTable(name: string): Row[] {
		let table = this.tables.get(name);
		if (!table) {
			table = [];
			this.tables.set(name, table);
		}
		return table;
	}

	public async exec(sql: string): Promise<unknown> {
		const statements = sql
			.split(";")
			.map((s) => s.trim())
			.filter(Boolean);

		for (const statement of statements) {
			if (/^DELETE FROM/i.test(statement)) {
				const match = statement.match(/^DELETE FROM\s+(\w+)/i);
				if (match) {
					const tableName = match[1];
					// For simple test cleanup or full delete
					if (/WHERE/i.test(statement)) {
						const table = this.getTable(tableName);
						if (tableName === "kbtt_logs") {
							this.tables.set(
								"kbtt_logs",
								table.filter(
									(r) =>
										!["TEST NGUYEN A", "TEST TRAN B", "TEST JOHN DOE"].includes(
											String(r.guest_name || ""),
										),
								),
							);
						} else if (tableName === "guests") {
							this.tables.set(
								"guests",
								table.filter(
									(r) =>
										!["TEST NGUYEN A", "TEST TRAN B", "TEST JOHN DOE"].includes(
											String(r.ho_ten || ""),
										),
								),
							);
						} else if (tableName === "stays") {
							this.tables.set("stays", []);
						}
					} else {
						this.tables.set(tableName, []);
					}
				}
			}
		}
		return { success: true };
	}

	public prepare(query: string): D1PreparedStatement {
		let boundParams: unknown[] = [];
		const self = this;

		return {
			bind(...params: unknown[]) {
				boundParams = params;
				return this;
			},
			async all<T = unknown>() {
				const res = self.executeQuery<T>(query, boundParams);
				return { results: res.results, success: res.success };
			},
			async first<T = unknown>(colName?: string) {
				const res = self.executeQuery<Record<string, unknown>>(
					query,
					boundParams,
				);
				const row = res.results[0];
				if (!row) return null;
				if (colName && typeof row === "object") {
					return (row[colName] ?? null) as T;
				}
				return row as T;
			},
			async run() {
				const res = self.executeQuery(query, boundParams);
				return { success: res.success, meta: res.meta };
			},
		};
	}

	private executeQuery<T = unknown>(
		sql: string,
		params: unknown[] = [],
	): {
		results: T[];
		success: boolean;
		meta: { changes: number; last_row_id: number };
	} {
		const trimmed = sql.trim();

		// 1. SELECT queries
		if (/^SELECT/i.test(trimmed)) {
			// Dashboard stats query
			if (/SELECT COUNT\(\*\) FROM guests/i.test(trimmed)) {
				const guests = this.getTable("guests");
				const stays = this.getTable("stays");
				const readyToSync = stays.filter((s) =>
					["READY_TO_SYNC", "NOT_CHECKED_IN"].includes(String(s.status)),
				).length;
				const syncedKbtt = stays.filter((s) =>
					["SYNCED_KBTT", "CHECKED_IN"].includes(String(s.status)),
				).length;
				const inHouse = stays.filter((s) =>
					["SYNCED_KBTT", "CHECKED_IN", "EXTENDED"].includes(String(s.status)),
				).length;
				const checkedOut = stays.filter(
					(s) => s.status === "CHECKED_OUT",
				).length;

				return {
					results: [
						{
							totalGuests: guests.length,
							totalStays: stays.length,
							readyToSync,
							syncedKbtt,
							inHouse,
							checkedOut,
						} as T,
					],
					success: true,
					meta: { changes: 0, last_row_id: 0 },
				};
			}

			// SELECT FROM kbtt_logs
			if (/FROM kbtt_logs/i.test(trimmed)) {
				let logs = [...this.getTable("kbtt_logs")];
				if (params.length > 0) {
					const term = String(params[0] || "")
						.replace(/%/g, "")
						.toLowerCase();
					logs = logs.filter((l) =>
						String(l.guest_name || "")
							.toLowerCase()
							.includes(term),
					);
				}
				return {
					results: logs as T[],
					success: true,
					meta: { changes: 0, last_row_id: 0 },
				};
			}

			// SELECT FROM guests
			if (/FROM guests/i.test(trimmed)) {
				const guests = this.getTable("guests");
				if (
					/WHERE UPPER\(TRIM\(so_giay_to\)\) = UPPER\(TRIM\(\?\)\)/i.test(
						trimmed,
					)
				) {
					const doc = String(params[0] || "")
						.trim()
						.toUpperCase();
					const found = guests.find(
						(g) =>
							String(g.so_giay_to || "")
								.trim()
								.toUpperCase() === doc,
					);
					return {
						results: found ? ([found] as T[]) : [],
						success: true,
						meta: { changes: 0, last_row_id: 0 },
					};
				}
				if (/WHERE id = \?/i.test(trimmed)) {
					const id = String(params[0] || "");
					const found = guests.find((g) => g.id === id);
					return {
						results: found ? ([found] as T[]) : [],
						success: true,
						meta: { changes: 0, last_row_id: 0 },
					};
				}
				return {
					results: guests as T[],
					success: true,
					meta: { changes: 0, last_row_id: 0 },
				};
			}

			// SELECT FROM stays JOIN guests OR SELECT FROM stays
			if (/FROM stays/i.test(trimmed)) {
				const stays = this.getTable("stays");
				const guests = this.getTable("guests");

				if (
					/WHERE s\.id = \?/i.test(trimmed) ||
					/WHERE id = \?/i.test(trimmed)
				) {
					const id = String(params[0] || "");
					const stay = stays.find((s) => s.id === id);
					if (!stay)
						return {
							results: [],
							success: true,
							meta: { changes: 0, last_row_id: 0 },
						};
					const guest = guests.find((g) => g.id === stay.guest_id) || {};
					return {
						results: [{ ...guest, ...stay }] as T[],
						success: true,
						meta: { changes: 0, last_row_id: 0 },
					};
				}

				if (/WHERE guest_id = \?/i.test(trimmed)) {
					const guestId = String(params[0] || "");
					const stay = stays
						.filter((s) => s.guest_id === guestId)
						.sort((a, b) =>
							String(b.created_at || "").localeCompare(
								String(a.created_at || ""),
							),
						)[0];
					return {
						results: stay ? ([stay] as T[]) : [],
						success: true,
						meta: { changes: 0, last_row_id: 0 },
					};
				}

				// Joined list
				const joined = stays.map((s) => {
					const g = guests.find((guest) => guest.id === s.guest_id) || {};
					return { ...g, ...s };
				});

				let filtered = joined;
				if (/s\.status IN/i.test(trimmed) && params.length === 0) {
					filtered = filtered.filter((s) =>
						[
							"READY_TO_SYNC",
							"NOT_CHECKED_IN",
							"ERROR",
							"PENDING_VALIDATION",
						].includes(String(s.status)),
					);
				} else if (/s\.status = \?/i.test(trimmed)) {
					const status = String(params[0] || "");
					filtered = filtered.filter((s) => s.status === status);
				}

				return {
					results: filtered as T[],
					success: true,
					meta: { changes: 0, last_row_id: 0 },
				};
			}
		}

		// 2. INSERT queries
		if (/^INSERT INTO/i.test(trimmed)) {
			if (/INSERT INTO guests/i.test(trimmed)) {
				const guests = this.getTable("guests");
				const [
					id,
					loai_giay_to,
					so_giay_to,
					ho_ten,
					ngay_sinh,
					gioi_tinh,
					quoc_tich,
					dia_chi_chi_tiet,
					phuong_xa,
					quan_huyen,
					tinh_thanh,
				] = params;

				const now = new Date(Date.now() + 7 * 3600 * 1000)
					.toISOString()
					.replace("T", " ")
					.substring(0, 19);
				const newGuest = {
					id: String(id),
					loai_giay_to: String(loai_giay_to || "CCCD"),
					so_giay_to: String(so_giay_to || ""),
					ho_ten: String(ho_ten || "")
						.toUpperCase()
						.trim(),
					ngay_sinh: String(ngay_sinh || ""),
					gioi_tinh: String(gioi_tinh || "M"),
					quoc_tich: String(quoc_tich || "VNM"),
					dia_chi_chi_tiet: String(dia_chi_chi_tiet || ""),
					phuong_xa: String(phuong_xa || ""),
					quan_huyen: String(quan_huyen || ""),
					tinh_thanh: String(tinh_thanh || ""),
					created_at: now,
					updated_at: now,
				};
				guests.push(newGuest);
				return {
					results: [],
					success: true,
					meta: { changes: 1, last_row_id: 1 },
				};
			}

			if (/INSERT INTO stays/i.test(trimmed)) {
				const stays = this.getTable("stays");
				const [
					id,
					guest_id,
					so_phong,
					ngay_den,
					ngay_di_du_kien,
					ngay_di_thuc_te,
					thoi_han_thi_thuc,
					ly_do_luu_tru,
					status,
					ma_ho_so_kbtt,
					ghi_chu,
					source_sheet_tab,
					source_sheet_row,
				] = params;

				const now = new Date(Date.now() + 7 * 3600 * 1000)
					.toISOString()
					.replace("T", " ")
					.substring(0, 19);
				const newStay = {
					id: String(id),
					guest_id: String(guest_id),
					so_phong: String(so_phong || ""),
					ngay_den: String(ngay_den || ""),
					ngay_di_du_kien: ngay_di_du_kien ? String(ngay_di_du_kien) : "",
					ngay_di_thuc_te: ngay_di_thuc_te ? String(ngay_di_thuc_te) : null,
					thoi_han_thi_thuc: thoi_han_thi_thuc
						? String(thoi_han_thi_thuc)
						: null,
					ly_do_luu_tru: Number(ly_do_luu_tru || 1),
					status: String(status || "READY_TO_SYNC"),
					ma_ho_so_kbtt: ma_ho_so_kbtt ? String(ma_ho_so_kbtt) : "",
					ghi_chu: ghi_chu ? String(ghi_chu) : "",
					source_sheet_tab: source_sheet_tab ? String(source_sheet_tab) : "",
					source_sheet_row: source_sheet_row ? Number(source_sheet_row) : null,
					created_at: now,
					updated_at: now,
				};
				stays.push(newStay);
				return {
					results: [],
					success: true,
					meta: { changes: 1, last_row_id: 1 },
				};
			}

			if (/INSERT INTO kbtt_logs/i.test(trimmed)) {
				const logs = this.getTable("kbtt_logs");
				const [
					id,
					stay_id,
					api_endpoint,
					guest_name,
					so_giay_to,
					so_phong,
					request_payload,
					response_payload,
					http_status,
					code,
					is_success,
					error_message,
				] = params;
				const now = new Date(Date.now() + 7 * 3600 * 1000)
					.toISOString()
					.replace("T", " ")
					.substring(0, 19);
				logs.push({
					id: String(id),
					stay_id: stay_id ? String(stay_id) : null,
					api_endpoint: String(api_endpoint),
					guest_name: String(guest_name || ""),
					so_giay_to: String(so_giay_to || ""),
					so_phong: String(so_phong || ""),
					request_payload: String(request_payload || ""),
					response_payload: String(response_payload || ""),
					http_status: Number(http_status || 200),
					code: String(code || ""),
					is_success: Number(is_success || 0),
					error_message: String(error_message || ""),
					created_at: now,
				});
				return {
					results: [],
					success: true,
					meta: { changes: 1, last_row_id: 1 },
				};
			}
		}

		// 3. UPDATE queries
		if (/^UPDATE/i.test(trimmed)) {
			const now = new Date(Date.now() + 7 * 3600 * 1000)
				.toISOString()
				.replace("T", " ")
				.substring(0, 19);

			if (/UPDATE guests/i.test(trimmed)) {
				const guests = this.getTable("guests");
				const id = String(params[params.length - 1]);
				const guest = guests.find((g) => g.id === id);
				if (guest) {
					if (params.length === 10) {
						// Full upsert update
						guest.ho_ten = String(params[0]).toUpperCase().trim();
						guest.loai_giay_to = String(params[1]);
						guest.ngay_sinh = String(params[2]);
						guest.gioi_tinh = String(params[3]);
						guest.quoc_tich = String(params[4]);
						guest.dia_chi_chi_tiet = String(params[5]);
						guest.phuong_xa = String(params[6]);
						guest.quan_huyen = String(params[7]);
						guest.tinh_thanh = String(params[8]);
					} else {
						// Parse dynamic SET clauses: e.g. "SET updated_at = ..., ghi_chu = ?"
						const setPartMatch = trimmed.match(/SET\s+(.+)\s+WHERE/i);
						if (setPartMatch) {
							const assignments = setPartMatch[1]
								.split(",")
								.map((s) => s.trim());
							let paramIdx = 0;
							for (const assignment of assignments) {
								if (assignment.includes("=?") || assignment.includes("= ?")) {
									const col = assignment.split("=")[0].trim();
									guest[col] = params[paramIdx++];
								}
							}
						}
					}
					guest.updated_at = now;
					return {
						results: [],
						success: true,
						meta: { changes: 1, last_row_id: 0 },
					};
				}
			}

			if (/UPDATE stays/i.test(trimmed)) {
				const stays = this.getTable("stays");
				const id = String(params[params.length - 1]);
				const stay = stays.find((s) => s.id === id);
				if (stay) {
					if (/SET ngay_di_du_kien = \?, status = 'EXTENDED'/i.test(trimmed)) {
						stay.ngay_di_du_kien = String(params[0]);
						stay.status = "EXTENDED";
					} else if (
						/SET ngay_di_thuc_te = \?, status = 'CHECKED_OUT'/i.test(trimmed)
					) {
						stay.ngay_di_thuc_te = String(params[0]);
						stay.status = "CHECKED_OUT";
					} else {
						// Dynamic SET assignment
						const setPartMatch = trimmed.match(/SET\s+(.+)\s+WHERE/i);
						if (setPartMatch) {
							const assignments = setPartMatch[1]
								.split(",")
								.map((s) => s.trim());
							let paramIdx = 0;
							for (const assignment of assignments) {
								if (assignment.includes("=?") || assignment.includes("= ?")) {
									const col = assignment.split("=")[0].trim();
									stay[col] = params[paramIdx++];
								}
							}
						}
					}
					stay.updated_at = now;
					return {
						results: [],
						success: true,
						meta: { changes: 1, last_row_id: 0 },
					};
				}
			}
		}

		// 4. DELETE queries
		if (/^DELETE FROM/i.test(trimmed)) {
			if (/DELETE FROM stays WHERE id = \?/i.test(trimmed)) {
				const id = String(params[0]);
				const stays = this.getTable("stays");
				const initialLen = stays.length;
				this.tables.set(
					"stays",
					stays.filter((s) => s.id !== id),
				);
				return {
					results: [],
					success: true,
					meta: {
						changes: initialLen - this.getTable("stays").length,
						last_row_id: 0,
					},
				};
			}
			if (/DELETE FROM kbtt_logs WHERE id = \?/i.test(trimmed)) {
				const id = String(params[0]);
				const logs = this.getTable("kbtt_logs");
				const initialLen = logs.length;
				this.tables.set(
					"kbtt_logs",
					logs.filter((l) => l.id !== id),
				);
				return {
					results: [],
					success: true,
					meta: {
						changes: initialLen - this.getTable("kbtt_logs").length,
						last_row_id: 0,
					},
				};
			}
			if (/DELETE FROM kbtt_logs$/i.test(trimmed)) {
				this.tables.set("kbtt_logs", []);
				return {
					results: [],
					success: true,
					meta: { changes: 1, last_row_id: 0 },
				};
			}
		}

		return { results: [], success: true, meta: { changes: 0, last_row_id: 0 } };
	}
}
