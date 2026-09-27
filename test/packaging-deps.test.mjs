import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

// Mirrors the scan packaging/bundle/build-local.sh runs when it decides what to
// copy into /usr/lib/tsukuyomi/node_modules: a package the launcher cannot
// resolve there aborts startup with ERR_MODULE_NOT_FOUND.
const IMPORT = /(?:\bimport\s*\(\s*|\brequire\s*\(\s*|\b(?:import|export)\s+(?:[\w$*{},\s]*?\s+from\s*)?)["']([^"']+)["']/g;

function* sources(directory) {
	for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) yield* sources(path);
		else if (entry.isFile() && /\.(?:[cm]?js|ts)$/.test(entry.name)) yield path;
	}
}

const PACKAGE_NAME = /^(?:@[A-Za-z0-9][\w.-]*\/)?[A-Za-z0-9][\w.-]*$/;

function packageName(specifier) {
	if (specifier.startsWith("node:") || specifier.startsWith(".") || specifier.startsWith("/")) return undefined;
	const parts = specifier.split("/");
	const name = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
	// Rejects captures that came from a string literal rather than an import.
	return PACKAGE_NAME.test(name) ? name : undefined;
}

test("every package the shipped app and launcher import is declared", () => {
	// src/ is excluded on purpose: the Pi kernel compiles it and resolves it
	// against the bundled Pi tree, which packaging verifies at build time.
	const declared = new Set([
		...Object.keys(manifest.dependencies ?? {}),
		...Object.keys(manifest.optionalDependencies ?? {}),
	]);
	const undeclared = new Set();
	for (const directory of ["app", "bin"]) {
		for (const path of sources(directory)) {
			const text = readFileSync(join(root, path), "utf8");
			for (const match of text.matchAll(IMPORT)) {
				const name = packageName(match[1]);
				if (name && !declared.has(name)) undeclared.add(`${name} (${path})`);
			}
		}
	}
	assert.deepEqual([...undeclared].sort(), []);
});
