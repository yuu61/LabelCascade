import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// 1. Push to all targets first
console.log("==> Pushing to all targets before deploying...");
execSync("node scripts/push.mjs", { stdio: "inherit" });

// 2. Read .clasp.json
const claspConfigPath = path.resolve(".clasp.json");
const claspConfig = JSON.parse(fs.readFileSync(claspConfigPath, "utf-8"));
const rootDir = claspConfig.rootDir || "dist";

let scriptIds = [];
if (Array.isArray(claspConfig.scriptIds) && claspConfig.scriptIds.length > 0) {
	scriptIds = [...new Set(claspConfig.scriptIds.filter(Boolean))];
} else if (claspConfig.scriptId) {
	scriptIds = [claspConfig.scriptId];
}

const description = process.argv.slice(2).join(" ") || "Deployment";

console.log(`\n==> Deploying to ${scriptIds.length} target(s)...`);

const tempConfigPath = path.resolve(".clasp.tmp.json");
let failureCount = 0;

for (let i = 0; i < scriptIds.length; i += 1) {
	const currentId = scriptIds[i];
	console.log(`\n[${i + 1}/${scriptIds.length}] Target: ${currentId}`);

	try {
		const tempConfig = {
			scriptId: currentId,
			rootDir,
		};
		fs.writeFileSync(
			tempConfigPath,
			JSON.stringify(tempConfig, null, 2),
			"utf-8",
		);

		execSync(
			`pnpm exec clasp -P "${tempConfigPath}" deploy --description "${description}"`,
			{
				stdio: "inherit",
			},
		);
		console.log(`✓ Deployment created for ${currentId}`);
	} catch {
		console.warn(
			`⚠ Deployment creation skipped/failed for ${currentId}. Note: Domain restrictions may prevent CLI deployments; you can deploy manually from the script editor if needed.`,
		);
		failureCount += 1;
	} finally {
		if (fs.existsSync(tempConfigPath)) {
			try {
				fs.unlinkSync(tempConfigPath);
			} catch {
				// ignore cleanup error
			}
		}
	}
}

console.log("\n----------------------------------------");
console.log(
	`Deploy process finished (Success: ${scriptIds.length - failureCount}, Skipped/Failed: ${failureCount}).`,
);
