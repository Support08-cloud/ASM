import assert from "node:assert/strict";
import test from "node:test";
import { isValidIndianMobile, maskPhone, storePhone } from "./people";

test("stores last 10 digits of Indian mobile", () => {
  assert.equal(storePhone("98765 43210"), "9876543210");
  assert.equal(storePhone("+91 9876543210"), "9876543210");
  assert.equal(isValidIndianMobile("5876543210"), false);
  assert.equal(isValidIndianMobile("9876543210"), true);
  assert.equal(maskPhone("9876543210"), "XXXXXX3210");
});
