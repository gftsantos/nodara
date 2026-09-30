# Segurança e conformidade — vistoria de 24/09/2026

## Conclusão e âmbito

Beta privada; **não** é um produto certificado, impenetrável ou juridicamente
aprovado. Revisão do código, dependências, artefactos e execução local; não houve
pentest à infraestrutura do fornecedor nem simulação de DoS em produção.
O `get_site` confirmou owner-only, um proprietário, zero grupos/convidados e
versão publicada 15 no início da revisão. Não foi autorizada abertura ao público.
Pedidos HTTP sem credenciais à página `/` e a `/downloads/manifest.json`
devolveram 401. A resposta anónima colocou o cookie `__cf_bm`, com Secure,
HttpOnly e SameSite=None; isso não inventaria nem valida os cookies/sessões de
um login completo. Valores de cookies não foram registados.

## Matriz técnica

| Tema | Evidência / ação | Limite ou decisão pendente |
| --- | --- | --- |
| XSS e dados | Renderers usam textContent/React; testes com img/onerror/script nas seis famílias e após update. CSP com nonce aleatório por resposta e strict-dynamic, sem eval em produção | CSP é defesa adicional, não sanitização; plugins/callbacks são código de confiança do integrador |
| CSRF | Não há API de escrita, server actions nem formulários submetidos ao servidor. Worker rejeita métodos diferentes de GET/HEAD | A autenticação da plataforma é outra camada; rever antes de criar mutações |
| Uploads | Não existe upload nem armazenamento de ficheiros; JSON é texto local | Qualquer upload futuro exige allowlist, quotas, validação do conteúdo e armazenamento isolado |
| Path traversal / ficheiros internos | Caminhos codificados, dotfiles, logs, sources, outputs e maps negados; artefactos web inspecionados | URLs podem ser normalizadas pelo servidor antes da aplicação; não há leitura de caminhos arbitrários |
| SSRF | Endpoint de imagem não usado removido do Worker e negado antes do router; não há fetch de URLs fornecidos pelo utilizador | O vinext start local trata o endpoint antes do middleware e rejeita URLs remotos; o Worker tem teste direto específico |
| Password reset, JWT, credenciais e sessões | Não há implementação de contas, palavras-passe ou JWT do Nodara | Gateway Sites gere acesso; verificar recuperação, expiração, revogação e flags de cookies com o fornecedor |
| CORS | Não há Access-Control-Allow-Origin wildcard; preflight/mutações não suportados | Reavaliar se existir API cross-origin |
| Rate limits / disponibilidade | Parsers do editor limitados a 2M caracteres, 64 níveis e 100k valores; limites de domínio mantidos | Não há rate limiter distribuído próprio. Confirmar proteção edge, quotas e resposta a abuso; não declarar resistência a DoS |
| IDOR/BOLA | Sem endpoints de registos utilizador/tenant nem base de dados do produto | Qualquer backend futuro precisa de autorização por objeto, no servidor |
| Webhooks/pagamentos | Inexistentes: sem checkout, chaves ou confiança em pagamentos no frontend | Assinaturas, idempotência e confirmação server-side são requisitos antes de introduzir essas funções |
| Segredos e ambiente | Scan do estado atual por padrões comuns, nomes de ficheiros e artefactos; valores suspeitos nunca impressos | Não é auditoria completa de histórico Git, vault, variáveis/logs do fornecedor ou todos os formatos de segredo |
| Source maps | Nenhum map/referência nos assets web; caminhos map negados. Gate impede regressões | Tarballs MIT para integração incluem source maps intencionalmente, acessíveis apenas ao público autorizado do Site. JS enviado ao browser nunca é secreto |
| Headers e cache | CSP, nosniff, no-referrer, anti-framing, Permissions-Policy, HSTS em HTTPS, no-store HTML e noindex | noindex não é autenticação. Gateway, auth pages e delivery de assets precisam de verificação no alojamento |
| Dependências | Auditoria online: zero advisories no conjunto production; quatro entradas no grafo dev, duas exceções temporárias com hashes/expiry | Exceções esbuild até 14/10/2026, não corrigidas; não expor os dev servers afetados. O audit production não representa sozinho todo o bundle de servidor |

## Privacidade e práticas comerciais

