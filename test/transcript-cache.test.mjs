import test from "node:test";
import assert from "node:assert/strict";
import { createHistoryCache, syncHistoryCache } from "../app/transcript-cache.mjs";

function makeContext(messages, overrides = {}) {
	let renders = 0;
	const ctx = {
		messages,
		layoutKey: "80|24||en",
		omitUserIndex: -1,
		thinkingAutoCollapse: true,
		thinkingExpanded: new Set(),
		liveTools: new Map(),
		lastWorkMs: undefined,
		lastThoughtMs: undefined,
		now: 1000,
		dirtyToolIds: new Set(),
		dirtyCodeIndices: new Set(),
		renderMessage: (index, message) => {
			renders += 1;
			return {
				lines: [`row-${index}-${message.role}`],
				block: { kind: message.role, messageIndex: index, start: 0, end: 0 },
				localToolRanges: [],
			};
		},
		...overrides,
	};
	return { ctx, count: () => renders };
}

test("syncHistoryCache lays out a message appended in place to the same array", () => {
	const messages = [{ role: "user", id: "u1" }, { role: "assistant", id: "a1" }];
	const cache = createHistoryCache();
	const { ctx, count } = makeContext(messages);
	syncHistoryCache(cache, ctx);
	assert.equal(cache.total, 2);
	assert.equal(count(), 2);

	// The live path mutates the existing array instead of replacing it.
	messages.push({ role: "assistant", id: "a2" });
	syncHistoryCache(cache, ctx);
	assert.equal(cache.total, 3, "the appended message must be laid out");
	// The previous assistant turn gains a "worked for" footer when it stops being
	// the latest, so it re-renders alongside the newly appended message.
	assert.equal(cache.rendered, 2);
	assert.equal(cache.reused, 1);
});

test("syncHistoryCache reuses everything when nothing changed", () => {
	const messages = [{ role: "user", id: "u1" }, { role: "assistant", id: "a1" }];
	const cache = createHistoryCache();
	const { ctx, count } = makeContext(messages);
	syncHistoryCache(cache, ctx);
	const first = count();
	syncHistoryCache(cache, ctx);
	assert.equal(count(), first, "no second render pass");
	assert.equal(cache.reused, 2);
});

test("syncHistoryCache re-renders only the message owning a dirty tool", () => {
	const messages = [
		{ role: "user", id: "u1" },
		{ role: "assistant", id: "a1", content: [{ type: "toolCall", id: "t1", name: "read" }] },
	];
	const cache = createHistoryCache();
	const { ctx, count } = makeContext(messages);
	syncHistoryCache(cache, ctx);
	const baseline = count();
	ctx.dirtyToolIds.add("t1");
	ctx.liveTools.set("t1", { status: "running", startedAt: 0, revision: 1 });
	syncHistoryCache(cache, ctx);
	assert.equal(count() - baseline, 1, "only the tool owner re-renders");
});

test("assembleHistory offsets a message's code blocks to document rows", () => {
	const messages = [{ role: "user", id: "u1" }, { role: "assistant", id: "a1" }];
	const cache = createHistoryCache();
	const { ctx } = makeContext(messages, {
		renderMessage: (index, message) => ({
			lines: [`row-${index}-${message.role}`],
			block: { kind: message.role, messageIndex: index, start: 0, end: 0 },
			localToolRanges: [],
			// The block starts two rows into the message's own rows.
			localCodeBlocks: index === 1 ? [{ id: "m1:text:0", start: 0, end: 1, innerWidth: 36, maxScroll: 12 }] : [],
		}),
	});
	syncHistoryCache(cache, ctx);
	assert.deepEqual(cache.codeBlocks, [{ id: "m1:text:0", start: 1, end: 2, innerWidth: 36, maxScroll: 12 }]);
});

test("a changed code scroll offset re-renders only its owning message", () => {
	const messages = [
		{ role: "user", id: "u1" },
		{ role: "assistant", id: "a1" },
		{ role: "user", id: "u2" },
		{ role: "assistant", id: "a2" },
	];
	const cache = createHistoryCache();
	let scrollKey = "";
	const { ctx, count } = makeContext(messages, { codeScrollKey: (index) => (index === 1 ? scrollKey : "") });
	syncHistoryCache(cache, ctx);
	const baseline = count();
	// The fast path reuses everything while the offset is unchanged.
	syncHistoryCache(cache, ctx);
	assert.equal(count(), baseline, "no render when the offset is unchanged");

	scrollKey = "m1:text:0=8;";
	ctx.dirtyCodeIndices.add(1);
	syncHistoryCache(cache, ctx);
	assert.equal(count() - baseline, 1, "only the scrolled message re-renders");
	assert.equal(cache.codeBlocks.length, 0);
});
