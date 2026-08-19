import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { UserRole } from "@prisma/client";

const COOKIE = "asm_session";

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
};

function secretKey() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "vision360-asm-dev-secret-change-in-production");
}

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    name: user.name,
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("14h")
    .sign(secretKey());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || !payload.role) return null;
    return {
      id: payload.sub,
      name: String(payload.name || ""),
      username: String(payload.username || ""),
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function setSessionCookie(response: NextResponse, user: SessionUser) {
  const token = await createSessionToken(user);
  response.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 14,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function sessionFromRequest(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const session = await readSessionToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser(request: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await sessionFromRequest(request);
  if (!user) return jsonError("Please sign in again", 401);
  return user;
}

export async function requireAdmin(request: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;
  if (user.role !== "ADMIN") return jsonError("Only admin can do this", 403);
  return user;
}

export function isResponse(value: SessionUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
