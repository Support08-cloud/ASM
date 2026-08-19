-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "department" TEXT,
    "designation" TEXT,
    "monthlySalary" REAL NOT NULL DEFAULT 0,
    "pinHash" TEXT,
    "pinSetAt" DATETIME,
    "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
    "pinLockedUntil" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "Employee_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Advance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptNo" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "remainingAmount" REAL NOT NULL,
    "issuedAt" DATETIME NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "issuedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Advance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Advance_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalaryPayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptNo" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "grossSalary" REAL NOT NULL,
    "deducted" REAL NOT NULL,
    "netPaid" REAL NOT NULL,
    "paidAt" DATETIME NOT NULL,
    "note" TEXT,
    "paidById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalaryPayout_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalaryPayout_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalaryDeduction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salaryPayoutId" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalaryDeduction_salaryPayoutId_fkey" FOREIGN KEY ("salaryPayoutId") REFERENCES "SalaryPayout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalaryDeduction_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "Advance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OtpToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'PIN_RESET',
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtpToken_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "employeeId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'Vision 360',
    "companyTagline" TEXT NOT NULL DEFAULT 'Innovating Visions, Crafting Excellence',
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "demoOtp" BOOLEAN NOT NULL DEFAULT true,
    "maxAdvancePercent" INTEGER NOT NULL DEFAULT 100,
    "pinMaxAttempts" INTEGER NOT NULL DEFAULT 5,
    "pinLockMinutes" INTEGER NOT NULL DEFAULT 15,
    "otpExpiryMinutes" INTEGER NOT NULL DEFAULT 5,
    "msg91AuthKey" TEXT NOT NULL DEFAULT '',
    "msg91TemplateId" TEXT NOT NULL DEFAULT '',
    "msg91SenderId" TEXT NOT NULL DEFAULT 'V360ASM'
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_phone_key" ON "Employee"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Advance_receiptNo_key" ON "Advance"("receiptNo");

-- CreateIndex
CREATE INDEX "Advance_employeeId_issuedAt_idx" ON "Advance"("employeeId", "issuedAt");

-- CreateIndex
CREATE INDEX "Advance_issuedAt_idx" ON "Advance"("issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryPayout_receiptNo_key" ON "SalaryPayout"("receiptNo");

-- CreateIndex
CREATE INDEX "SalaryPayout_employeeId_paidAt_idx" ON "SalaryPayout"("employeeId", "paidAt");

-- CreateIndex
CREATE INDEX "OtpToken_employeeId_purpose_idx" ON "OtpToken"("employeeId", "purpose");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_employeeId_idx" ON "AuditLog"("employeeId");
