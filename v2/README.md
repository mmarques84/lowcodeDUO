## lowcodeDUO: alertas e resumo semanal

Execute `migrations/003_alertas.sql` no banco MySQL. A importacao mostra problemas da planilha antes da confirmacao; depois, eles aparecem em **Alertas** no menu do projeto. Regras por coluna sao avaliadas nas proximas importacoes.

Configure no servidor `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` e `CRON_SECRET`. Agende um POST semanal para `/api/cron/resumo-semanal`, com o cabecalho `Authorization: Bearer <CRON_SECRET>`. Exemplo de crontab para segunda-feira as 09:00:

```cron
0 9 * * 1 curl -fsS -X POST -H "Authorization: Bearer SUA_CHAVE" https://SEU_DOMINIO/api/cron/resumo-semanal
```

O resumo vai para o e-mail cadastrado do dono de cada projeto, no maximo uma vez por semana. Sem SMTP configurado, nenhum e-mail e enviado. Nunca inclua as credenciais no repositorio.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
