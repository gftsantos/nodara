# Validação com leitor de ecrã — computador Windows disponível

Estado em 14-09-2026: o utilizador dispõe apenas deste computador. Não foi
detetado NVDA instalado ou em execução. Nenhum percurso abaixo está marcado
como aprovado por um leitor de ecrã real. Emulação mobile, axe e navegação com
teclado são evidências complementares, não substitutos dessa sessão.

Não instalámos software de acessibilidade nem alterámos definições do Windows.
Uma sessão assistida pode usar um leitor já disponível (por exemplo Narrador) ou
NVDA após escolha do utilizador. Registar nome/versão do leitor e do browser,
Windows, zoom, URL e data. Não é necessário um telemóvel para a primeira sessão.

## Percursos a executar pelo operador

1. Abrir o catálogo. Percorrer landmarks, títulos, pesquisa e filtros. Confirmar
   nome/estado dos botões, contagens e foco visível; limpar pesquisa sem perder foco.
2. Abrir um exemplo de cada um dos seis motores. Percorrer dados equivalentes ao
   canvas, selecionar um item, sair do componente e confirmar ausência de armadilhas.
3. No editor JSON, introduzir erro e recuperar. Confirmar anúncio compreensível do
   erro, preservação dos dados anteriores onde anunciada e resultado atualizado.
4. Em `/operations`, selecionar tarefa, editar, desfazer/refazer. Tentar uma
   alteração bloqueada/conflituosa. Confirmar que a mensagem e o foco permitem
   entender o que não foi guardado, sem anúncios repetidos a cada render.
5. Expandir dependências, adicionar SS com lag negativo e desfazer. Confirmar
   leitura correta de origem, destino, tipo e unidade do lag.
6. Expandir o calendário laboral. Alterar horas e um feriado, recuperar JSON
   inválido. Confirmar que início/fim incluem fuso e que código pode ser copiado.
7. Expandir portas e percursos. Confirmar descrição das ligações e um aviso de
   ligação impossível, sem depender apenas do canvas ou da cor.
8. Repetir os percursos críticos a 200% de zoom, tema claro, tema escuro e alto
   contraste do sistema se o operador o usar. Não alterar permanentemente as
   preferências do utilizador para uma demonstração.

## Registo

Para cada passo: **não executado / aprovado / falhou**, texto anunciado, sequência
de teclas, foco esperado/observado, gravidade e reprodução mínima. Registar problemas
de verbosidade e ordem de leitura, mesmo sem violações automáticas de ARIA.

Continuam por validar: NVDA/Narrador reais, VoiceOver macOS/iOS, TalkBack Android,
teclados e dispositivos físicos adicionais. Não existe certificação WCAG universal.
