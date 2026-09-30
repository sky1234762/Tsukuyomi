/**
 * Pure helpers behind the custom-provider setup wizard.
 *
 * The wizard itself lives in `app/tui.mjs`; the pieces that only transform
 * data live here so they can be unit tested without a terminal.
 */

/** Reasoning levels a model may advertise, ascending. */
export const THINKING_LEVELS = Object.freeze(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);

/**
 * Build the actions shown in the wide provider setup inspector.
 * Action ids are stable across locales; labels are presentation-only.
 */
export function providerSetupActions({ provider, addLabel, signInLabel, editLabel, manageModelsLabel, removeLabel }) {
	const actions = [{ id: "add-custom-provider", label: addLabel }];
	if (provider?.custom) {
		actions.push(
			{ id: "edit-custom-provider", label: editLabel },
			{ id: "manage-custom-models", label: manageModelsLabel },
			{ id: "remove-custom-provider", label: removeLabel },
		);
	} else if (provider) {
		actions.push({ id: "sign-in-provider", label: signInLabel });
	}
	return actions;
}

/**
 * Split a user-typed model list into unique ids.
 * Accepts spaces, commas, and newlines so pasted lists just work.
 */
export function parseModelIds(text) {
	return [...new Set(String(text ?? "").split(/[\s,]+/).map((value) => value.trim()).filter(Boolean))];
}

/**
 * Combine hand-typed ids with discovered models, keeping discovery order and
 * letting an explicit id win over a discovered duplicate.
 */
export function mergeDiscoveredModels(manualIds, discovered) {
	const byId = new Map();
	for (const id of manualIds ?? []) byId.set(id, { id, name: id });
	for (const model of discovered ?? []) {
		if (!model?.id || byId.has(model.id)) continue;
		byId.set(model.id, { id: model.id, name: model.name || model.id });
	}
	return [...byId.values()];
}

/**
 * The levels a model supports. A missing map means every level is available;
 * a `null` entry explicitly disables one.
 */
export function supportedThinkingLevels(map, levels = THINKING_LEVELS) {
	if (!map || typeof map !== "object") return [...levels];
	return levels.filter((level) => map[level] !== null);
}

/**
 * Build a `thinkingLevelMap` from a selection, preserving any existing custom
 * mapped value (for example a provider-specific effort string).
 */
export function buildThinkingLevelMap(supported, existing, levels = THINKING_LEVELS) {
	const set = supported instanceof Set ? supported : new Set(supported ?? []);
	const map = {};
	for (const level of levels) map[level] = set.has(level) ? (existing?.[level] ?? level) : null;
	return map;
}
