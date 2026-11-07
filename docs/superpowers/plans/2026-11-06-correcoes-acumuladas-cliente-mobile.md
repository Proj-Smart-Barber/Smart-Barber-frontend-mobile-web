# Correções acumuladas — experiência do cliente mobile

Criado em 06/11/2026. Atualizado em 07/11/2026 após a Tarefa 9. Documento incremental: acrescentar novos achados sem apagar o histórico. Estado atual: registro para o lote final, sem implementação das correções nesta revisão.

## Regra de execução recebida

O responsável informou que a implementação chegou até a tarefa 3 e pediu revisão dos pontos observados. As correções adicionais serão executadas em conjunto depois de concluir as fases planejadas, incluindo a validação da tarefa 9. Não corrigir código agora nem ampliar silenciosamente o próximo lote.

Se uma tarefa já planejada resolver naturalmente um achado, registrar essa ocorrência e revalidar no lote final. Isso não autoriza adiar uma obrigação original da tarefa: o fluxo definitivo de Agendar continua pertencendo à tarefa 6.

Achado não é correção concluída. Usar os estados ABERTO, CANDIDATO A RESOLVIDO, RESOLVIDO COM EVIDÊNCIA, NÃO REPRODUZIDO ou BLOQUEADO, sem encerrar apenas por comentário ou teste estático.

## Revisão 01 — após a tarefa 3

Fontes:

- [Captura fornecida pelo responsável](../../evidencias-cliente-mobile-2026-11-06/revisao-01-apos-tarefa-3.png), preservada sem edição.
- Relato: Agendar mostra um aviso para escolher uma barbearia e não prossegue; aba selecionada tem o mesmo preenchimento do CTA e causa confusão.
- Código lido em `D:/smart_barber/worktrees/frontend-experiencia-cliente-mobile`, branch `feat/experiencia-cliente-mobile`, HEAD `4770840`.
- O worktree continha somente os arquivos locais não versionados `dev-server.log` e `run-dev-server.cmd`; eles não foram lidos nem alterados nesta revisão.

Limites: leitura de código e análise da captura. Não houve clique reproduzido em navegador, teste executado, inspeção do banco ou validação em dispositivo/produção. O relato de interação é evidência fornecida pelo responsável, não uma reprodução independente desta revisão.

## C-001 — Agendar informa uma escolha, mas não apresenta um fluxo acionável

**Prioridade:** alta, funcional/UX. **Estado:** CANDIDATO A RESOLVIDO COM EVIDÊNCIA DE NAVEGADOR. **Dependências:** publicação da mídia na tarefa 5 e fluxo definitivo na tarefa 6 (implementado na tarefa 6; validado em navegador na tarefa 9). **Momento da consolidação final:** lote final pós-fases para validação ponta a ponta com dispositivo físico / persistência real.

### Implementação na Tarefa 6 e evidências de validação na Tarefa 9

1. **Remoção da ponte temporária:** Removido o efeito de layout em `src/app/(client)/_layout.tsx` que disparava toast e consumia o pedido via `closeBooking` em finally.
2. **Componente interativo definitivo:** Criado `BookingStartSheet` (`src/features/discovery/ui/booking-start-sheet.tsx`) montado sobre o layout cliente, mantendo o fundo inerte via `interactionBlocked`.
3. **Caminho 1 (Serviço válido):** Apresenta barbearia, serviço, preço e duração, com ação "Continuar" para `/barbershops/{shopId}/services?serviceId={serviceId}` e opção "Trocar barbearia ou serviço" para busca geral. Evidenciado em navegador local Playwright na imagem `04-web-emulado-390-agendar-sheet-contextual.png`.
4. **Caminho 2 (Foto ambiental):** Apresenta a barbearia sem atribuir nome/preço de corte fictício, oferecendo "Escolher serviço" para `/barbershops/{shopId}/services` e "Trocar barbearia".
5. **Caminho 3 (Troca ou seleção geral fora do feed):** Exibe caixa de busca em tempo real com estados de loading e erro resiliente com retry. Evidenciado em `04b-web-emulado-390-agendar-sheet-busca.png`.
6. **Segurança e integridade de reserva:** Nenhum clique confirma agendamento ou emite POST; preserva o motor PERSONAL e catálogo existentes.
7. **Responsividade comprovada:** Sheet validado em viewport compacto 320x568 (`12-web-emulado-320-agendar-sheet.png`) e 390x844.
8. **Evidência de testes automatizados:** Suíte `src/features/discovery/tests/client-booking-start.test.tsx` (8 testes aprovados cobrindo os caminhos, congelamento de snapshot, cancelamento, Escape/backdrop e bloqueio de duplo clique) e suíte integrada de 964 testes aprovados sem regressões.

### Critérios para encerrar no lote final

- Revalidação ponta a ponta em dispositivo físico com API backend real conectada.
- Verificação de clique até o catálogo final `/barbershops/{shopId}/services`.

---

## C-002 — Aba selecionada e Agendar têm o mesmo peso visual

**Prioridade:** alta, clareza de navegação. **Estado:** ABERTO. **Dependência:** barra final existente. **Momento da correção:** lote final.

### Evidência e causa

