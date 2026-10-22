# Plano conjunto: agendamento confiável, fotos e avaliações

## Escopo e sequência

1. Corrigir horários vencidos, atualização de disponibilidade e disputa entre clientes. Implementação autorizada nesta solicitação.
2. Implementar fotos de usuários, logo e galeria das barbearias; adicionar link opcional do Google. Planejamento solicitado, execução posterior.
3. Implementar avaliações próprias vinculadas a atendimentos concluídos. Planejamento solicitado, execução posterior.

Não haverá importação de notas/comentários do Google, sincronização com Google Reviews nem dependência de uma nova API Google para avaliações.

## Diagnóstico confirmado

### Agendamento

- A API publicada em 22/10/2026 devolveu **18 slots para 21/10/2026, todos anteriores ao próprio `serverTime` da resposta**. Consulta pública, sem criação de reserva. A resposta tinha `Cache-Control: public, must-revalidate, max-age=0`.
- `CalculateAvailabilityUseCase` gerava intervalos do expediente, bloqueios e reservas, sem filtrar início no passado. O controller acrescentava um horário de servidor depois do cálculo.
- `useBookingFlow` repassava todos os slots recebidos e não atualizava a lista periodicamente. `BookingSlotPicker` calculava o carrossel pelo relógio/fuso do aparelho e memorizava as datas até desmontar.
- Invalidação de cache após criação existe, mas alcança a instância local do Query Client. Não avisa automaticamente o navegador de outro cliente.
- A criação já possui verificação de passado e locks por unidade/profissional. É necessário provar concorrência em PostgreSQL real, não inferir exclusividade da existência de um check de sobreposição.
- `findOverlapping` misturava comparação de instantes canônicos com um fallback de horários civis comparados às horas UTC da solicitação. Isso podia bloquear horários livres. A leitura de disponibilidade usava data/horário civil da outra reserva, inadequado para um profissional em unidades/fusos distintos.
- O hook tratava qualquer erro com `requestId` como incerto antes de examinar `SLOT_UNAVAILABLE`. Um conflito definitivo podia desviar o cliente para recuperação indevida.

### Fotos e identificação

- Existem `users.avatarUrl` e `barbershops.avatarUrl` no schema, domínio e parte das projeções HTTP.
- A descoberta já renderiza a imagem da barbearia quando recebe `avatarUrl`; há fallbacks com iniciais/ícones.
- Não foi encontrado fluxo completo de upload/processamento/remoção, galeria persistida, serviço de armazenamento de imagens ou contratos de avaliações na main inspecionada.
- Aceitar uma URL no cadastro não comprova que o usuário consegue selecionar uma foto do aparelho e publicá-la com segurança.

## Fase 1 — disponibilidade e confirmação confiáveis

### Backend

- Usar o relógio do PostgreSQL para a resposta de disponibilidade; excluir todo slot com `start <= serverTime` após carregar expediente e ocupação.
- Retornar `slots`, `serverTime` e `timezone`, incluindo respostas vazias. Desabilitar cache HTTP para disponibilidade, inclusive falhas.
- Consultar conflitos pelo intervalo real do dia na unidade e pelos instantes da reserva, globalmente por profissional. Converter registros legados com o próprio fuso; reservar o fallback para campos canônicos ausentes.
- Preservar cancelamento como liberação de ocupação. Estados desconhecidos continuam bloqueando por segurança, conforme regra atual.
- Reutilizar os locks e o ledger existentes. Propagar ao caso de uso de criação o relógio capturado após aquisição dos locks pelo fluxo idempotente.
- Preservar duração/preço autoritativos, serviços múltiplos, jornada INHERIT/CUSTOM/CLOSED e bloqueios. Alterar seleção visual não substitui a rejeição transacional no backend.

### Frontend

