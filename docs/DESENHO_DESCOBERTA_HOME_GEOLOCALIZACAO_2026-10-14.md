# Descoberta, home e geolocalização — desenho em revisão

14/10/2026. Experiência e plano completo aprovados pelo usuário. Revisão técnica estruturada APPROVED; autorizado avanço ao prompt do Grupo 1, sem implementação nesta etapa documental.

## Decisões confirmadas

- Geolocalização entra nesta entrega, substituindo o adiamento anterior.
- Google Maps como provedor, com controle de consumo.
- Proprietário informa endereço e confirma o ponto no mapa.
- Lista como entrada principal do cliente; mapa opcional sob demanda.
- Reutilizar catálogo e reserva PERSONAL com vários serviços.

Alternativas consideradas: descoberta só textual, posição do aparelho como localização comercial automática, provedores alternativos e mapa aberto por padrão. As decisões confirmadas priorizam proximidade, confirmação do endereço e carregamento sob demanda.

## Experiência aprovada

1. Home com busca por nome/endereço, Usar minha localização e acessos pessoais de reservas/notificações/conta.
2. Com localização permitida: modo Perto de mim, raio inicial proposto de 10 km, ajustável para 5, 10, 25 ou 50 km.
3. Sem permissão, GPS indisponível ou timeout: modo Todas e busca textual disponíveis. Sem solicitação repetida ou localização em background.
4. Card com nome, endereço, imagem quando disponível, distância aproximada quando calculável e Ver serviços. Não fabricar avaliações, preços ou disponibilidade.
5. Ver serviços abre /barbershops/[shopId]/services e segue o carrinho/agendamento existente.
6. Ver no mapa abre Google com os mesmos resultados carregados, identificando listas parciais e permitindo carregar mais/voltar.
7. Lista próxima vazia oferece ampliar raio ou Buscar em todas, sem mudar filtros silenciosamente.
8. Unidades antigas sem ponto confirmado permanecem na busca textual e entram em proximidade após confirmação pelo proprietário. Sem coordenadas inventadas ou backfill remoto automático.

## Premissas técnicas propostas

- Paginação inicial de 20 itens, busca no servidor e lista virtualizada. Alterar posição/raio/filtro reinicia paginação e descarta respostas antigas.
- Posição do cliente transitória, sem histórico ou persistência em storage/logs. Distância em linha reta, sem prometer rota ou tempo de deslocamento.
- API pública mínima, somente unidades ativas. Memberships não são catálogo.
- Google Maps JavaScript na web e adaptador compatível com Expo no nativo; captura de posição separada do mapa.
- Chaves restritas por superfície/API/origem; chave de servidor fora do bundle. Quotas e alertas por SKU; alerta de orçamento não bloqueia cobrança automaticamente.
- Distinguir origem e validade dos dados Google. Não armazenar respostas de geocodificação como cache permanente irrestrito nem presumir que confirmação do ponto elimina as restrições do provedor.
- Preservar tokens visuais e componentes atuais. Sugestões genéricas do guia UI/UX não substituem a identidade do produto.
- Arquitetura existente, Swagger e testes SQL/HTTP/navegação. Integração apenas em banco descartável e schema isolado.

## Backend e proprietário

- Descoberta por texto e por coordenadas/raio, com paginação e ordenação determinística.
- Localização comercial e estado de confirmação, cadastro e edição pelo proprietário autorizado.
- Geocodificação Google e ajuste do ponto, respeitando unidades existentes.
- Estratégia de distância/índices e tratamento de falha/limite do provedor.
- Detalhar contratos e retenção após aprovação desta experiência.

## Validação prevista

- Permissão concedida/negada, GPS desligado, posição aproximada, timeout e atualização explícita.
- Unidades inativas/sem coordenadas, borda do raio e páginas sem mistura após troca de filtros.
- Autorização por unidade, par lat/lng válido e coerência ao mudar endereço.
- Busca -> catálogo -> vários serviços -> reserva, preservando o motor existente.
- Web desktop/mobile; adaptador nativo e dispositivo físico com evidências separadas. Visual manual pelo usuário.

