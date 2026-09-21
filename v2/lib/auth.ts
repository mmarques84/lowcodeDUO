import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-troque-em-producao"
);

export const SESSION_COOKIE = "lowcodeduo_session";

export type Papel = "admin" | "cliente";

export type SessionPayload = {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
};

export async function criarToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verificarToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.id === "number" &&
      typeof payload.nome === "string" &&
      typeof payload.email === "string" &&
      (payload.papel === "admin" || payload.papel === "cliente")
    ) {
      return payload as unknown as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}
