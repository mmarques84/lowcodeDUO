import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = dirname(fileURLToPath(import.meta.url));
const raizProjeto = join(raiz, "..", "..");

const host = process.env.DB_HOST;
const port = Number(process.env.DB_PORT ?? 3306);
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME;

if (!host || !user || !database) {
  console.error("Defina DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME no ambiente antes de rodar.");
  process.exit(1);
}

// v1/schema.sql já é o snapshot consolidado (inclui tudo que estava em v2/migrations/*.sql) —
// rodar as migrations depois dele falha em colunas que já existem.
const arquivos = [join(raizProjeto, "v1", "schema.sql")];

const conexao = await mysql.createConnection({
  host,
  port,
  user,
  password,
  database,
  multipleStatements: true,
});

try {
  for (const caminho of arquivos) {
    console.log(`Aplicando ${caminho}...`);
    const sql = readFileSync(caminho, "utf8");
    await conexao.query(sql);
  }
  console.log("Schema e migrations aplicados com sucesso.");
} finally {
  await conexao.end();
}