## Fontes

- https://developers.google.com/maps/billing-and-pricing/manage-costs
- https://developers.google.com/maps/documentation/geocoding/policies
- https://cloud.google.com/maps-platform/terms/maps-service-terms
- https://docs.expo.dev/versions/latest/sdk/location/
- https://docs.expo.dev/versions/latest/sdk/map-view/

## Contratos e decisões técnicas para revisão

API nova, reaproveitando as rotas existentes de catálogo/profissionais/disponibilidade/reservas:

| Rota | Acesso e contrato |
|---|---|
| GET /api/barbershops | Público. q até 120 caracteres, page >= 1, limit 1–50 (default 20). Somente ACTIVE; ordenação nome normalizado/id. |
| POST /api/barbershops/nearby | Público, sem cache compartilhado. Corpo q/page/limit + latitude/longitude finitas e radiusKm em 5/10/25/50. Não pôr posição pessoal em URL. |
| POST /api/geocoding/search | Conta verificada; para unidade existente exigir OWNER/ACTIVE daquela unidade, para onboarding usar intenção OWNER autoritativa ou proprietário existente. Endereço comercial informado; busca explícita, sem autocomplete nesta versão. |
| GET /api/barbershops/:shopId/location | OWNER/ACTIVE da unidade. Retorna endereço, ponto, estado e version para edição. |
| PATCH /api/barbershops/:shopId/location | Mesma autorização; address, candidateId, latitude, longitude, expectedVersion, mutationId. Conflito 409, sem sobrescrever outra edição. |
| GET /api/internal/locations/refresh | Somente Bearer CRON_SECRET; atualização/limpeza idempotente em lote limitado. Não expor como ação pública. |

Resposta de descoberta: `{items,page,limit,total,hasNext,serverTime}`. Item: `{id,name,slug,location,avatarUrl,coordinates,distanceMeters}`; coordinates/distance são null quando não disponíveis/permitidos para aquele modo. Não retornar proprietário, CPF, CNPJ, tokens ou metadados internos de Google. Texto sem posição não inventa distância. Resultados próximos ordenados por distância calculada/id, calculando e filtrando antes da paginação. O mapa representa somente itens carregados e informa essa limitação.

Persistência aditiva: tabela barbershop_locations (uma por unidade), com pin, fonte, confirmação, version, validade e referência do candidato Google; unidades legadas começam sem linha/UNCONFIRMED. Estado efetivo: UNCONFIRMED, CONFIRMED ou NEEDS_REVIEW. Coordenadas válidas exigem par completo, latitude [-90,90], longitude [-180,180], valores finitos; 0 não é sinônimo de ausente. Não alterar coordenadas de unidade por dados do cliente.

Busca inicial usa PostgreSQL com distância Haversine em metros, constante de aproximação 6.371.000 m, clamp numérico e desempate por id. Sem instalar extensão geográfica nesta versão de catálogo moderado. Testar plano de consulta com 10.000 unidades, tempo de execução do SQL alvo <= 200ms no ambiente de teste documentado; se não atingir, ajustar índices/consulta antes de publicar. Não apresentar esse número como SLA de produção/cold start. Busca textual normaliza caixa/acentos e trata %/_ como caracteres literais. Latência simulada, erros e respostas fora de ordem cobertos no front.

Chaves separadas para web, Android, iOS e backend; restrições por API/origem/package/bundle, segredos de servidor somente no backend. Nunca solicitar chave secreta em mensagem pública. Candidatos Google têm id opaco, ficam associados ao ator e ao endereço/unidade, expiram em 15 minutos e são consumidos pelo salvamento; limitações persistentes por ator e projeto e timeout de 5s. Falha de provedor/cota não inventa ponto e permite salvar unidade ainda não confirmada, conservando descoberta textual.

