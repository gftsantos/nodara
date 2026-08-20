# Nodara

Monorepo e portal de integração da Nodara — infraestrutura visual para produtos web com Gantt, gráficos, grafos, topologias e calendários.

## Experiência incluída

- Playground interativo para quatro famílias de visualização
- Exemplos de payloads e referência de propriedades da API
- Integrações copiáveis para React, Angular, Vue e JavaScript
- Temas claro/escuro, pesquisa rápida e layout responsivo
- Arquitetura preparada para publicação no OpenAI Sites

## Pacotes

| Pacote | Responsabilidade |
| --- | --- |
| `@nodara/core` | Contratos, validação, temas, controladores e renderers |
| `@nodara/react` | Componentes e lifecycle React |
| `@nodara/vue` | Componentes e eventos Vue 3 |
| `@nodara/angular` | Standalone components Angular |
| `@nodara/web-components` | Custom elements para qualquer stack |

## Desenvolvimento

Requer Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Para validar uma versão de produção:

```bash
npm test
```

O portal vive em `app/`. A biblioteca vive em `packages/`; a arquitetura e a
política da API estão documentadas em `docs/`.
