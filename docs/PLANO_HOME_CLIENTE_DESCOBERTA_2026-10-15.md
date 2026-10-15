# Home do cliente, exploração e integração de reservas

Data: 15/10/2026. Status: proposta para revisão; sem implementação ou publicação nesta etapa.

## 1. Objetivo e base da análise

Substituir a Home provisória por uma entrada útil para o cliente encontrar uma barbearia, retomar seu próximo atendimento e concluir uma reserva com múltiplos serviços. Manter a identidade visual existente e reaproveitar catálogo, autenticação, notificações e motor de reservas.

Conferidos arquivos da main no GitHub de frontend/API em 15/10/2026, além dos documentos locais de descoberta/geolocalização de 14/10. A leitura do código não comprova o deploy desses contratos, funcionamento do GPS ou disponibilidade do banco de produção. Nenhuma chamada de escrita, teste de produção ou implementação foi executada nesta análise.

As decisões anteriores preservadas: Google Maps; lista como principal forma de exploração; mapa opcional sob demanda; proprietário confirma o ponto da unidade; raio inicial de 10 km com opções 5/10/25/50; busca textual sem GPS; coordenadas pessoais transitórias; carrinho de múltiplos serviços e fluxo PERSONAL.

## 2. Correções necessárias no briefing

| Afirmação recebida | Evidência e decisão |
| --- | --- |
| Home atual é placeholder | Confirmado na main em `src/app/(client)/index.tsx`; feature discovery ainda não aparece na árvore versionada examinada. |
| Frontend não tem trabalho pendente | Ausência da feature não comprova limpeza de todos os checkouts. Existem múltiplos worktrees e alterações locais; preservar trabalho existente na execução. |
| Proximidade com PostGIS | O repositório da main implementa Haversine em SQL PostgreSQL com bounding box e clamp. Não instalar PostGIS por causa do briefing. |
| Busca por rua/bairro/cidade | Busca nome e o texto único `location`, normalizados. Só encontra bairro/cidade se constarem nesse texto; não há filtros estruturados desses campos no contrato. |
| GET `/api/bookings/my` | Contrato real: GET `/api/bookings/me`. |
| GET `/:shopId/availability/slots` | Contrato real: GET `/api/barbershops/:shopId/availability`, com data, vários serviços e profissional. |
| Cancelar pelo PATCH `/:bookingId/status` | Essa rota recebe COMPLETED/NO_SHOW no cliente existente. Cancelamento pessoal usa DELETE `/api/bookings/:bookingId/cancel`, com versão, motivo/escopo e chave idempotente conforme o motor atual. |
| Carrossel de destaques | Resposta de descoberta não tem campo editorial, patrocínio, avaliação ou ranking. Usar 'Conheça outras barbearias' ou retirar a seção; não inventar 'Destaques'. |
| Ações em dourado | Contraria os tokens atuais obsidian/crimson/ivory. Preservar vermelho `colors.brand.primary`, texto claro e Liquid Glass. |
| GPS fornece endereço atual | Coordenadas não incluem nome de bairro/cidade. Usar 'Perto de mim'; endereço legível depende de contrato separado de geocodificação reversa, não incluído implicitamente. |
| Grupo 1 resolve toda geolocalização | Ele entrega descoberta e persistência. Confirmar ainda a edição de localização pelo proprietário, pontos elegíveis, Google/mapas e manutenção antes de prometer proximidade funcional em produção. |

## 3. Contratos confirmados e lacunas

### Descoberta

- GET `/api/barbershops?q=&page=&limit=`: ALL; sem coordenadas ou raio na URL. q até 120 caracteres; página >=1, limite 1–50, padrão20.
- POST `/api/barbershops/nearby`: `{latitude,longitude,radiusKm,q?,page?,limit?}`; coordenadas finitas, raio5/10/25/50.
- Envelope: `{items,page,limit,total,hasNext,serverTime}`.
- Item: `{id,name,slug,location,avatarUrl,coordinates,distanceMeters}`. Coordenadas/distância podem ser null; não fabricar equivalentes.
- ALL ordena por nome normalizado/id; NEARBY por distância/id. Distância é aproximada em linha reta, não tempo de viagem.
- Apenas unidades ativas. A proximidade requer localização elegível/confirmada; unidades sem ponto continuam na busca textual.
- NEARBY retorna503 se o estado de manutenção geográfica estiver indisponível. ALL continua funcionando, podendo suprimir coordenadas. Diferenciar indisponibilidade de 'nenhuma barbearia encontrada'.