Dados do proprietário digitados permanecem separados do conteúdo Google. Cache de coordenadas/resultados derivados de Google tem validade máxima de 30 dias; placeId é referência distinta. Registrar referência geocodificada e ajuste explícito do pin. Atualizar a partir do 20º dia, reaplicando ajuste apenas se a referência geocodificada não mudou; mudança da referência exige revisão, sem movimentar o pin silenciosamente. A unidade mantém o ponto anterior somente até vencer a validade original; depois sai da proximidade/mapa e continua na busca textual. A resolução S3 fixa expiração/limpeza no dia 25, com margem para o teto de 30 dias. Limpeza remove os valores Google vencidos; não basta esconder a linha. Job diário autentica, limita lote/concor­rência, preserva quota interativa e registra contagens sem PII. Falha de atualização/limpeza exige alerta operacional e correção antes de declarar ambiente publicado saudável. Provar a política com relógio controlado e revalidar os termos aplicáveis antes da implementação, sem usar confirmação como justificativa genérica para cache ilimitado.

Geolocalização do cliente: ação explícita, foreground/when-in-use, timeout de 10s, posição em memória com timestamp/accuracy, atualização manual e descarte no logout; não salvar em banco, URL, local storage, analytics ou logs. API não registra corpo de proximidade/SQL com posição pessoal. Filtro e posição mudando reiniciam página e descartam respostas antigas. Nenhum mapa Google é criado enquanto a pessoa não abrir a opção; mapa nativo via react-native-maps/PROVIDER_GOOGLE, web via Maps JavaScript API, captura via expo-location e adaptadores de plataforma.

## Disponibilidade e limites

- Lista textual e catálogo não dependem de disponibilidade do Google. Geocoding e mapa têm erros recuperáveis e atribuição visível.
- Sem avaliações Google, Places autocomplete, rotas/ETA, scraping, GPS em background ou geocodificação em massa das unidades legadas.
- Quotas por API/SKU e alertas precisam ser configurados no projeto Google antes de liberar chamadas reais; não afirmar custo zero pelo número de usuários nem tratar alerta como bloqueio automático.
- Duas superfícies de mapa são adapters de uma interface, sem criar SDK nativo na web. Chave ausente mostra estado explícito e não quebra SSR/export nem a lista.

## Resoluções da revisão — cético

- S1 aceita: POST /api/barbershops continua sem alteração contratual obrigatória. Primeiro criar a unidade; após 201 e atualização dos vínculos, aplicar PATCH de localização com version 0. Candidato de onboarding é associado ao ator/endereço e pode ser vinculado à nova unidade somente pelo OWNER ativo que a criou. Criação da unidade e confirmação do ponto são etapas distintas: falha na segunda deixa UNCONFIRMED e ação Concluir localização, sem repetir cadastro ou apresentar confirmação falsa. Em criação ambígua, consultar vínculos/detalhes próprios antes de tentar qualquer nova criação.
- S2 aceita: jobs carregam version e fingerprint da referência original. UPDATE/limpeza usa CAS nessa version e fonte/validade atuais; alteração concorrente do proprietário faz o job descartar seu resultado. Jobs não escrevem endereço, credenciais ou dados cadastrais. Jobs incrementam version quando alteram estado/validade pública, sem apagar a referência da última mutação do proprietário.
- S3 aceita com precisão de alcance: atualizar a partir do dia 20; expirar e limpar cache Google até o dia 25, com margem para o máximo contratual de 30 dias. Agendamento diário compatível com Vercel Hobby, sweep oportunista por acesso, retry limitado e alarme de falha/última execução há mais de 36h; sem mecanismo de manutenção comprovado, não liberar persistência Google em produção. Guardar cache em tabela separada de cadastro próprio; remover colunas/cache vencidos do banco ativo, não alegar apagamento forense de discos/backups. Restauração deve descartar cache vencido antes de abrir o ambiente. Antes de ler/gravar cache, executar sweep oportunista dos vencidos e falhar fechado se a manutenção/limpeza não estiver saudável. Testar relógio, falha de provedor/scheduler e limpeza; não prometer garantia absoluta de disponibilidade externa.
- S4 aceita: paginação page/limit é best-effort entre requisições, com ordenação determinística e deduplicação por id no cliente. Total descreve a consulta que o retornou, sem prometer snapshot estável/completude após alterações concorrentes. Refresh explícito reinicia a coleção.
- S5 aceita: PATCH inclui mutationId UUID e hash canônico do comando. Auth atual vem antes da reconciliação; repetição do mesmo id/ator/hash reconhece resultado aplicado antes de validar candidato consumido. Mesmo id com payload diferente retorna 409. GET privado expõe última mutação do proprietário (id/hash/savedVersion) para recuperar resposta perdida. Se houver outra edição e não for possível reconhecer a tentativa, mostrar estado atual e pedir revisão, sem repetir geocoding/salvamento automaticamente.

