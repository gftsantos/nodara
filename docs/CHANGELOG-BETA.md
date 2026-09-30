# 0.1.0-beta.1 — candidata privada, 24/09/2026

Não publicada no npm. Mesma versão nos cinco pacotes; acesso ao Site permanece
uma decisão separada e continua owner-only. Sem promessa de compatibilidade 1.0.

## Desde 0.1.0-alpha.1

- Planeamento operacional partilhado entre tarefas, recursos, calendário, carga,
  mapa e dependências; transações, prévias, histórico e revisão esperada.
- Calendários laborais por recurso, IANA/DST, interseção de turnos/férias e
  nivelamento serial opcional (heurística, não otimização global).
- Diagramas com semântica especializada, routing e portas; Chord proporcional,
  ER, State, Mindmap e árvores com diferenças e limites documentados.
- Adaptadores React/Vue/Angular/Web Components com validação de dados/opções,
  consumidores isolados e contratos públicos inventariados.
- Agenda: cache LRU limitada de formatadores, sem remover eventos semânticos.
  GeoMap: lookup de rotas indexado e culling de pontos fora do viewport.
  O custo de redesenhar 50k pontos visíveis continua uma limitação de Canvas.
- Portal: CSP por nonce, headers de segurança, superfície read-only, proxies
  de imagem desativados, limites JSON, política de assets/segredos e transparência.

## Migração e estabilidade

Manter `@nodara/core` e o adaptador na mesma versão. Instalar os novos `.tgz`
indicados no portal e importar explicitamente `@nodara/core/styles.css`.
Não converter `durationMs` (tempo decorrido) em `workingMs` (trabalho útil).
`WorkingResource.calendar` e `resourceLeveling` são opt-in, sem defaults ocultos.

A otimização desta revisão não muda a superfície de exports. A baseline de 269
exports é comparada no gate; alterações incompatíveis futuras exigem uma nova
versão de pré-release, notas de migração e regressões de consumidores. Não há
garantia de estabilidade binária/comportamental baseada apenas em assinaturas.

## Bloqueios para lançamento externo

Não confundir testes automatizados com leitor de ecrã real ou auditoria legal.
Concluir o percurso humano, identificar entidade/contactos, rever hosting/logs/
sessões/rate limits, fechar a proveniência dos assets e decidir publicação
explicitamente. Nenhuma cobrança, newsletter ou backend de dados foi introduzido.