### Reserva e próximo atendimento

Reutilizar `/api/bookings/me`, catálogo, profissionais, disponibilidade e APIs de reserva já existentes. O fluxo PERSONAL não usa a Agenda de trabalho e não exige vínculo com barbearia.

Lacuna confirmada: a consulta pessoal atual é paginada em20, não tem filtro futuro/em andamento e o SQL não ordena essa seleção. `useMyBookings` ordena apenas os itens carregados e usa fallback para relógio local. Isso não garante o próximo atendimento global.

Proposta de extensão compatível: ampliar GET `/api/bookings/me` com `view=upcoming&limit=1`, resposta `{bookings:[...],serverTime}`. Sem `view`, preservar a compatibilidade do contrato existente e corrigir sua ordenação determinística. A consulta nova deve selecionar todos os registros pessoais elegíveis antes de ordenar/limitar, inclusive o legado legítimo.

Definição do destaque: reserva CONFIRMED em andamento ou futura, excluindo CANCELLED, COMPLETED, NO_SHOW e estados desconhecidos. Ordenar início/id e considerar `endsAt > serverTime`. 'Em atendimento' pode ser indicação temporal derivada, nunca um novo status de negócio persistido ou prova de que o atendimento começou. Dados incompletos não autorizam countdown ou sucesso presumido.

O filtro/limite é uma proposta de contrato, não endpoint já implementado. Confirmar schemas, repository e testes na execução. Não enviar parâmetros que o backend ignora e assumir suporte.

## 4. Contrato visual

- Usar `shared/theme` e `LiquidGlassView`; nenhuma paleta paralela nem valores de cor duplicados em componentes.
- Dark: obsidian existente; foreground ivory; CTA crimson. Dourado somente se já previsto em detalhe decorativo do sistema, sem substituir a ação principal.
- Preservar tema claro e preferência de sistema configurados em Configurações; não forçar fundo escuro sobre tema claro nem expor outro toggle na Home.
- Inputs e seletores no padrão Liquid Glass do calendário/filtro da Agenda; foco visível, borda sutil e tipografia existente.
- Cápsula inferior, drawer e comportamento sutil de rolagem seguem o padrão atual. Compartilhar aparência/primitivas, mantendo configuração de destinos e permissões própria do cliente.
- Área de toque mínima44px, sem texto importante truncado; nomes/endereço quebram linha quando necessário. Imagens ausentes usam identidade neutra do produto, não fotos fictícias de estabelecimentos.
- Um CTA principal por card; evitar duplicação de 'Ver detalhes' e 'Gerenciar' para o mesmo destino.
- Sem autoplay, indicadores de avaliação inventados, valores 'a partir de' sem fonte ou promessa 'horário disponível' baseada só na unidade estar ativa.
- Respeitar transparência e movimento reduzidos. Reservar espaço para navegação e ações fixas sem sobrepor conteúdo.

## 5. Desenho da Home

Ordem proposta no mobile:

