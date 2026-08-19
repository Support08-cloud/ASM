import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, name: "Vision 360 ASM" });
}
