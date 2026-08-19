import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, isResponse, jsonError, requireAdmin, requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  if (isResponse(user)) return user;
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isResponse(admin)) return admin;
  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const username = String(body?.username || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const phone = String(body?.phone || "").trim() || null;
  const role = body?.role === "ADMIN" ? "ADMIN" : "STAFF";
  if (!name || !username) return jsonError("Name and username are required");

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return jsonError("This username is already used");

  try {
    const created = await prisma.user.create({
      data: {
        name,
        username,
        passwordHash: await hashPassword(password),
        phone,
        role,
      },
      select: { id: true, name: true, username: true, role: true, phone: true, isActive: true },
    });
    await writeAudit({
      actorId: admin.id,
      action: "USER_CREATED",
      details: { username: created.username, role: created.role },
    });
    return NextResponse.json({ user: created });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create user");
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isResponse(admin)) return admin;
  const body = await request.json().catch(() => null);
  const id = String(body?.id || "");
  if (!id) return jsonError("User id is required");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return jsonError("User not found", 404);

  const data: {
    name?: string;
    phone?: string | null;
    role?: "ADMIN" | "STAFF";
    isActive?: boolean;
    passwordHash?: string;
  } = {};
  if (typeof body?.name === "string") data.name = body.name.trim();
  if (body?.phone !== undefined) data.phone = String(body.phone || "").trim() || null;
  if (body?.role === "ADMIN" || body?.role === "STAFF") data.role = body.role;
  if (typeof body?.isActive === "boolean") {
    if (id === admin.id && body.isActive === false) {
      return jsonError("You cannot deactivate your own login");
    }
    data.isActive = body.isActive;
  }
  if (body?.password) {
    try {
      data.passwordHash = await hashPassword(String(body.password));
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid password");
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, username: true, role: true, phone: true, isActive: true },
  });
  await writeAudit({ actorId: admin.id, action: "USER_UPDATED", details: { id, ...data, passwordHash: undefined } });
  return NextResponse.json({ user });
}

export async function DELETE(request: NextRequest) {
  await requireUser(request);
  return jsonError("Deactivate the user instead of deleting", 405);
}