1. Header compacto: saudação pelo primeiro nome, marca, notificações e avatar/menu da conta. Localização indica 'Usar minha localização', 'Perto de mim' ou indisponibilidade; não mostra coordenadas cruas.
2. Busca destacada: 'Busque uma barbearia ou endereço'. Envio abre Explorar com termo preservado; não instanciar duas buscas concorrentes por digitação na Home e Explorar.
3. Próximo agendamento: unidade, profissional quando disponível, vários serviços, data/hora no fuso da unidade e estado real. CTA 'Ver agendamento' abre detalhe pessoal. Countdown discreto em minutos com relógio autoritativo, atualização em foreground e ao retornar ao app.
4. Sem reserva: card compacto 'Seu próximo cuidado começa aqui' com 'Encontrar barbearia'. Consulta pendente/erro não vira 'Você não tem agendamentos'.
5. Com localização válida: prévia curta de 'Perto de você', raio10km e 'Ver todas'. Lista curta de até4 cards como padrão aprovado; carrossel manual é alternativa visual sujeita à revisão, sem alterar a exploração principal em lista.
6. Sem localização: seção 'Encontre sua barbearia', busca textual e botão explícito para ativar posição. Recusa não bloqueia o app nem repete solicitação.
7. Seção secundária opcional 'Conheça outras barbearias': resultados ALL reais, ordem transparente, sem duplicar itens já destacados. Exibir apenas se trouxer conteúdo adicional útil; não chamá-los de recomendados/populares/destaques.

Desktop: mesmo conteúdo e hierarquia, com largura máxima atual; busca ampla, card de próximo atendimento lateral quando houver espaço e grade de resultados. Não esticar cards e imagens indefinidamente.

### Navegação própria do cliente

- Cápsula mobile com **Início / Explorar / Agendamentos**; conta/configurações no avatar/menu e notificações no header.
- Desktop com os mesmos destinos numa navegação adaptativa, mantendo a identidade de sidebar existente.
- Criar layout do cliente explícito; a main examinada não possui `(client)/_layout.tsx`.
- Não colocar o CLIENT no `NavigationShell` operacional sem adaptar os destinos: ele contém Agenda, Horários, serviços/equipe e ações UNIT.
- Recursos de conta, catálogo e confirmação devem manter acesso/retorno coerentes sem duplicar shells nem revelar funções administrativas.
- BARBER/OWNER conservam seu contexto de trabalho; o consumo pessoal continua acessível pelas entradas de conta, sem promover papel ou exigir mudança de vínculo.

## 6. Explorar

- Rota proposta `(client)/explore.tsx`; busca com debounce300ms e envio explícito por teclado.
- Modos **Todas / Perto de mim**. Raio5/10/25/50km só faz sentido com localização válida; padrão10km.
- Seletor compacto no padrão do calendário, coerente com o feedback anterior de evitar fileiras extensas de chips.
- Preservar termo/raio/modo ao entrar no catálogo e voltar. Não incluir coordenadas pessoais em URL; termo e raio não sensíveis podem compor retorno validado.
- Resultados paginados20, virtualizados: uma coluna no mobile e2/3 conforme breakpoints no desktop. Preservar ordem do servidor e deduplicar por id sem inventar total/hasNext.
- Card: imagem real ou placeholder, nome, endereço, distância apenas quando fornecida; CTA 'Ver serviços' abre catálogo. 'Agendar' não pula a escolha de serviços/profissional/horário.
- Mostrar 'Carregar mais' ou paginação conforme padrão validado; erro de página adicional preserva itens e permite repetir.
- Alterar termo/modo/posição/raio reinicia página, cancela/ignora respostas antigas e evita misturar resultados.
- Sem resultados próximos: oferecer ampliar raio ou buscar em Todas, sem mudar o filtro silenciosamente.
- 503 de proximidade: mensagem específica, repetir e alternativa textual. Sem mostrar 'nenhum resultado' por falha técnica.

### Mapa opcional — decisão anterior preservada

- Botão 'Ver no mapa' carrega Google Maps somente por ação do cliente. Não iniciar SDK/mapa na abertura da Home.
- Representar apenas resultados carregados com coordenadas elegíveis e avisar se a lista for parcial. Nada de fabricar ponto para endereço sem coordenadas.
- Mesmos filtros da lista; seleção do marcador abre o mesmo card/catálogo. Sem busca automática a cada movimento do mapa nesta primeira versão.
- Chaves públicas restritas por plataforma e APIs necessárias; segredos de servidor fora do bundle. Conferir documentação oficial e configuração vigente na execução, sem contratar serviços automaticamente.
- Se mapas/configuração estiverem indisponíveis, manter lista funcional com mensagem de indisponibilidade. Não apresentar botão como integração concluída se o adaptador for placeholder.
- Dependências de cadastro/manutenção geográfica do proprietário seguem o desenho aprovado de14/10. Não considerar o Grupo1 de descoberta prova da conclusão dessas dependências.

