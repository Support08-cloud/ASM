import assert from "node:assert/strict";
import test from "node:test";
import { assertPin, hashPin, isValidPin, pinLockRemaining, verifyPin } from "./pin";

test("PIN must be exactly 4 numeric digits", () => {
  assert.equal(isValidPin("1234"), true);
  assert.equal(isValidPin("0000"), true);
  assert.equal(isValidPin("12 34"), false);
  assert.equal(isValidPin("123"), false);
  assert.equal(isValidPin("12345"), false);
  assert.equal(isValidPin("12a4"), false);
  assert.throws(() => assertPin("abcd"));
});

test("PIN hash verifies only the original PIN", async () => {
  const hash = await hashPin("4826");
  assert.equal(await verifyPin("4826", hash), true);
  assert.equal(await verifyPin("4827", hash), false);
  assert.equal(await verifyPin("4826", null), false);
});

test("lock remaining is zero after expiry", () => {
  const past = new Date(Date.now() - 1000);
  const future = new Date(Date.now() + 60_000);
  assert.equal(pinLockRemaining(past), 0);
  assert.ok(pinLockRemaining(future) > 0);
});
