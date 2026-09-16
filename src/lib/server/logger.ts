export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
	id: string;
	timestamp: string;
	level: LogLevel;
	tag: string;
	message: string;
	data?: unknown;
}

class Logger {
	private static instance: Logger;
	private logs: LogEntry[] = [];
	private maxLogs = 300;
	private isDev = process.env.NODE_ENV !== "production";

	public static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}

	private formatTime(): string {
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${String(now.getMilliseconds()).padStart(3, "0")}`;
	}

	public log(
		level: LogLevel,
		tag: string,
		message: string,
		data?: unknown,
	): void {
		const timestamp = this.formatTime();
		const entry: LogEntry = {
			id: Math.random().toString(36).substring(2, 9),
			timestamp,
			level,
			tag,
			message,
			data,
		};

		this.logs.push(entry);
		if (this.logs.length > this.maxLogs) {
			this.logs.shift();
		}

		// Console output with colors
		const colors = {
			DEBUG: "\x1b[36m", // Cyan
			INFO: "\x1b[32m", // Green
			WARN: "\x1b[33m", // Yellow
			ERROR: "\x1b[31m", // Red
			RESET: "\x1b[0m",
			TAG: "\x1b[35m", // Magenta
			TIME: "\x1b[90m", // Gray
		};

		const color = colors[level] || colors.INFO;
		const dataStr =
			data !== undefined
				? typeof data === "string"
					? ` | ${data}`
					: ` | ${JSON.stringify(data)}`
				: "";
		console.log(
			`${colors.TIME}[${timestamp}]${colors.RESET} ${color}[${level.padEnd(5)}]${colors.RESET} ${colors.TAG}[${tag}]${colors.RESET} ${message}${dataStr}`,
		);
	}

	public debug(tag: string, message: string, data?: unknown): void {
		if (this.isDev) {
			this.log("DEBUG", tag, message, data);
		}
	}

	public info(tag: string, message: string, data?: unknown): void {
		this.log("INFO", tag, message, data);
	}

	public warn(tag: string, message: string, data?: unknown): void {
		this.log("WARN", tag, message, data);
	}

	public error(tag: string, message: string, data?: unknown): void {
		this.log("ERROR", tag, message, data);
	}

	public getRecentLogs(limit = 100): LogEntry[] {
		return this.logs.slice(-limit);
	}

	public clear(): void {
		this.logs = [];
	}
}

export const logger = Logger.getInstance();