## 7. Geolocalização e privacidade

- Porta única `LocationProvider` com adapters web/native. Coordenadas por ação explícita e somente durante uso; sem background tracking.
- Estados: idle, requesting, granted, denied, unavailable, timeout, stale. Guardar timestamp/accuracy em memória, não só booleano 'GPS ativo'.
- Web usa API de posição do navegador; nativo integra SDK compatível com a versão Expo instalada. Permissão e leitura de GPS são independentes da exibição Google Maps.
- Se posição aproximada, comunicar distância aproximada; não prometer precisão superior à fornecida.
- Sem permissão, contexto inseguro, timeout ou GPS desligado: permitir busca textual. Não mandar `(0,0)` como fallback; `(0,0)` real continua válido.
- Atualização de posição é explícita; não consultar GPS a cada render nem mudar resultados enquanto usuário escolhe um card.
- Coordenadas só no corpo POST. Não persistir em AsyncStorage/localStorage, caches persistidos, logs/telemetria, links ou query keys. Usar identificador opaco de geração para a sessão de posição.
- Queries NEARBY usam somente cache volátil e descartável, sem meta/request logging de coordenadas. Limpar posição e resultados associados ao trocar ator/sair; impedir respostas atrasadas.
- Posição antiga perde validade de UX após intervalo documentado; solicitar atualização, não afirmar 'sua localização atual' indefinidamente. Confirmar política de validade sem confundir com prazo de manutenção dos dados comerciais.

## 8. Integração do agendamento

Fluxo: Home/Explorar → `/barbershops/[shopId]/services` → carrinho com vários serviços → profissional/horário → revisão → criação idempotente → confirmação → retorno pessoal.

- Reutilizar `BookingFlowView`, return intent, validação de e-mail, disponibilidade multi-serviços, cotação/revisão e `shared/operations` existentes.
- Falha, conflito de horário, alteração de cotação e timeout seguem o motor atual. Navegação nunca dispara POST automaticamente.
- Manter a confirmação existente até ação explícita do usuário; acrescentar 'Voltar ao início' para origem do cliente e 'Ver agendamento' com id autoritativo. Não trocar o comportamento UNIT nem forçar BARBER/OWNER para a Home do cliente.
- Antes de mostrar a reserva no destaque da Home, invalidar/refazer a consulta autoritativa. Feedback positivo só decorre de resultado APPLIED confirmado; query string não prova sucesso.
- Home não cancela via mutation nova improvisada. 'Ver agendamento' utiliza detalhe/ações existentes, preservando regra de cliente até2h antes, versão e idempotência.
- Recuperação continua acessível após voltar à Home; tentativa incerta não se transforma em reserva confirmada.

## 9. Arquitetura e tarefas

### Grupo 1 — Contratos, prontidão e próximo atendimento

- Confirmar Swagger/runtime e exemplos de ALL/NEARBY, nulls,503 e autenticação sem publicar dados pessoais.
- Conferir pontos confirmados e estado de manutenção para avaliar se a proximidade pode ser homologada.
- Ampliar `/bookings/me` para destaque autoritativo conforme seção3; preservar compatibilidade e ordenar dados pessoais de forma determinística.
- Testar consulta com mais de20 registros, histórico na primeira página, reserva em andamento, canceladas e períodos/fusos diferentes. Seleção antes do limite é obrigatória.
- Produzir contrato Zod de descoberta e de próximo atendimento, sem defaults que mascarem resposta inválida.

### Grupo 2 — Dados, localização e mapa

- Criar `features/discovery/api/{discovery.contract,discovery.api}.ts`, hooks de consulta e política de paginação/cache volátil.
- Implementar porta/adapters de localização e isolamento por geração/ator.
- Fechar os adapters de mapa opcionais Google de acordo com o desenho existente; evidências distintas para web/native.
- Verificar dependências de localização comercial/manutenção. Concluir ou vincular entregas reais antes do aceite de NEARBY; não fabricar dados nem heartbeat para esconder503.

