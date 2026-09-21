import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { mutate, query } from "@/lib/db";

type ProjetoEmail = { id: number; nome: string; email: string };
type AlertaEmail = { titulo: string; descricao: string; severidade: string };

export async function POST(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Nao autorizado" }, { status: 401 });
  }
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    return NextResponse.json({ erro: "SMTP nao configurado" }, { status: 503 });
  }
  const agora = new Date();
  const inicio = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
  inicio.setUTCDate(inicio.getUTCDate() - ((inicio.getUTCDay() + 6) % 7));
  const semana = inicio.toISOString().slice(0, 10);
  const projetos = await query<ProjetoEmail>(
    `SELECT p.id, p.nome, u.email FROM projetos p JOIN usuarios u ON u.id = p.usuario_id
     LEFT JOIN resumos_semanais r ON r.projeto_id = p.id AND r.semana = ?
     WHERE r.id IS NULL AND u.email IS NOT NULL AND u.email <> ''`, [semana]
  );
  const transporte = nodemailer.createTransport({
    host: SMTP_HOST, port: Number(SMTP_PORT), secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  let enviados = 0;
  const falhas: number[] = [];
  for (const projeto of projetos) {
    try {
      const alertas = await query<AlertaEmail>(
        `SELECT titulo, descricao, severidade FROM alertas WHERE projeto_id = ? AND status = 'novo' ORDER BY criado_em DESC LIMIT 20`,
        [projeto.id]
      );
      const conteudo = alertas.length
        ? alertas.map((a) => `- [${a.severidade}] ${a.titulo}: ${a.descricao}`).join("\n")
        : "Nenhum alerta pendente nesta semana.";
      await transporte.sendMail({
        from: SMTP_FROM, to: projeto.email,
        subject: `Resumo semanal - ${projeto.nome}`,
        text: `Projeto: ${projeto.nome}\nSemana de ${semana}\n\n${conteudo}\n\nAcesse a central de alertas para conferir os detalhes.`,
      });
      await mutate("INSERT IGNORE INTO resumos_semanais (projeto_id, semana) VALUES (?, ?)", [projeto.id, semana]);
      enviados++;
    } catch {
      falhas.push(projeto.id);
    }
  }
  return NextResponse.json({ semana, enviados, falhas }, { status: falhas.length ? 207 : 200 });
}
