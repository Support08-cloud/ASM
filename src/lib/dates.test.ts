import assert from "node:assert/strict";
import test from "node:test";
import { bucketKey, isoDate, rangeForPreset, startOfWeek } from "./dates";

test("custom range rejects inverted dates", () => {
  assert.throws(() => rangeForPreset("custom", "2026-08-10", "2026-08-01"));
});

test("this month range starts on the 1st", () => {
  const now = new Date(2026, 7, 19, 15, 0, 0);
  const range = rangeForPreset("this_month", undefined, undefined, now);
  assert.equal(isoDate(range.from), "2026-08-01");
  assert.equal(isoDate(range.to), "2026-08-19");
});

test("week buckets start on Monday", () => {
  const wed = new Date(2026, 7, 19); // Wednesday
  assert.equal(isoDate(startOfWeek(wed)), "2026-08-17");
  assert.equal(bucketKey(wed, "week"), "2026-08-17");
  assert.equal(bucketKey(wed, "month"), "2026-08");
});