## Resoluções da revisão — restrições

- C1 aceita: persistir de Google somente lat/lng temporárias e placeId, com metadados técnicos mínimos. Endereço digitado pelo proprietário é dado próprio separado. Não persistir JSON bruto, formatted_address ou outros campos Google em banco/log/storage. Labels recebidos ao vivo podem ser exibidos na seleção com atribuição, apenas em memória da tela, sem transformá-los em endereço cadastral automático. Candidatos de 15 minutos armazenam somente id/ator/escopo/hash do endereço próprio/lat/lng/placeId/expiração. O catálogo compartilhado não usa a exceção de retenção indefinida isolada por usuário.
- C2 aceita: antes da permissão, informar que a posição será usada nesta busca. Ação Todas/Parar de usar localização cancela aquisição pendente por geração, remove posição/accuracy/timestamp/marker e limpa queries de proximidade/mapa que a contenham. Não alegar revogação da permissão do sistema; oferecer orientação para alterá-la. Páginas públicas de termos/privacidade e links Google Maps devem estar acessíveis, com seção fiel ao processamento real; revisão do responsável pelo produto antes de chamadas reais em produção. Não prometer nova política jurídica validada pelo simples uso de template.
- C3 aceita: índice de vencimento; sweep oportunista limitado a 100 linhas por execução, timeout de 100ms e bloqueios ignorados quando suportado pelo padrão SQL. Elegibilidade por validade no próprio SELECT, sem confiar em job. Limpeza global não é pré-condição da busca textual: quando manutenção estiver indisponível, não usar/emitir coordenadas Google, comunicar indisponibilidade da proximidade e conservar a consulta textual de dados próprios. Jobs processam lotes limitados e registram contagens/saúde sem posições ou PII.

## Resoluções da revisão — experiência

- U1 aceita: proprietário tem estado legível e ação Revisar localização na gestão da unidade. Copy: “Sua barbearia continua disponível na busca por nome/endereço. Confirme a localização para voltar a aparecer nas buscas por proximidade.” Diferenciar ponto que exige revisão de indisponibilidade do serviço; não criar notificações novas.
- U2 aceita: mostrar captura às HH:mm, precisão estimada quando fornecida e Atualizar localização. Validade da captura nesta sessão: 10 minutos medidos por relógio monotônico; retornar do background invalida a captura para novas consultas. Não consultar com posição antiga como atual: estado Atualize sua localização, mantendo modo/raio/texto visíveis e alternativa explícita de busca textual. Não trocar filtros/ponto silenciosamente.

Essas resoluções refinam contratos sem alterar UX/provedor aprovados. Próxima etapa: árbitro e plano executável para aceite antes da execução.

Fonte operacional verificada: https://vercel.com/docs/cron-jobs/usage-and-pricing — Hobby permite uma execução diária, com precisão por hora. Não exigir plano Pro ou scheduler pago sem decisão explícita; a margem de 5 dias e a limpeza oportunista fazem parte da solução.
