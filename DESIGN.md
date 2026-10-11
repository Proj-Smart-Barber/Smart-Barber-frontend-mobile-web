# Smart Barber — contrato visual vigente

Revisão: 02/10/2026. Identidade: **The Obsidian Atelier 2.0**, temas Obsidian/Crimson e Ivory, fontes e logos oficiais existentes.

Fonte completa: [Guia Oficial de Design System](SMART_BARBER_DESIGN_SYSTEM_V2.md), versão documental 2.1. A seção 52 concentra as regras vigentes de materiais, controles, espaçamento, cabeçalho e áreas seguras; prevalece sobre exemplos anteriores divergentes. Este arquivo é a entrada resumida, não um segundo design system.

## Regras de implantação

1. Um card tem uma face de vidro fosco e conteúdo com inset real. Não criar outra moldura de card no wrapper ou enquadrar cada intervalo/informação com outra caixa opaca.
2. `LiquidGlassView.style`: largura, flex, margens, posição e wrapper de sombra. `contentStyle`: padding, gap e organização dos filhos. Bordas/cor/raio do material são props do material, não bordas do wrapper.
3. Inset compacto de card: normalmente 16–20 px; grupos com 8–12 px entre informações e 12–16 px entre seções. Altura automática, texto/controles sem corte.
4. Materiais: `card` para conteúdo, `form` mais denso para formulários, `navigation` para controles flutuantes e `sidebar` para painel lateral. Reduzir filtros aninhados; não blur em cada input/chip.
5. Botões: ação principal com tint Crimson e foreground branco; secundário neutro; destrutivo discreto e contrastante. Estados pressed/focus/loading/disabled e alvo de pelo menos 44 × 44 px. Visual de vidro integrado, sem vários filtros sobre o mesmo card.
6. Switches de ativação: trilho ON Crimson, thumb Ivory/branco; OFF neutro. Não usar verde/teal nesses controles. Verde permanece para sucesso/confirmado e marca WhatsApp quando semântico.
7. Cabeçalho mobile: menu/logo visíveis, saudação flexível e data/perfil em segunda linha quando necessário. Não espremer tudo numa linha nem usar scale para diminuir badges.
8. Seletores de data/calendário seguem a mesma família de forma/material/estados; preservar editabilidade, formato e limites existentes.
9. Footer e cabeçalho integram o fundo. Reserva de navbar é espaço transparente, não faixa preta; CTA e acionador do menu não colidem. Último item deve alcançar posição acessível.
10. Tema claro tem bordas/sombras e foregrounds próprios. Texto comum ≥4,5:1, texto grande ≥3:1; estados/foco necessários ≥3:1. Medir o fundo composto de vidro.
11. Usar `BrandMark`/assets oficiais, com variantes adequadas ao tema. Sidebar desktop e drawer mobile continuam disponíveis; a navbar permanece flutuante.
12. Material e estilo não autorizam alterar APIs, dados, handlers, RHF, rotas ou regras. Conferir claro/escuro, 320/390/430 px, desktop, teclado, nomes longos, estados e fim de rolagem.

O contrato está atualizado; as correções ainda são trabalho de implementação. Plano detalhado: `D:\Smart_Barber_Entregas\PLANO_CORRECAO_ESPACAMENTOS_CONTROLES_GLASS_2026-10-02.md`.