- Sincronizar pelo `serverTime`, com referência monotônica, geração de sessão e expiração; não usar a hora configurada pelo cliente como autoridade.
- Excluir slots vencidos enquanto a tela permanece aberta e limpar seleção vencida/ocupada. Recuar da revisão para a escolha de horário com explicação.
- Gerar datas pelo dia civil da unidade. Uma data provisória do aparelho pode iniciar somente a consulta que obtém o relógio; não autoriza uma seleção.
- Atualizar disponibilidade a cada 15 segundos enquanto o cliente escolhe/revisa, além de foco, reconexão e retorno do aplicativo. Não prometer atualização instantânea sem transporte em tempo real.
- Atualizar novamente antes de criar uma tentativa. Em falha de leitura, impedir envio e preservar os serviços. Em disputa após essa leitura, tratar HTTP 409 como conflito definitivo e solicitar outra seleção.
- Preservar o tratamento de resultado incerto para timeout/resposta perdida após uma mutação; nunca repetir uma criação automaticamente.
- Manter o visual, tokens e componentes atuais. Mensagens e indisponibilidade usam os componentes existentes.

### Aceite e testes

- Às 18h57, nenhum horário anterior ou igual pode ser oferecido para aquele dia. No encerramento do expediente, lista vazia e próxima data acessível.
- Cobrir limite exato, data anterior, futuro, virada do dia, fuso diferente do aparelho e relógio local adiantado/atrasado.
- Duas sessões podem visualizar uma oferta ao mesmo tempo; a oferta não é uma reserva temporária. Ao confirmar simultaneamente, somente uma criação deve persistir e a outra deve receber conflito.
- Provar idempotência da vencedora e desaparecimento de todos os slots que sobrepõem a duração ocupada. Testar o intervalo adjacente, cancelamento e profissional em outra unidade/fuso.
- Provar com HTTP e PostgreSQL descartável. No frontend, testar hooks reais com QueryClient independente por sessão e transporte controlado; testar calendário renderizado.
- Homologar posteriormente o fluxo publicado com duas sessões. Não criar reservas nem publicar correções em produção sem autorização específica.

## Fase 2 — perfil visual, logo, galeria e link externo

### Experiência

- Conta de cliente, barbeiro e proprietário: selecionar, pré-visualizar, recortar, substituir e remover a própria foto. Sem foto, manter o fallback atual.
- Proprietário ativo: gerenciar o logo da unidade e até **10 fotos do espaço** como limite inicial proposto. Escolher capa, ordenar e excluir fotos.
- Catálogo: logo separado da capa; galeria com navegação acessível. Descoberta usa o logo/capa disponível sem acrescentar cards opacos ou alterar a identidade visual.
- Equipe, perfil, reservas e seleção de profissional reutilizam a imagem do usuário quando o contrato permitir; não expor informações de contato privadas para identificar pessoas.
- Interface web/mobile com os mesmos tokens, fontes, cores Obsidian/Crimson/Ivory e contratos do `LiquidGlassView`. Não trocar a cor principal por dourado.
- Foto e link externo são opcionais; ausência não bloqueia cadastro, catálogo ou agendamento.

### Dados e API propostos

- Reutilizar `users.avatarUrl` para a foto pessoal e `barbershops.avatarUrl` para o logo, mantendo compatibilidade de leitura.
- Criar registro de mídia com chave de objeto, dono, finalidade, estado, MIME verificado, dimensões e tamanho. URLs públicas derivadas do armazenamento; não aceitar chave de outro usuário/unidade.
- Criar galeria da unidade com referência de mídia, posição, descrição acessível e indicação de capa. Alteração de ordem/capa deve ser atômica e versionada.
- Contratos propostos: iniciar upload, finalizar/verificar arquivo, associar ao perfil/unidade e remover associação. Uma tentativa repetida não cria objetos/associações duplicados.
- Listagem pública de fotos deve ser paginada/limitada. Catálogo e descoberta recebem apenas a projeção necessária; o grid não baixa originais de alta resolução.
- Rotas de edição exigem usuário autenticado e autorização backend. Proprietário só altera unidade com vínculo OWNER ativo. Não permitir troca de foto de outra pessoa apenas por ser proprietário.

### Arquivos e armazenamento

- Antes de implementar, confirmar provedor de armazenamento disponível, conta responsável, custos/quotas e ambientes. Não contratar serviço ou depender do disco local/serverless da API.
- Usar armazenamento de objetos com autorização temporária ou proxy já existente, se houver. Validar no backend a conclusão antes de tornar a imagem pública.
- JPEG, PNG e WebP como formatos iniciais. Definir conversão de HEIC na seleção para iPhone ou recusa explícita antes do envio; não prometer suporte sem teste.
- Limite inicial proposto: **5 MB por avatar/logo e 10 MB por foto do espaço**, com limite de pixels após decodificação. Produzir versões reduzidas e remover EXIF/GPS.
- Validar conteúdo real, dimensão e decodificação; não confiar em extensão ou MIME informado. Não aceitar SVG/HTML como imagem de usuário nesta fase.
- Upload incompleto não substitui a foto atual. Remover associação primeiro e limpar objetos sem referências de forma segura; não excluir objeto reutilizado por outra associação.
- Testar falha de upload, arquivo inválido, excesso de tamanho, expiração, troca concorrente, remoção, autorização entre tenants e limpeza de órfãos. Não registrar imagem/documentos pessoais nos logs.

