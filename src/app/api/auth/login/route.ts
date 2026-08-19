import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, jsonError, requireUser, setSessionCookie, verifyPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = String(body?.username || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!username || !password) return jsonError("Enter username and password");

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) return jsonError("Invalid username or password", 401);
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return jsonError("Invalid username or password", 401);

  const session = { id: user.id, name: user.name, username: user.username, role: user.role };
  const response = NextResponse.json({ user: session });
  await setSessionCookie(response, session);
  await writeAudit({ actorId: user.id, action: "LOGIN" });
  return response;
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  return NextResponse.json({ user });
}
