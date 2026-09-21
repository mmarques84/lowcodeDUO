import { NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/session";

export async function GET() {
  const sessao = await sessaoAtual();
  return NextResponse.json({ ok: !!sessao, usuario: sessao });
}
