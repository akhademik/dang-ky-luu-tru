import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function scanDirectoryForForbiddenPatterns(
	dir: string,
	forbiddenPatterns: Array<{ pattern: RegExp; message: string }>,
) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (
				entry.name !== "node_modules" &&
				entry.name !== ".svelte-kit" &&
				entry.name !== "graphify-out" &&
				entry.name !== ".git"
			) {
				scanDirectoryForForbiddenPatterns(fullPath, forbiddenPatterns);
			}
		} else if (
			entry.isFile() &&
			(entry.name.endsWith(".svelte") ||
				entry.name.endsWith(".ts") ||
				entry.name.endsWith(".js"))
		) {
			const content = fs.readFileSync(fullPath, "utf8");
			for (const { pattern, message } of forbiddenPatterns) {
				const match = content.match(pattern);
				if (match) {
					assert.fail(
						`[Svelte 5 Deprecation Error] Found forbidden pattern in ${fullPath}:\nPattern: ${pattern}\nMessage: ${message}`,
					);
				}
			}
		}
	}
}

async function runSvelteDeprecationCheck() {
	console.log(
		"🧪 [Unit] Kiểm tra phát hiện các mẫu code Svelte 4 / deprecated trong Svelte 5...",
	);

	const srcDir = path.resolve(process.cwd(), "src");
	const forbiddenPatterns = [
		{
			pattern: /\bcreateEventDispatcher\b/,
			message:
				"createEventDispatcher is deprecated in Svelte 5. Use callback props (e.g. $props(), onconfirm?: () => void) instead.",
		},
		{
			pattern: /\bon:[a-zA-Z]+\b/,
			message:
				"Classic event directives like 'on:click' or 'on:change' are deprecated in Svelte 5. Use 'onclick', 'onchange', etc. instead.",
		},
	];

	scanDirectoryForForbiddenPatterns(srcDir, forbiddenPatterns);
	console.log(
		"✅ [Unit] Svelte 5 Modern Patterns & Anti-deprecation check passed!",
	);
}

runSvelteDeprecationCheck().catch((err) => {
	console.error("❌ [Unit] Svelte deprecation check failed:", err);
	process.exit(1);
});
