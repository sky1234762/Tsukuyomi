import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSgrMouse } from "../app/pointer-state.mjs";

const report = (button, x = 5, y = 3, release = false) => `\x1b[<${button};${x};${y}${release ? "m" : "M"}`;

test("parseSgrMouse decodes the vertical wheel", () => {
	const up = parseSgrMouse(report(64));
	assert.equal(up.wheel, true);
	assert.equal(up.wheelDirection, -1);
	assert.equal(up.wheelHorizontal, false);
	const down = parseSgrMouse(report(65));
	assert.equal(down.wheelDirection, 1);
	// A wheel report must never look like a middle-button press: that path reads
	// the PRIMARY selection and would paste it into the composer.
	assert.equal(up.middle, false);
	assert.equal(down.middle, false);
});

test("parseSgrMouse decodes the horizontal wheel", () => {
	const left = parseSgrMouse(report(66));
	assert.equal(left.wheel, true);
	assert.equal(left.wheelHorizontal, true);
	assert.equal(left.wheelHorizontalDirection, -1);
	// The vertical direction stays neutral so page-scroll handlers ignore it.
	assert.equal(left.wheelDirection, 0);
	assert.equal(left.left, false);

	const right = parseSgrMouse(report(67));
	assert.equal(right.wheelHorizontalDirection, 1);
	assert.equal(right.wheelDirection, 0);
});

test("parseSgrMouse exposes wheel modifier bits", () => {
	assert.equal(parseSgrMouse(report(64)).shift, false);
	const shifted = parseSgrMouse(report(64 + 4));
	assert.equal(shifted.shift, true);
	assert.equal(shifted.wheelDirection, -1, "the shift bit does not change the direction");
	assert.equal(parseSgrMouse(report(64 + 16)).ctrl, true);
	assert.equal(parseSgrMouse(report(64 + 8)).alt, true);
});

test("parseSgrMouse keeps plain button and motion decoding", () => {
	const press = parseSgrMouse(report(0, 9, 2));
	assert.equal(press.left, true);
	assert.equal(press.wheel, false);
	assert.deepEqual([press.x, press.y], [8, 1], "coordinates are zero-based");
	assert.equal(parseSgrMouse(report(2)).right, true);
	assert.equal(parseSgrMouse(report(32, 9, 2)).motion, true);
	assert.equal(parseSgrMouse(report(0, 9, 2, true)).release, true);
	assert.equal(parseSgrMouse("not a mouse report"), undefined);
});
