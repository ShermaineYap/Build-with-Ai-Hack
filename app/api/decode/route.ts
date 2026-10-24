import { NextResponse } from "next/server";
import { decode } from "@/lib/decode";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON like { \"text\": \"...\" }." }, { status: 400 });
  }
  const text = typeof (body as { text?: unknown })?.text === "string" ? (body as { text: string }).text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Paste your offer letter first." }, { status: 400 });
  }
  const result = await decode(text);
  return NextResponse.json(result);
}
