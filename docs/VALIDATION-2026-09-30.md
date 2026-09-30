# Correções e validação — 30 setembro 2026

O portal e o GitHub permanecem privados. Este registo distingue verificações
executadas, resultados históricos e passos ainda pendentes; não é uma certificação.

## 1. CI e distribuição privada

O commit `86a5331` foi enviado para a branch privada. A execução GitHub
`36742909456` falhou no gate de segurança: advisories posteriores à validação de
24 setembro afetavam ferramentas de desenvolvimento. Produção: zero advisories.
A falha não foi suprimida nem transformada numa aprovação.

Correção: plugin Cloudflare `1.62.3` e Wrangler `4.145.0` usam Miniflare
`5.20260930.0-alpha` / Undici `7.29.1`; refresh compatível de brace-expansion
`1.1.21` / `5.0.12` e fast-uri `3.1.8`. tsup está fixado em `8.5.0` com esbuild
`0.25.12`, retirando a exceção Windows. esbuild `0.28.2` é uma dependência direta
do tooling que o importa, sem overrides incompatíveis.

Fontes: [Undici 7.29.1](https://github.com/nodejs/undici/releases/tag/v7.29.1),
[tsup 8.5.0](https://github.com/egoist/tsup/blob/v8.5.0/package.json).

`npm run security:check` passou em 30 setembro: zero vulnerabilidades de produção;
quatro entradas moderadas da mesma cadeia de desenvolvimento Drizzle e uma
exceção específica, revista e válida até 14 outubro. Esta exceção ainda não é uma
correção da vulnerabilidade. O gate continua a rejeitar vulnerabilidades novas,
altas/críticas, exceções expiradas e alterações no hash do caller revisto.

Nova CI completa, distribuição e restantes passos: pendentes neste registo.
