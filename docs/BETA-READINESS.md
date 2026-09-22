# Preparação da beta — 22 setembro 2026

Esta é uma candidata de desenvolvimento, não uma versão publicada no npm.
Os pacotes continuam em `0.1.0-alpha.1`. Os arquivos locais têm hashes próprios;
não identificar duas compilações apenas pelo nome/versionamento alpha partilhado.
Antes da publicação: atribuir uma versão beta única e usar a mesma nos cinco
pacotes. Não executar `npm run release` durante a avaliação da candidata.

## Contrato de integração

- Seis APIs de visualização; variantes e exemplos não são componentes independentes.
- CSS explícito: `@nodara/core/styles.css`. Importar calendários laborais apenas
  de `@nodara/core/working-time`; o módulo principal não carrega Temporal.
- Dados e opções validados antes de mutar: `update`, `setOptions`, `setState`.
  Usar `setState` quando a mudança de tipo exige outro schema simultaneamente.
- Os adaptadores React, Vue, Angular e Web Components são testados com pacotes
  instalados em consumidores isolados, não aliases para o código-fonte.
- Plano laboral: snapshots imutáveis, `preview` não mutante, `apply` com revisão
  esperada, conflitos explícitos, histórico limitado e `destroy` na desmontagem.
- Callbacks de edição são propostas antes do commit local; subscrições recebem
  alterações confirmadas. Atualizar dados não fabrica eventos de interação.
- APIs alpha não constituem um compromisso de compatibilidade 1.0. A beta deverá
  manter contratos documentados; mudanças incompatíveis exigem versão e migração.
- O gate compara 269 exports de declarações em seis entradas com a superfície
  revista em `public-api-candidate.json`. Alterar a baseline exige revisão explícita;
  não substitui compilar e executar consumidores reais.

## Mudança aditiva nesta candidata

`WorkingResource.calendar?` e `WorkingPlan.resourceLeveling?: 'none' | 'serial'`
são opcionais. Planos schema 2 anteriores continuam a usar o calendário do projeto
e não são nivelados automaticamente. Não converter `durationMs` em `workingMs`.

Calendários por recurso intersectam o projeto e os restantes recursos da tarefa.
Turnos, férias e exceções usam a data civil e fuso de cada calendário. O tempo de
trabalho é simultâneo e real, não esforço dividido pelo número de pessoas.

O nivelamento serial é uma heurística interrompível: prioridade topológica estável,
bloqueios reservados primeiro, pausas onde falta capacidade e retoma posterior.
Não garante prazo ótimo, não escolhe recursos alternativos nem calcula CPM laboral.
Ativar/desativar nivelamento também produz uma prévia e pode ser desfeito.

## Verificações reproduzíveis

1. `npm ci` com o Node/npm declarados no repositório.
2. `npm run verify:release`: segurança, builds, tipos, contratos, consumidores,
   exemplos copiáveis e testes de browser. Não publica pacotes.
3. `NODARA_CONSUMER_VARIANT=minimum npm run test:consumers` no shell apropriado:
   verificar também os limites inferiores declarados de React e Vue.
4. `npm run benchmark`: isoladamente, sem suites concorrentes. Ver
   `docs/PERFORMANCE.md`; guardar ambiente, hashes e amostras.
5. Percurso humano de `docs/SCREEN-READER-CHECKLIST.md`, ainda pendente até existir
   um registo real de execução. Axe e emulação não substituem esta etapa.

## Condições para distribuição

- Confirmar todos os gates sobre o mesmo commit e arquivos instaláveis.
- Rever erros, exclusões e limites: não somar repetições de testes como capacidades.
- Rever vulnerabilidades e exceções temporárias; não prolongar exceções sem análise.
- Versionar e gerar changelog/migração, rever licença e permissões de publicação.
- Decidir explicitamente publicar no npm e tornar o portal acessível a terceiros.
  O desenvolvimento desta candidata não altera automaticamente essa decisão.
