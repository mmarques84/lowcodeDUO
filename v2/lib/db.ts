import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: "utf8mb4",
      dateStrings: true, // DATE/DATETIME viram string ("2026-09-05"), não objeto Date — mais previsível
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}

/** Para INSERT/UPDATE/DELETE — devolve o ResultSetHeader (insertId, affectedRows etc). */
export async function mutate(
  sql: string,
  params: unknown[] = []
): Promise<mysql.ResultSetHeader> {
  const [resultado] = await getPool().query<mysql.ResultSetHeader>(sql, params);
  return resultado;
}
