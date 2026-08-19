import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  return NextResponse.json({ user });
}
