import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// 1. Build project
console.log("==> Building project...");
execSync("node scripts/build.mjs", { stdio: "inherit" });

// 2. Read .clasp.json
const claspConfigPath = path.resolve(".clasp.json");
if (!fs.existsSync(claspConfigPath)) {
	console.error("Error: .clasp.json not found!");
	process.exit(1);
}

let claspConfig;
try {
	claspConfig = JSON.parse(fs.readFileSync(claspConfigPath, "utf-8"));
} catch (err) {
	console.error(`Error reading .clasp.json: ${err}`);
	process.exit(1);
}

const rootDir = claspConfig.rootDir || "dist";
let scriptIds = [];

if (Array.isArray(claspConfig.scriptIds) && claspConfig.scriptIds.length > 0) {
	scriptIds = [...new Set(claspConfig.scriptIds.filter(Boolean))];
} else if (claspConfig.scriptId) {
	scriptIds = [claspConfig.scriptId];
}

if (scriptIds.length === 0) {
	console.error("Error: No scriptId or scriptIds found in .clasp.json!");
	process.exit(1);
}

console.log(`\n==> Pushing to ${scriptIds.length} target(s)...`);

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

		execSync(`pnpm exec clasp -P "${tempConfigPath}" push --force`, {
			stdio: "inherit",
		});
		console.log(`✓ Push successful for ${currentId}`);
	} catch (err) {
		console.error(`✗ Push failed for ${currentId}: ${err.message}`);
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
if (failureCount === 0) {
	console.log(`✓ All ${scriptIds.length} projects updated successfully!`);
} else {
	console.error(`✗ Completed with ${failureCount} error(s).`);
	process.exit(1);
}
