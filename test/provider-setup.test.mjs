import { test } from "node:test";
import assert from "node:assert/strict";
import {
	THINKING_LEVELS,
	buildThinkingLevelMap,
	mergeDiscoveredModels,
	providerSetupActions,
	parseModelIds,
	supportedThinkingLevels,
} from "../app/tui/provider-setup.mjs";

test("providerSetupActions always exposes add custom provider first", () => {
	assert.deepEqual(providerSetupActions({
		addLabel: "Add custom provider",
		signInLabel: "Sign in",
		editLabel: "Edit",
		manageModelsLabel: "Models",
		removeLabel: "Remove",
	}), [{ id: "add-custom-provider", label: "Add custom provider" }]);
	assert.deepEqual(providerSetupActions({
		provider: { id: "demo", custom: true },
		addLabel: "Add",
		signInLabel: "Sign in",
		editLabel: "Edit",
		manageModelsLabel: "Models",
		removeLabel: "Remove",
	}).map((action) => action.id), ["add-custom-provider", "edit-custom-provider", "manage-custom-models", "remove-custom-provider"]);
});

test("providerSetupActions offers sign-in for built-in providers", () => {
	assert.deepEqual(providerSetupActions({ provider: { id: "openai" }, addLabel: "Add", signInLabel: "Sign in", editLabel: "Edit", manageModelsLabel: "Models", removeLabel: "Remove" }).map((action) => action.id), ["add-custom-provider", "sign-in-provider"]);
});

test("parseModelIds splits on whitespace and commas and de-duplicates", () => {
	assert.deepEqual(parseModelIds("a b,c\n d ,a"), ["a", "b", "c", "d"]);
	assert.deepEqual(parseModelIds(""), []);
	assert.deepEqual(parseModelIds(undefined), []);
});

test("mergeDiscoveredModels keeps discovery order and manual ids win", () => {
	const merged = mergeDiscoveredModels(["a", "b"], [{ id: "b", name: "Bee" }, { id: "c", name: "Cee" }]);
	assert.deepEqual(merged, [
		{ id: "a", name: "a" },
		{ id: "b", name: "b" },
		{ id: "c", name: "Cee" },
	]);
});

test("mergeDiscoveredModels ignores a nameless discovered entry without an id", () => {
	assert.deepEqual(mergeDiscoveredModels([], [{ name: "no id" }]), []);
});

test("supportedThinkingLevels treats a missing map as fully supported", () => {
	assert.deepEqual(supportedThinkingLevels(undefined), [...THINKING_LEVELS]);
	assert.deepEqual(supportedThinkingLevels({ off: null, max: "xhigh" }), THINKING_LEVELS.filter((level) => level !== "off"));
});

test("buildThinkingLevelMap disables unchecked levels and preserves custom mappings", () => {
	const map = buildThinkingLevelMap(new Set(["off", "high"]), { high: "xhigh" });
	assert.deepEqual(map.off, "off");
	assert.deepEqual(map.high, "xhigh");
	assert.equal(map.medium, null);
	assert.equal(map.max, null);
	assert.deepEqual(Object.keys(map), [...THINKING_LEVELS]);
});

test("buildThinkingLevelMap round-trips through supportedThinkingLevels", () => {
	const map = buildThinkingLevelMap(new Set(["low", "max"]), undefined);
	assert.deepEqual(supportedThinkingLevels(map), ["low", "max"]);
});
