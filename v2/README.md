## Configuração de análises de planilhas

Em **Importar planilha**, selecione a aba, confira as colunas e personalize a análise na grade editável. As sugestões iniciais são feitas pelas colunas, sem chamada à IA. Cálculo e agrupamento são exibidos diretamente; **Período, filtros e contexto** permite definir intervalo de datas e filtros de igualdade, diferença ou conteúdo. Todos os filtros são combinados com E. Os dados originais são preservados.

Use **Salvar modelo** para reutilizar a configuração nas próximas importações do projeto. No relatório genérico, os resultados aparecem primeiro; **Ajustar análise** abre um painel lateral com configuração, prévia dos cálculos e botão **Aplicar alterações**. Alterações pendentes não modificam os resultados até serem aplicadas. **Ver prompt** mostra o texto gerado pela configuração e permite copiá-lo para usar com a planilha anexada em outra IA. O prompt também aparece na etapa de configuração da importação. Não há envio automático à IA.

O modelo é salvo no armazenamento local do navegador por projeto, como os widgets existentes; não é sincronizado entre dispositivos nem incluído no histórico de versões. Esta configuração afeta o painel genérico e a prévia da importação; o resumo separado e os widgets da conversa com IA mantêm suas próprias configurações. As ferramentas anteriores de organização e assistente ficam recolhidas abaixo dos resultados. Cada importação analisa uma aba; cruzamentos entre abas não estão incluídos.

Em **Ver prompt → Editar prompt**, edite as instruções estruturadas e use **Aplicar alterações** (ou **Gerar análise / Salvar modelo** durante a importação). O sistema interpreta as seções de cálculo, período, filtros, colunas e entrega para atualizar a configuração e recalcular os resultados. **Interpretar e conferir configuração** atualiza o rascunho antes da aplicação. Exemplos de cálculo: `Soma de Valor Total por Vendedor`, `Média de Valor Total por Categoria` ou `Contagem de registros por Produto`. Os nomes devem corresponder às colunas da planilha. Datas usam AAAA-MM-DD; filtros seguem o formato `1. Categoria é igual a "Calcados".`. Contexto e objetivo identificam a análise; para mudar os números, edite CÁLCULO.

O interpretador é local e limitado ao modelo estruturado; não é um modelo de IA para instruções livres. Instruções desconhecidas, colunas inexistentes, datas inválidas e troca de aba interrompem a aplicação com uma explicação, sem aplicar mudanças parciais. **Copiar prompt** continua copiando o texto para uso em outra IA. **Restaurar automático** volta ao texto gerado pela configuração atual. Não há envio automático à IA. Teste a integração com `npm run test:prompt`.

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