- Na captura inicial e revalidado em navegador (`02-web-emulado-390-explorar-feed-principal.png`, `08-web-emulado-390-conta-perfil.png`, `10-web-emulado-390-inicio-preservado.png`), o botão "Agendar" e a aba ativa da cápsula inferior compartilham o mesmo preenchimento Crimson vibrante (`colors.brand.primary`), gerando disputa de hierarquia visual primária.
- `ClientNavigationShell.tsx` aplica `colors.brand.primary` tanto no CTA de ação quanto no fundo da aba ativa.
- Há outras pistas semióticas (ícone preenchido vs outlined, texto em negrito, `accessibilityState.selected`), mas a hierarquia visual dominante permanece equivalente.

### Direção da correção

- Manter "Agendar" como único preenchimento Crimson de alta ênfase na cápsula inferior.
- Destino selecionado usa tratamento secundário da família de vidro (superfície neutra/elevada com contraste legível, borda sutil e ícone ativo).
- Não alterar tokens globais nem redesenhar sidebar ou Início.

### Critérios para encerrar

- Diferenciação visual imediata entre Agendar (ação) e a aba ativa (destino de navegação) em Início, Explorar e Conta.
- Validar em modo Claro (`14-web-emulado-390-tema-claro.png`) e modo Escuro.

---

## C-003 — Serviço lateral disputa a atenção com a ação central

**Prioridade:** média, observação associada. **Estado:** ABERTO PARA REVALIDAÇÃO NO LOTE FINAL. **Dependências:** tarefas 5 e 6 concluídas. **Momento da correção adicional:** lote final.

### Evidência e causa

- No feed de Explorar (`02-web-emulado-390-explorar-feed-principal.png`), o rail lateral exibe três ações verticais: "Detalhes" (informações do serviço/corte), "Catálogo" (serviços da unidade) e "Sobre" (endereço e mapa).
- O botão "Detalhes" já foi suavizado para estilo secundário na tarefa 5, reduzindo o Crimson triplo inicial. Contudo, em viewports menores (320px), a proximidade do rail lateral com a cápsula inferior ainda pode gerar sobrecarga visual.

### Direção e critérios

- Assegurar que "Detalhes" funcione estritamente como visualização informativa, enquanto "Agendar" seja o único ponto de entrada para a reserva.
- Ajustar refinamento de espaçamento no lote final.

---

## C-004 — Margem de respiro e sobreposição de banners em telas ultra-compactas (320px)

**Prioridade:** baixa/média, robustez de layout. **Estado:** ABERTO. **Identificado em:** 07/11/2026 (Validação Integrada Tarefa 9). **Momento da correção:** lote final.

### Evidência e causa

- Na validação com viewport 320x568 (`11-web-emulado-320-feed.png` e `12-web-emulado-320-agendar-sheet.png`), o `BookingStartSheet` preenche quase toda a altura útil, deixando o botão secundário "Trocar barbearia ou serviço" muito próximo da margem inferior do viewport.
- Além disso, no ambiente de desenvolvimento web, notificações flutuantes do framework (ex.: banner `#error-toast` do Metro/LogBox) interceptam eventos de clique no rodapé se não houver camada de descarte ou safe-area vertical ampliada.

### Direção da correção

- Adicionar `paddingBottom` adaptativo / safe-area handling reforçado no `BookingStartSheet` para viewports com altura `<= 600px`, assegurando que ambos os botões ("Continuar" e "Trocar barbearia") tenham respiro adequado e sejam completamente roláveis.

---

## Consolidação para o lote final

| ID | Achado | Origem | Estado | Fechamento esperado |
| --- | --- | --- | --- | --- |
| C-001 | Agendar termina em orientação sem escolha acionável | relato + leitura estática | CANDIDATO A RESOLVIDO COM EVIDÊNCIA DE NAVEGADOR | implementado na tarefa 6; validado com sucesso em navegador (Playwright 390 e 320); validação final ponta a ponta com API/aparelho físico no lote final |
| C-002 | CTA e aba selecionada com preenchimento Crimson equivalente | captura + leitura estática | ABERTO | diferenciar hierarquia local na cápsula (Agendar = Crimson, aba ativa = superfície vidro/neutra elevada) |
| C-003 | Serviço lateral compete com Agendar | captura + leitura estática | ABERTO PARA REVALIDAÇÃO NO LOTE FINAL | avaliar respiro do rail lateral em viewports compactos |
| C-004 | Margem de respiro e sobreposição em viewport 320x568 no sheet de agendar | navegador local Tarefa 9 | ABERTO | adicionar padding bottom adaptativo para viewports ultra-compactos no sheet |

Novas revisões devem acrescentar IDs sequenciais, fase/HEAD, prova e critérios de encerramento. Não usar o número da prioridade como autorização para antecipar a correção.

## Execução posterior, após concluir as fases

1. Reproduzir cada item na base final e atualizar sua dependência/estado.
2. Implementar os itens ainda abertos (C-002, C-003, C-004) em um lote explícito de correções acumuladas.
3. Retestar fluxo de Agendar, contexto por mídia/ator, seleção de destinos, Menu, Início, Conta, GPS e loading.
4. Realizar comparação visual local em claro/escuro, tamanhos e fonte ampliada.
5. Entregar relatório por ID com mudanças, evidências e limites.
