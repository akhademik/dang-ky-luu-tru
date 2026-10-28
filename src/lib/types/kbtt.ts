export type KbttErrorClass =
	| "UPSTREAM_GATEWAY"
	| "TIMEOUT"
	| "NETWORK"
	| "AUTH"
	| "BUSINESS_REJECT"
	| "SCHEMA_CHANGED"
	| "ALREADY_REGISTERED"
	| "APP_INTERNAL";

export interface ClassificationInput {
	status?: number;
	error?: unknown;
	rawText?: string;
	resData?: Record<string, unknown>;
	contentType?: string;
	serverHeader?: string;
	cfRay?: string;
}

export interface ClassificationResult {
	errorClass: KbttErrorClass;
	outcomeUnknown: boolean;
	message: string;
}

export interface ProbeOptions {
	timeoutMs?: number;
	checkAuth?: boolean;
}

export interface BcaHealthProbeResult {
	success: boolean;
	httpStatus: number;
	latencyMs: number;
	env: string;
	host: string;
	cfRay?: string;
	serverHeader?: string;
	errorClass?: KbttErrorClass | string;
	message: string;
	checkedAt: string;
}

export interface KbttApiResponse<T = unknown> {
	success: boolean;
	code: string | number;
	httpStatus: number;
	message: string;
	requestId: string;
	durationMs: number;
	ttfbMs?: number;
	errorClass?: KbttErrorClass;
	outcomeUnknown?: boolean;
	cfRay?: string;
	serverHeader?: string;
	host?: string;
	env?: string;
	raw?: T;
}
