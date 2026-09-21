import { randomBytes, createHash } from "crypto";

// Mesmo algoritmo usado hoje no workflow n8n "API - Login" (SHA-256 iterado
// 10000x), reimplementado com o módulo nativo `crypto` em vez do SHA-256
// escrito à mão que o n8n precisou (o Code node de lá não tinha acesso ao
// `crypto` do Node). Compatível com os hashes já gravados no MySQL —
// nenhum usuário existente precisa trocar de senha na migração.
function sha256Hex(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

function hashSenha(senha: string, salt: string): string {
  let hex = sha256Hex(Buffer.from(`${salt}:${senha}`, "utf8"));
  for (let i = 0; i < 10000; i++) {
    hex = sha256Hex(Buffer.from(hex, "hex"));
  }
  return hex;
}

export function criarHashSenha(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${hashSenha(senha, salt)}`;
}

export function verificarSenha(senha: string, senhaHash: string): boolean {
  const [salt, hash] = senhaHash.split(":");
  if (!salt || !hash) return false;
  return hashSenha(senha, salt) === hash;
}