### Grupo 3 — Componentes e navegação do cliente

- Componentes: `ClientHeader`, `ClientSearchEntry`, `ClientNextBookingCard`, `BarbershopCard`, `DiscoveryFilters`, `DiscoverySkeleton`, estados vazios/erro.
- Usar `LiquidGlassView`, tokens, acessibilidade e os breakpoints reais. Não duplicar o design system.
- Criar layout/shell com configuração própria de destinos; integrar recursos pessoais de notificações/conta e settings sem abrir operação UNIT.
- Revisar cards com dados longos, imagem ausente/erro, distâncias pequenas/nulas, tela estreita e preferência de transparência reduzida.

### Grupo 4 — Home e Explorar

- Substituir placeholder e implementar o desenho da Home, com consultas independentes e falhas parciais explícitas.
- Implementar explorar, busca300ms, filtro compacto, paginação e retorno ao contexto.
- Ligar 'Ver no mapa' sem carregar SDK na entrada e sem depender do mapa para explorar.
- Testar troca de filtros/posição, respostas fora de ordem, mudança de ator, permissão recusada e retorno ao app.

### Grupo 5 — Reserva e homologação

- Conectar catálogo/múltiplos serviços às novas entradas e ao retorno contextual da confirmação.
- Conectar consulta do próximo atendimento e invalidation após criar/cancelar/remarcar, sem alterar dados UNIT.
- Testes relevantes de parsers, hooks/componentes reais, permissões, cancelamento de requisições e recuperação; evitar testes que só recriam a implementação.
- TypeScript, export web e checks do repositório. HTTP real para contrato; PostgreSQL isolado para a consulta autoritativa de reservas quando alterada.
- Web estreita/larga e aparelhos Android/iOS: registrar separadamente GPS real, mapa real, visual manual, e-mail e fluxos de reserva. Sem dispositivo/provedor disponível: NOT TESTED, nunca PASS por mock.
- Entregar evidências, limitações, PRs e ordem API/frontend. Publicação depende da autorização específica; esta etapa é planejamento.

## 10. Critérios de aceite

1. Home mantém a identidade crimson/obsidian/ivory e Liquid Glass do app, incluindo o tema claro configurado.
2. Cliente encontra barbearias e inicia catálogo mesmo recusando GPS.
3. Proximidade usa posição autorizada e só mostra distâncias reais fornecidas; mapa é opcional.
4. Indisponibilidade geográfica não quebra busca textual nem se apresenta como lista vazia.
5. Próximo atendimento vem de consulta global correta do cliente, com relógio do servidor; não depende da primeira página carregada.
6. Não há ranking, avaliações, cidade/endereço atual, disponibilidade, status ou imagens comerciais inventados.
7. Busca e paginação não misturam filtros nem expõem posição pessoal em URLs/storage/logs.
8. Cliente conclui reserva multi-serviços com revisão, confirmação e recuperação existentes e volta ao contexto pessoal.
9. Clientes não veem menus/rotas operacionais indevidos; BARBER/OWNER mantêm sua jornada de trabalho e consumo pessoal.
10. Evidências de código, HTTP, PostgreSQL, GPS, Google Maps, web e nativo são classificadas separadamente.

## 11. Propostas para revisão antes da execução

- Manter ações em vermelho e os temas existentes; ajustar a diretriz dourada do briefing.
- Navegação do cliente com Início, Explorar e Agendamentos; conta/notificações no header/menu.
- Lista curta como prévia de próximas na Home; listagem/grade como experiência principal, mapa sob demanda. Não usar dois carrosséis concorrentes.
- Seção secundária sem classificação editorial fictícia; omitir quando repetitiva ou sem dados.
- Acrescentar a dependência de próximo atendimento autoritativo e verificar localização comercial/manutenção antes do aceite completo.

Esses pontos são propostas de consolidação deste briefing; não registrar como aprovados pelo usuário antes da revisão.