- O portal não implementa analytics, publicidade, newsletter, formulários de
  contacto enviados, localStorage/sessionStorage ou cookies próprios. Os planos
  e editores ficam na memória da página. Não existe backend persistente do Nodara.
- Os exports JSON e a área de transferência são ações explícitas do utilizador.
  Recarregar repõe o exemplo; cópias exportadas devem ser geridas no computador.
  Aviso para usar dados sintéticos, nunca credenciais/dados sensíveis.
- A plataforma de alojamento pode tratar IP, identidade e registos técnicos.
  Não inferir “zero dados pessoais” a partir da ausência de backend próprio.
- Sem vendas, renovações, taxas, reviews de clientes ou campanhas por email
  implementadas. Não inventar uma política de reembolso nem mecanismo de
  unsubscribe para uma funcionalidade inexistente. Rever ambos antes de vender
  ou enviar marketing. Não introduzido um age gate que recolha dados desnecessários.
- Não foi adicionado um banner de cookies fictício. Finalidades opcionais futuras
  devem ser bloqueadas antes do consentimento e permitir recusa/retirada fácil.
  É necessário inventariar os cookies reais da plataforma antes de abrir a terceiros.
- Página `/legal` informa o estado atual e **explicita as lacunas**. Não é uma
  privacy policy/ToS comercial completa enquanto faltarem os dados abaixo.
- Removidos claims não sustentados: leitores de ecrã já testados, bundle fixo de
  16 KB, integração garantida em cinco minutos, estabilidade futura e oferta
  enterprise. A beta tem limites e não representa liderança de mercado.

## Licenças, SDKs e acessibilidade

- Preservada a licença MIT existente; sem alteração da titularidade declarada nos
  ficheiros LICENSE. “Nodara Labs” não foi tratada como uma empresa verificada.
- React/frameworks, runtime do portal e libs matemáticas inventariados nos manifests
  e lock. Não encontrados SDKs de publicidade/analytics no código do portal.
- Geist/Geist Mono são self-hosted no build; licença OFL distribuída em
  `public/licenses/geist-OFL.txt`. Lucide tem ISC e derivados Feather MIT;
  texto integral distribuído em `public/licenses/lucide.txt`.
- Notices matemáticos existentes preservados em `packages/core/THIRD-PARTY-NOTICES.md`.
  A proveniência de `public/og.png` e a titularidade de marca/assets necessitam
  confirmação do proprietário antes de distribuição ampla.
- Teclado, contraste e semântica têm testes automatizados; a página legal passa
  axe. Percurso real com Narrador preparado e aceite pelo utilizador, mas só
  aprovado depois de receber os resultados. Sem certificação WCAG declarada.

## Bloqueios antes de clientes ou lançamento público

1. Entidade responsável, país e contacto de privacidade/suporte/segurança —
   perguntados ao proprietário, sem dados inventados. Definir processo de direitos
   (acesso, eliminação, etc.), resposta a incidentes e responsável por patches.
2. Inventário do alojamento: papel de cada interveniente, contratos/DPA,
   transferências, retenção de logs, cookies, sessões, edge rate limiting e
   controlos de acesso também nos ficheiros de download.
3. Revisão jurídica das informações obrigatórias e futuras condições comerciais,
   aplicabilidade de regras de consumo/acessibilidade e direitos dos titulares.
   Privado não é uma isenção automática de todas as obrigações.
4. Resultado humano de acessibilidade; proveniência dos assets; testes sobre a
   versão final e publicação privada pelo fluxo suportado.

## Referências primárias consultadas

- [OWASP: CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
  e [headers HTTP](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html).
- [UE: obrigações RGPD, informação e direitos](https://europa.eu/youreurope/business/governance-and-sustainability/digital-and-data-compliance/data-protection-gdpr/index_en.htm).
- [CNPD: cookies, informação e consentimento](https://www.cnpd.pt/media/x2zdus50/nota-informativa-cnpd_cookies_20210625.pdf).
- [Geist: fonte e licença](https://github.com/vercel/geist-font).

São referências para esta análise técnica, não parecer jurídico individualizado.

Resultados locais, exclusões e estado exato do gate/publicação:
`docs/VALIDATION-2026-09-24.md`. As melhorias desta vistoria ainda não estão no Site.
