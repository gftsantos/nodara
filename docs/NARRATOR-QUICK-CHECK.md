# Narrador do Windows — percurso humano de 5 minutos

Estado: **pendente de execução humana**. Não é uma certificação WCAG.
Usar Edge ou Chrome do computador, não a emulação de dispositivos dos testes.

1. Abrir `http://127.0.0.1:3001/operations`. Ligar/desligar o Narrador com
   **Windows + Ctrl + Enter**. Se abrir a introdução do Narrador, voltar ao browser.
2. No modo de análise, usar **H** para percorrer títulos e **Tab / Shift+Tab** para
   percorrer controlos. A tecla Narrador é normalmente Caps Lock ou Insert;
   **Narrador + Espaço** liga/desliga o modo de análise. Confirmar que encontras
   “Planeamento operacional” e que os botões dizem nome e estado, sem depender de cor.
3. Ativar **Planeamento laboral · impacto** com Enter. Percorrer tarefa, duração,
   recursos e nivelamento. Confirmar rótulos e valores; não usar dados pessoais.
   Usar Tab para editar campos; desligar análise se as teclas forem intercetadas.
4. Abrir **Calendário, tarefas, recursos e dependências em JSON**. No campo
   **Plano laboral JSON**, copiar o conteúdo para o Bloco de Notas apenas se
   precisares de o recuperar; substituir por `{` e ativar **Validar JSON e calcular
   impacto**. Esperado: erro anunciado, nenhum plano guardado alterado, foco recuperável.
   Recarregar a página repõe os dados sintéticos (não há persistência).
5. Reabrir o plano laboral, escolher **Preparar entrega** no campo **Tarefa** e
   mudar **Trabalho útil · horas** de **3** para **2**. Ativar **Calcular impacto**.
   Esperado: prévia anunciada, zero conflitos e tabela com cabeçalhos compreensíveis;
   o plano guardado só muda ao ativar **Aplicar a todas as vistas**. Depois ativar
   **Desfazer plano laboral**.
   Registar se a confirmação e a mudança são anunciadas e se o foco se mantém útil.
6. Abrir `http://127.0.0.1:3001/legal`. Usar H para os títulos e Tab/Enter no link
   Cookies. Confirmar que a leitura faz sentido e que se consegue sair/voltar sem rato.

Se encontrares um bloqueio, não precisas de terminar: regista o passo e o que ouviste.
O percurso completo permanece em `docs/SCREEN-READER-CHECKLIST.md`.

## Resultado a devolver

- Data; Windows; browser/versão; Narrador/versão:
- Passos 2/3/4/5/6: passou / falhou / não testado:
- Texto anunciado no erro e após aplicar:
- Algum controlo sem nome, foco perdido ou dados impossíveis de ler?
- Houve diferença entre modo claro/escuro ou com zoom de 200%?

Atalhos confirmados na documentação Microsoft:
[Comandos do Narrador](https://support.microsoft.com/en-us/accessibility/windows/narrator/appendix-b-narrator-keyboard-commands-and-touch-gestures) e
[Modo de análise](https://support.microsoft.com/en-us/accessibility/windows/narrator/chapter-3-using-scan-mode).
