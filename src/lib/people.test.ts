import assert from "node:assert/strict";
import test from "node:test";
import { isValidIndianMobile, maskPhone, storePhone } from "./people";
import { whatsappOtpLink } from "./sms";

test("stores last 10 digits of Indian mobile", () => {
  assert.equal(storePhone("98765 43210"), "9876543210");
  assert.equal(storePhone("+91 9876543210"), "9876543210");
  assert.equal(isValidIndianMobile("5876543210"), false);
  assert.equal(isValidIndianMobile("9876543210"), true);
  assert.equal(maskPhone("9876543210"), "XXXXXX3210");
});

test("WhatsApp OTP link uses Indian country code", () => {
  const url = whatsappOtpLink("9876543210", "123456", 5);
  assert.equal(url.startsWith("https://wa.me/919876543210?text="), true);
  assert.equal(decodeURIComponent(url).includes("123456"), true);
});
