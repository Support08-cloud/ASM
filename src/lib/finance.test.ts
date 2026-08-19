import assert from "node:assert/strict";
import test from "node:test";
import { allocateDeductionsFifo, cashToPay, outstandingOf, salaryNet, warnOverSalary } from "./finance";

test("outstanding sums remaining amounts", () => {
  assert.equal(outstandingOf([{ remainingAmount: 500 }, { remainingAmount: 250.5 }]), 750.5);
});

test("FIFO deduction applies to oldest open upad first", () => {
  const allocations = allocateDeductionsFifo(
    [
      { id: "b", issuedAt: "2026-02-01", remainingAmount: 400 },
      { id: "a", issuedAt: "2026-01-01", remainingAmount: 300 },
      { id: "c", issuedAt: "2026-03-01", remainingAmount: 0 },
    ],
    500,
  );
  assert.deepEqual(allocations, [
    { advanceId: "a", amount: 300 },
    { advanceId: "b", amount: 200 },
  ]);
});

test("cannot deduct more than outstanding", () => {
  assert.throws(() => allocateDeductionsFifo([{ id: "a", issuedAt: "2026-01-01", remainingAmount: 100 }], 101));
});

test("salary net cash after upad cut", () => {
  assert.deepEqual(salaryNet(20000, 3500), {
    grossSalary: 20000,
    deducted: 3500,
    netPaid: 16500,
  });
});

test("cannot cut more than salary", () => {
  assert.throws(() => salaryNet(10000, 10000.5));
});

test("cash to employee and remaining upad after salary", () => {
  assert.deepEqual(cashToPay(18000, 5000, 2000), {
    salary: 18000,
    outstanding: 5000,
    deduct: 2000,
    cashToEmployee: 16000,
    upadRemainingAfter: 3000,
  });
});

test("warns when new upad exceeds salary cap", () => {
  const msg = warnOverSalary(8000, 3000, 10000, 100);
  assert.ok(msg);
  assert.equal(warnOverSalary(1000, 500, 10000, 100), null);
});
