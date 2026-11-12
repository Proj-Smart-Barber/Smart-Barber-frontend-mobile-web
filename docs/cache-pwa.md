# Cache, PWA e ciclo de sessão

Implementação local de 11/11/2026. As políticas abaixo não substituem a autorização e a cotação do servidor.

## Dados de tela

TanStack Query continua sendo o estado remoto. Catálogo público e reserva compartilham opções de retenção: atualização em 2 minutos e retenção pública de 30 minutos. A hidratação termina antes das telas iniciarem suas queries. O snapshot guarda `dataUpdatedAt`; uma resposta de rede mais recente não é sobrescrita pelo disco.

Persistência pública: IndexedDB na web e AsyncStorage no native. São usados `dehydrate`/`hydrate` da versão instalada do TanStack, com envelope versionado e projeção própria, sem persistir mutations. Limites: 20 queries, 100 itens por coleção e 256 KiB em UTF-8, com descarte dos snapshots menos recentes para caber no orçamento.

A allowlist contém somente unidade pública, catálogo público de serviços e lista pública de profissionais. Campos são projetados tanto ao salvar quanto ao restaurar. CNPJ, owner ID, tokens, respostas privadas, dados financeiros, geolocalização, URLs assinadas e metadados de autorização não entram no snapshot. A versão atual do envelope é `2026-11-11-v2`.

`EXPO_PUBLIC_ENABLE_PUBLIC_CACHE=false` desliga hidratação/persistência. Alterações de configuração pública exigem novo bundle.

## Invalidação e sessão

Mudanças de serviços, equipe, mídia, unidade, avaliações e moderação atualizam catálogo/descoberta/Explorar. Reservas atualizam lista pessoal, próximo horário, detalhe, unidade, disponibilidade e financeiro. Reagendamento invalida os consumidores da unidade e horários afetados.

Contexto privado inclui ator/unidade/papel. Trocas de contexto cancelam/limpam caches incompatíveis. As páginas acumuladas da agenda são ocultadas já no primeiro render de um novo escopo, antes dos efeitos de limpeza. Logout é local imediato e sincronizado entre abas, com BroadcastChannel e fallback por evento de storage. Refresh antigo e logout remoto atrasado não podem sobrescrever uma sessão nova. Escritas de sessão são serializadas e verificam geração.

A restauração inicial conserva as projeções públicas, que são independentes da sessão, enquanto remove queries privadas anteriores. Nenhum hint de sessão libera conteúdo privado offline.

## Rede e apresentação

Conectividade/foco usam eventos web e NetInfo 12.0.1/AppState no native, compatíveis com o SDK Expo já existente. Não houve atualização de SDK. Disponibilidade consulta somente a etapa ativa, usa polling com jitter e backoff limitado e continua revalidando antes da escrita. Cancelamento do chamador mantém `ApiError` com código `REQUEST_CANCELLED`, separado de timeout.

Catálogo salvo permanece visível durante erro/rede indisponível, com indicação de atualização. Avaliações ainda não consultadas não são apresentadas como uma lista vazia confirmada. Poster e reprodução manual são usados quando a API de rede indica economia/conexão limitada. `EXPO_PUBLIC_DATA_SAVER=true` permite ativação explícita; plataformas sem detecção usam o comportamento padrão e controles manuais existentes.

Reserva, reagendamento, recebimento e demais escritas continuam online e idempotentes. Não existe uma nova fila genérica de confirmação offline.

## Shell PWA

`npm run build` exporta web e executa `scripts/prepare-pwa.mjs`. Esse passo calcula a versão a partir do HTML e do source do worker e inclui assets de bootstrap com hash. Builds manuais com outro destino precisam executar `node scripts/prepare-pwa.mjs <destino>` depois do export.

O worker guarda somente shell estático sem credenciais e assets locais permitidos. Assets têm limite de 80 entradas/20 MiB por cache; um arquivo acima de 6 MiB não entra. O bundle de bootstrap é protegido contra expulsão por imagens de runtime. O shell usado como fallback tem validade de até 7 dias. HTML específico de rotas privadas nunca é salvo. APIs, requisições com bearer, URLs com query, escritas e fluxos de token são excluídos.

Assets carregados pela página antes da ativação inicial podem ser aquecidos por mensagem validada, com orçamento de 40 URLs locais sem query e sem credenciais. O worker não intercepta upload, storage remoto ou URLs assinadas.

Novas versões aguardam as abas antigas fecharem; não há `skipWaiting` automático que interrompa um rascunho de reserva. A ativação remove somente caches pertencentes ao aplicativo. `EXPO_PUBLIC_ENABLE_PWA_CACHE=false` desliga o registro e desregistra o worker correspondente; em rollback operacional, recarregar/fechar abas antigas e remover somente caches com prefixo `smartbarber-public-` se necessário. Não remover caches de outras aplicações.

## Reprodução local segura

O preview isolado é `node scripts/serve-pwa-preview.mjs .tmp/preview-dist 8087`. Ele serve somente arquivos locais e fixtures públicas sintéticas; `/api` não tem proxy publicado e escritas são recusadas. O export deve ter dotenv/telemetria desabilitados e origem local explícita, conforme as instruções do projeto.

O teste realizado no Chrome confirmou catálogo, worker controlando a página, duas queries públicas persistidas, ausência de campos privados e zero respostas API no Cache Storage. Offline e retomada funcionaram nesse ambiente. Uma amostra de reload aquecido com o preset Slow 4G registrou cerca de 488 ms até o serviço sintético aparecer. Esse valor inclui bootstrap e não é p95, medição de API real ou prova de Safari/iPhone.

O export Android comprova o bundle/Hermes e resolução de módulos; não comprova binário nativo ou dispositivo. Safari/PWA instalado, iPhone/Android físicos, atualização em homologação, cold start e metas de rede de produção permanecem aceites externos.
