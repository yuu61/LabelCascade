import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// 1. Compile TypeScript to dist/
console.log("Compiling TypeScript...");
execSync("pnpm exec tsc --outDir dist", { stdio: "inherit" });

// 2. Ensure dist directory exists
if (!fs.existsSync("dist")) {
	fs.mkdirSync("dist", { recursive: true });
}

// 3. Copy appsscript.json to dist/
const srcManifest = path.join("src", "appsscript.json");
const distManifest = path.join("dist", "appsscript.json");

if (fs.existsSync(srcManifest)) {
	fs.copyFileSync(srcManifest, distManifest);
	console.log(`Copied ${srcManifest} -> ${distManifest}`);
} else {
	console.error(`Error: ${srcManifest} not found!`);
	process.exit(1);
}

console.log("Build completed successfully.");
