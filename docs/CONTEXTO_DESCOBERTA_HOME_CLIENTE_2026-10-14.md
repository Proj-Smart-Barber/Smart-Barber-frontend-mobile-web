# Descoberta e home do cliente — contexto verificado

14/10/2026. Levantamento inicial, sem alteração de implementação.

## Base disponível

- PR frontend #32 integrado, commit e2889cf2d70490ff1e913a5dc96cd6025bb48bc9.
- PR API #53 integrado, commit cd2551137250dd309485726aaf7272b2ea6d9623.
- Os checkouts antigos ainda contêm alterações locais da entrega anterior; preservá-las. A futura execução deve usar uma base atualizada/isolada.
- Home atual em src/app/(client)/index.tsx apresenta saudação e botões Meus Agendamentos, Minhas Notificações e Sair; não oferece descoberta.
- Catálogo público existente: /barbershops/[shopId]/services, componente PublicCatalogView. Já encaminha serviceIds para /barbershops/[shopId]/book e reutiliza a jornada PERSONAL com vários serviços.
- A API possui GET /api/barbershops/:shopId e GET /api/barbershops/:shopId/professionals; não foi encontrada coleção/busca pública nas rotas e repositório consultados.
- GET /api/users/me/barbershops representa vínculos operacionais e não substitui catálogo público de unidades.
- Entidade/tabela barbershops contém name, location textual, avatarUrl, timezone, status e slug. Não contém cidade/bairro estruturados ou coordenadas.

## Restrições já estabelecidas

- Reutilizar catálogo/agendamento e componentes do design system atuais.
- Cliente precisa de conta e e-mail confirmado para reservar; descoberta não concede permissões operacionais.
- O usuário ampliou explicitamente esta entrega para incluir geolocalização em 14/10/2026; substitui a decisão anterior de deixar para o futuro.
- Confirmado pelo usuário: o proprietário informa endereço e confirma o ponto no mapa. A posição atual do aparelho não é autoridade automática da localização comercial.
- Resultados públicos devem ter projeção de dados mínima, sem necessidade de ownerId, CPF ou dados privados de contas.
- Carregamento/erro/vazio devem ser explícitos; não fabricar distância, avaliação, preço mínimo, disponibilidade ou ordenação por proximidade.
- useMyBookings oferece dados paginados; um próximo agendamento derivado apenas de páginas carregadas não deve ser apresentado como próximo absoluto sem contrato que o garanta.

## Decisões e pontos pendentes

O usuário confirmou a direção com a ampliação para geolocalização e escolheu endereço + ponto confirmado pelo proprietário. A home deve descobrir unidades próximas e manter busca por nome/trecho do endereço, entrada no catálogo existente e acessos pessoais.

Provedor confirmado pelo usuário: Google Maps, considerando o volume inicial. Não presumir chave disponível nem franquia garantida pelo número de usuários. Planejar quotas e alertas por SKU; alertas de orçamento não interrompem cobrança automaticamente.

O usuário perguntou se o Google é pago. Consulta oficial em 14/10/2026: modelo por uso e faturamento obrigatório; Dynamic Maps web tem franquia mensal de 10.000 eventos, depois US$ 7/1.000 na primeira faixa; Geocoding tem franquia mensal de 10.000 eventos, depois US$ 5/1.000 na primeira faixa. Valores em USD, por SKU, sujeitos à tabela vigente; não equivalem a custo por usuário. Captura da posição pelo aparelho não requer chamar a API paga Google Geolocation.

Decisão de experiência confirmada pelo usuário: lista como entrada principal e mapa opcional, carregado sob demanda. O desenho incremental está em DESENHO_DESCOBERTA_HOME_GEOLOCALIZACAO_2026-10-14.md.

Pesquisa UI/UX gerou sugestões genéricas de outra paleta e navegação horizontal. Essas sugestões não substituem os tokens obsidian/crimson/ivory e a navegação vertical do produto. Aproveitar acessibilidade, estados e dimensões de interação; manter o design system existente.

Propostas ainda a consolidar no desenho: obter localização do cliente por ação explícita, apenas durante o uso; busca textual como alternativa; posição pessoal transitória, sem histórico; distância em linha reta rotulada como aproximada; unidades sem coordenadas confirmadas não recebem distância inventada.

Escala inicial moderada e manutenção na arquitetura existente são premissas propostas, ainda sem medição de desempenho ou aceite técnico desta fase.

## Fontes técnicas consultadas

- Expo Location: https://docs.expo.dev/versions/latest/sdk/location/ — captura de posição e permissões em Android/iOS/web.
- MDN Geolocation: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API — contexto seguro e consentimento no navegador.
- MapLibre React Native/Expo: https://maplibre.org/maplibre-react-native/docs/setup/expo/.
- Google Geocoding/billing: https://developers.google.com/maps/documentation/geocoding/usage-and-billing.
- Preços Google por SKU: https://developers.google.com/maps/billing-and-pricing/pricing; controle de custos: https://developers.google.com/maps/billing-and-pricing/manage-costs.
- Retenção e atribuição de conteúdo: https://developers.google.com/maps/documentation/geocoding/policies e https://cloud.google.com/maps-platform/terms/maps-service-terms. Coordenadas provenientes de geocodificação não devem ser tratadas como cache permanente irrestrito; distinguir origem e política de atualização no desenho final.
- Caso seja considerado servidor público Nominatim: https://operations.osmfoundation.org/policies/nominatim/ — decisão consciente do desenvolvedor, máximo global de 1 requisição/s por aplicação, sem autocomplete, identificação/atribuição/cache e possibilidade de troca do serviço. Não é uma infraestrutura gratuita ilimitada nem foi escolhida nesta fase.
- Tiles OSM: https://operations.osmfoundation.org/policies/tiles/ — atribuição, cache e ausência de SLA; uso público não equivale a provedor contratado.
