import { type NextRequest, NextResponse } from "next/server";

import { introspectSkill } from "@/lib/introspect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  try {
    const introspection = await introspectSkill(name);
    return NextResponse.json(introspection);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "introspection failed" },
      { status: 400 },
    );
  }
}
