# Validação humana com leitor de ecrã — pendente

Em 22/09/2026 não foi encontrado NVDA em execução, nas localizações padrão ou
nas entradas de desinstalação deste computador. Uma cópia portátil pode existir.
Nenhum resultado abaixo está aprovado sem execução humana e registo do observado.
Não instalar software nem marcar o percurso como concluído automaticamente.

Registar: commit/URL, Windows, browser e versão, leitor/versão, data, pessoa que
testou, resultado de cada passo, texto realmente anunciado e problemas observados.
Usar um browser suportado pelo leitor instalado, sem rato durante o percurso.

| Percurso | Resultado esperado | Resultado real |
| --- | --- | --- |
| Abrir `/operations`; navegar por títulos e regiões | Encontrar o plano laboral e as suas instruções | Pendente |
| Ativar “Planeamento laboral · impacto” por teclado | Estado selecionado e região disponível | Pendente |
| Percorrer inputs de capacidade e nivelamento | Nome, valor, estado e foco percetíveis | Pendente |
| Abrir calendário do recurso e definir ausência | Controlos têm rótulos; não aplicar ainda o plano | Pendente |
| Calcular impacto | Anúncio da prévia; revisão guardada mantém-se | Pendente |
| Ler tabela de datas e conflitos | Cabeçalhos, tarefa, fim guardado e proposto compreensíveis | Pendente |
| Aplicar com conflito não autorizado | Erro anunciado; foco e dados preservados | Pendente |
| Ativar nivelamento, recalcular e aplicar | Prévia sem conflito no exemplo; nova revisão anunciada | Pendente |
| Desfazer e refazer | Datas e opções restauradas; botões disponíveis corretamente | Pendente |
| Navegar Gantt, agenda, dependências, locais e carga | Dados semânticos e seleção acessíveis, sem bloqueio de teclado | Pendente |
| Editar JSON inválido e corrigir | Erro compreensível; render anterior preservado | Pendente |
| Copiar integração | Confirmação anunciada; alternativa de cópia manual | Pendente |
| Repetir em claro/escuro e ampliação de 200% | Foco visível, sem texto sobreposto ou perda de controlos | Pendente |

Para grandes datasets, verificar também que o limite da lista semântica é anunciado
e que a integração oferece acesso aos restantes dados. Um limite de 300 elementos
não demonstra que todos os dados são navegáveis pelo leitor na visualização.

Uma falha deve originar reprodução, correção, teste automático quando possível e
reteste humano. Não declarar certificação WCAG a partir desta lista.
