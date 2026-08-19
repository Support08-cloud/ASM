import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";
import { hashPin } from "../src/lib/pin";
import { enableSqliteWal } from "../src/lib/prisma";

async function main() {
  await enableSqliteWal();

  await prisma.setting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "Vision 360",
      companyTagline: "Innovating Visions, Crafting Excellence",
      demoOtp: process.env.DEMO_OTP !== "false",
    },
  });

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "Sir / Admin",
      username: "admin",
      passwordHash: await hashPassword("Vision360@admin"),
      role: "ADMIN",
      phone: "9999999999",
    },
  });

  const reception = await prisma.user.upsert({
    where: { username: "reception" },
    update: {},
    create: {
      name: "Reception Desk",
      username: "reception",
      passwordHash: await hashPassword("Reception@123"),
      role: "STAFF",
      phone: "9888888888",
    },
  });

  const samples = [
    {
      code: "EMP-0001",
      name: "Ravi Patel",
      phone: "9876543210",
      department: "Studio",
      designation: "Editor",
      monthlySalary: 22000,
      pin: "4826",
    },
    {
      code: "EMP-0002",
      name: "Meera Shah",
      phone: "9123456780",
      department: "Tech",
      designation: "Coordinator",
      monthlySalary: 18000,
      pin: "1904",
    },
    {
      code: "EMP-0003",
      name: "Amit Desai",
      phone: "9988776655",
      department: "Light",
      designation: "Technician",
      monthlySalary: 16000,
      pin: "7741",
    },
  ];

  const employees = [];
  for (const sample of samples) {
    const employee = await prisma.employee.upsert({
      where: { phone: sample.phone },
      update: {
        pinHash: await hashPin(sample.pin),
        pinFailedAttempts: 0,
        pinLockedUntil: null,
        pinSetAt: new Date(),
      },
      create: {
        code: sample.code,
        name: sample.name,
        phone: sample.phone,
        department: sample.department,
        designation: sample.designation,
        monthlySalary: sample.monthlySalary,
        pinHash: await hashPin(sample.pin),
        pinSetAt: new Date(),
        createdById: admin.id,
      },
    });
    employees.push(employee);
  }

  const existingAdvances = await prisma.advance.count();
  if (existingAdvances === 0) {
    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 11, 30);

    const ravi = employees[0];
    const meera = employees[1];
    const amit = employees[2];

    const a1 = await prisma.advance.create({
      data: {
        receiptNo: "UPD-DEMO-0001",
        employeeId: ravi.id,
        amount: 3000,
        remainingAmount: 1500,
        issuedAt: daysAgo(18),
        note: "Family expense",
        status: "PARTIAL",
        issuedById: reception.id,
      },
    });
    await prisma.advance.create({
      data: {
        receiptNo: "UPD-DEMO-0002",
        employeeId: ravi.id,
        amount: 2000,
        remainingAmount: 2000,
        issuedAt: daysAgo(4),
        note: "Travel",
        status: "OPEN",
        issuedById: admin.id,
      },
    });
    await prisma.advance.create({
      data: {
        receiptNo: "UPD-DEMO-0003",
        employeeId: meera.id,
        amount: 1500,
        remainingAmount: 0,
        issuedAt: daysAgo(25),
        note: "Settled last salary",
        status: "SETTLED",
        issuedById: reception.id,
      },
    });
    await prisma.advance.create({
      data: {
        receiptNo: "UPD-DEMO-0004",
        employeeId: amit.id,
        amount: 800,
        remainingAmount: 800,
        issuedAt: daysAgo(1),
        issuedById: reception.id,
      },
    });

    const payout = await prisma.salaryPayout.create({
      data: {
        receiptNo: "SAL-DEMO-0001",
        employeeId: ravi.id,
        periodLabel: "July 2026",
        grossSalary: 22000,
        deducted: 1500,
        netPaid: 20500,
        paidAt: daysAgo(12),
        paidById: admin.id,
        note: "Partial cut from older upad",
      },
    });
    await prisma.salaryDeduction.create({
      data: {
        salaryPayoutId: payout.id,
        advanceId: a1.id,
        amount: 1500,
      },
    });
  }

  console.log("Seeded Vision 360 ASM");
  console.log("Admin     : admin / Vision360@admin");
  console.log("Reception : reception / Reception@123");
  console.log("Demo PINs : Ravi 4826 · Meera 1904 · Amit 7741");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