### Link opcional do Google

- Campo de URL do perfil público do estabelecimento no Google/Maps, independente da geolocalização e do Place ID usados pelo produto.
- Validar HTTPS e formatos de compartilhamento Google suportados; abrir externamente com proteção de navegação. Não buscar metadados de uma URL arbitrária no servidor.
- Exibir “Ver perfil no Google” apenas quando houver URL válida. Permitir editar/remover. Não apresentar nota Google nem mesclar notas externas com avaliações próprias.

### Aceite

- Usuário publica/substitui/remove a própria imagem e vê a atualização nos pontos autorizados após invalidar cache.
- Proprietário publica logo e fotos ordenadas; outro tenant não consegue alterá-las. Falha de processamento preserva a imagem anterior.
- Web, Android e iOS devem ter validação própria da seleção, permissões e formatos. Export web sozinho não aprova upload nativo.

## Fase 3 — avaliações verificadas do Smart Barber

### Regras propostas

- Somente o cliente beneficiário de um atendimento **COMPLETED** pode avaliar a unidade daquela reserva.
- Uma avaliação por reserva concluída, com nota inteira **1 a 5** e comentário opcional de até **1.000 caracteres**, como limites iniciais propostos.
- Não aceitar avaliações de reservas futuras, canceladas, no-show ou de outro cliente. Proprietário/equipe não avaliam a própria unidade, mesmo utilizando uma conta com acesso ao fluxo pessoal.
- Cliente pode editar/remover a própria avaliação conforme política definida antes de executar a fase. Proprietário não altera nota nem exclui crítica legítima; denúncia e moderação têm trilha auditável.
- Sem avaliações: mostrar “Ainda sem avaliações”, sem inventar nota, depoimento ou volume. Contagem e média usam apenas avaliações publicadas.

### Persistência e integração

- Tabela vinculada a `bookingId`, `barbershopId` e `customerId`, com unicidade por reserva, status de publicação, versão e datas.
- Validar elegibilidade e persistir em transação. Concorrência/reenvio não duplicam avaliação; edição usa versão esperada.
- Expor média e quantidade no catálogo/descoberta e lista paginada no detalhe, com ordenação determinística.
- Projeção pública mínima: nome de exibição, foto autorizada, nota, comentário e data. Sem e-mail, CPF, telefone ou dados privados da reserva.
- Acesso à avaliação a partir da reserva concluída e do catálogo. Manter fonte explícita “Avaliações no Smart Barber”.
- Migração aditiva com índices para unidade, publicação, data e reserva. Definir comportamento quando conta, mídia, reserva ou unidade forem removidas/desativadas.

### Aceite

- Cliente com atendimento concluído consegue avaliar uma vez; casos inelegíveis são recusados pela API.
- Dois envios simultâneos não geram duas avaliações. Média/contagem permanecem corretas após edição, remoção e moderação.
- Testar isolamento entre unidades, XSS em texto, limites, paginação, acesso indevido e estados sem avaliações.

## Dependências e gates de entrega

- Fase 1 não depende de fotos, Google Maps ou armazenamento novo.
- Fase 2 exige escolha/configuração de armazenamento e autorização para implementar/publicar; não exige API de avaliações Google.
- Fase 3 exige regras finais de edição/moderação e integra com o estado canônico da reserva; a avaliação não pode depender de um flag enviado pelo frontend.
- Cada fase deve entregar diff revisável, Swagger/contratos atualizados, testes pertinentes e relatório separado de evidência local, HTTP/PostgreSQL, navegador, dispositivo e produção.
- Commit, push, PR, merge e deploy continuam sujeitos à autorização específica do responsável. Esta solicitação autoriza correção local da Fase 1 e planejamento das demais.
