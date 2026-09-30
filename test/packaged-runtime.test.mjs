import test from "node:test";
import assert from "node:assert/strict";
import { PACKAGED_ENTRY, PACKAGED_NODE, resolvePackagedExec } from "../app/packaged-runtime.mjs";

test("source checkout with a bundled PI kernel stays on the source app", () => {
	const root = "/workspace/Tsukuyomi";
	const localPi = `${root}/node_modules/@earendil-works/pi-coding-agent/dist/index.js`;
	const packaged = new Set([localPi, PACKAGED_NODE, PACKAGED_ENTRY]);
	assert.equal(resolvePackagedExec({ currentRoot: root, exists: (path) => packaged.has(path) }), undefined);
});

test("source checkout without a PI kernel can use the packaged app", () => {
	const result = resolvePackagedExec({
		currentRoot: "/workspace/Tsukuyomi",
		exists: (path) => path === PACKAGED_NODE || path === PACKAGED_ENTRY,
	});
	assert.equal(result?.entry, PACKAGED_ENTRY);
});
