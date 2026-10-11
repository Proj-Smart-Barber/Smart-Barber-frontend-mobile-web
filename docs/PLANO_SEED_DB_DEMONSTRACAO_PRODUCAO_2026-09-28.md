# Plano de seed DB para demonstração isolada em produção

**Data da análise:** 28/09/2026  
**Escopo desta entrega:** planejamento; nenhum script, migração ou dado foi alterado ou executado.  
**Decisão atualizada:** criar duas barbearias fictícias de demonstração e oito contas individuais para integrantes da organização GitHub, com catálogo, jornadas, exceções, clientes e reservas sintéticos em produção. Usar homologação para testes destrutivos; as duas unidades demo também permitem verificações controladas de isolamento em produção.

## 1. Base verificada e limites da análise

Inspeção estática dos checkouts locais, sem conexão com a API implantada ou com o banco de produção:

| Repositório | Branch / HEAD inspecionado | Fonte principal |
| --- | --- | --- |
| API: `D:\smart_barber\api` | `feat/catalogo-servicos-agendamento` / `02f8956273926893c1f21fdc872d0da8e2367e3a` | `src/infra/drizzle/schema.ts`, `src/infra/http/routes`, `src/infra/drizzle/seed.ts`, casos de uso e repositórios |
| Frontend: `D:\smart_barber\Smart-Barber-frontend-mobile-web` | `feat/catalogo-servicos-agendamento` / `6d5b9a8039d59a5737c41c8c09a5e30da855a229` | `src/features/{auth,barbershop,services,availability,agenda,dashboard}` e rotas Expo |

Antes de codificar ou aplicar o seed, confirmar que **esses commits, suas migrações e contratos estão efetivamente publicados em produção**. A existência no checkout não prova o estado implantado.

### Funcionalidades efetivamente conectadas hoje

| Jornada | API / armazenamento | Frontend / expectativa do seed |
| --- | --- | --- |
| Cadastro, login e sessão de staff | `POST /api/staffs`, `POST /api/staffs/sessions/auth`, `GET /api/staffs/me`, `GET /api/staffs/me/barbershops`; `staffs` + `membership` | Login de proprietário e barbeiros; restauração da sessão; descoberta da unidade vinculada. Cadastro é fluxo a testar em homologação, pois o seed não exercita o `POST`. |
| Unidade | `POST /api/barbershops`, `GET /api/barbershops/:shopId`; `barbershops` | Proprietário encontra unidade demonstrativa; catálogo público mostra nome/localização. A criação via formulário não é comprovada por uma linha semeada. |
| Catálogo | `GET/POST /api/barbershops/:shopId/services`, `GET/PATCH /:serviceId`, `PATCH /:serviceId/activation`; `services` | Catálogo público só com ativos; gestão do proprietário com ativos/inativos, edição e alternância de estado; paginação API. |
| Jornada e exceções | `GET/PUT /schedules`, `GET/POST/PATCH/DELETE /schedule-exceptions`; `barbershop_schedules`, `schedule_exceptions` | Exibir/editar jornada geral e exceções; API também aceita jornada por profissional. |
| Disponibilidade | `GET /availability?date=&serviceIds=&barbermanId=` | Seleção de um ou mais serviços e cálculo de duração; horários afetados por jornada/exceções. **As reservas persistidas não bloqueiam horários**, porque a factory usa `InMemoryBookingsRepository`. |
| Agenda e painel | `GET /api/bookings/barberman/schedule/details?date=`, `DELETE /api/bookings/:bookingId/cancel`; `bookings` → carrinho → item → cliente/serviço | Reservas do **staff autenticado**, não agenda consolidada do proprietário; cancelamento apaga a reserva. O painel calcula soma de serviços agendados, não receita recebida; metas/comissões/ocupação/status concluído não vêm da API. |
| Catálogo do cliente | leitura pública por UUID da unidade | Seleção múltipla e soma de preço/duração, seguida de modal informativo; ainda não confirma reserva. |

### Bloqueios que o seed não resolve

1. `shopping_carts.service_item_id` aponta para **um único** `service_items`; uma reserva persistida não consegue representar vários serviços hoje. A lista `services[]` retornada no detalhe contém um único item. Não fabricar uma reserva com vários serviços nem duplicar reservas para simular combo. É possível cadastrar um **combo como um serviço único**, identificado como tal.
2. A disponibilidade usa reservas em memória, apesar de agenda e cancelamento lerem/gravarem no PostgreSQL. Portanto, testar colisão entre reserva semeada e slot calculado deve resultar em **gap conhecido**, não em aceite do seed.
3. Não há rota de criação de reserva nem autenticação/fluxo de cliente no frontend. Clientes, carrinhos e reservas da demonstração serão criados apenas pelo seed; não descrevê-los como reservas concluídas pelo app.
4. `bookings` não tem status/pagamento/check-in. Cancelar remove a reserva e notificações vinculadas; não existe estado persistido `CANCELLED`, `COMPLETED` ou `NO_SHOW` para semear.
5. `notifications` existe no esquema, mas não há rota ou tela de notificações nas rotas inspecionadas. Dados nessa tabela não demonstram uma funcionalidade visível.
6. A migração do catálogo só torna `services.barbershop_id` obrigatório se não restarem serviços legados sem unidade. Verificar a nulabilidade e a migração real antes de executar.

## 2. Conjunto de dados proposto

**Namespace:** `demo-smart-barber-v1` em registro de execução do seed e nos identificadores estáveis, com subchaves `horizonte` e `estacao`; nome e slug visíveis devem indicar “Demonstração”. Não associar registros a unidades reais. As duas unidades permanecem separadas por `barbershop_id`; os dados de clientes, carrinhos e reservas também devem ser atribuíveis inequivocamente a uma delas pelo encadeamento das FKs.

| Entidade | Quantidade inicial | Dados/cenários |
| --- | ---: | --- |
| `staffs` | 8 | Uma conta individual para cada um dos oito integrantes confirmados da organização GitHub; quatro por barbearia, com login `example.com` exclusivo e senha individual gerada fora do código. Não usar e-mail pessoal do GitHub. |
| `barbershops` | 2 | “Barbearia Horizonte — Demonstração” (São Paulo/SP) e “Barbearia Estação — Demonstração” (Campinas/SP), ambas com localização explicitamente fictícia, `America/Sao_Paulo`, `ACTIVE`, slug/CNPJ de teste distintos. |
| `membership` | 8 | Em cada unidade, 1 `OWNER` que também atende e 3 `BARBERMAN`; `owner_id` consistente com o respectivo membro `OWNER`. Um integrante/conta pertence a apenas uma unidade para deixar o teste de isolamento inequívoco. |
| `barbershop_schedules` | 40–54 | Jornada geral e jornadas de cada um dos 4 profissionais por unidade. Horizonte: seg–sex 09:00–18:00 e sábado 09:00–14:00; Estação: ter–sex 10:00–19:00 e sábado 09:00–16:00. Domingo sem jornada; profissionais com folgas diferentes. Proprietário que atende precisa de jornada própria para consultas por `barbermanId`. |
| `services` | 14 | 7 por unidade: 6 ativos e 1 inativo, com preços/descrições diferenciados; durações/preços em centavos. Uma oferta combo é **um** serviço. |
| `customers` | 10–12 | Perfis fictícios variados e distintos por unidade, sem contatos roteáveis; CPF de teste exclusivo, senhas aleatórias não compartilhadas, pois não há login de cliente. |
| `service_items` + `shopping_carts` | 1 par por reserva | Snapshot de título/preço/duração, `total_price_in_cents` igual ao snapshot; um serviço por carrinho, conforme o esquema atual. |
| `bookings` | 18–24 | Em cada unidade: hoje pelo menos 1 reserva por conta; 2 em dias próximos, 1 histórico recente e 1 reserva **descartável** para cancelamento. Sem sobreposição por profissional e dentro da jornada, fora de exceções. |
| `schedule_exceptions` | 4–6 | Por unidade: 1 bloqueio parcial geral, 1 ausência de dia inteiro de um barbeiro e, se útil, 1 exceção parcial de outro; datas futuras próximas sem choque com as reservas. |
| `notifications` | 0–2 | Opcional: somente registro histórico de demonstração com `sent_at` e `read_at` preenchidos, nunca pendente para disparo real. Não incluí-lo na cobertura funcional da UI. |

**Cardápio fictício inicial da Horizonte:** Corte clássico (30 min, R$ 45), Degradê (45 min, R$ 55), Barba com toalha quente (30 min, R$ 40), Sobrancelha (15 min, R$ 20), Acabamento (15 min, R$ 25), Corte + barba (60 min, R$ 80, serviço único), Pigmentação de barba (45 min, R$ 65, **inativo**). A Estação terá os mesmos tipos básicos com títulos/descrições próprios, preços diferentes e ao menos uma duração diferente, para detectar mistura acidental entre catálogos. Descrições devem explicar o atendimento em uma frase, sem promessa médica ou marcas. São **valores sintéticos de teste**, sujeitos à revisão do produto. A escolha de corte/barba/sobrancelha e a ordem de grandeza de tempos/valores se apoiam em cardápios públicos da [Barbearia Black](https://www.blackbarbearia.com/book-online) e do [Marinho Barbearia](https://marinhobarbearia.com/servicos.html); o [Sebrae](https://bibliotecas.sebrae.com.br/chronus/ARQUIVOS_CHRONUS/IDEIAS_DE_NEGOCIO/PDFS/ideia-de-negocio_barbearia.pdf) destaca a variação de serviços e posicionamento de preços entre barbearias. Nenhum nome, contato ou endereço real dessas fontes integra o fixture.

**Cardápio fictício da Estação:** Corte social (35 min, R$ 50), Degradê (45 min, R$ 60), Barba express (20 min, R$ 35), Sobrancelha (15 min, R$ 18), Acabamento (15 min, R$ 22), Corte + barba (60 min, R$ 85, serviço único), Hidratação capilar (30 min, R$ 45, **inativo**).

### Oito acessos de teste e entrega das credenciais

Uma conta por integrante, sem reaproveitar e-mails ou senhas pessoais do GitHub. Em 28/09/2026, `gh api orgs/Proj-Smart-Barber/members --paginate` retornou os oito `@logins` abaixo; `gh api users/{login}` forneceu os nomes públicos. A listagem de membros é a que a API expôs nesta consulta; conferir novamente antes de aplicar, caso a equipe mude. As vagas abaixo são parte do plano, **não são contas já criadas**. A atribuição `OWNER`/`BARBERMAN` é apenas para testar permissões no sistema, sem refletir hierarquia real do GitHub.

| Vaga | Integrante GitHub / nome exibido | Unidade | Papel no sistema | Login planejado |
| --- | --- | --- | --- | --- |
| 01 | `@wellingtonspdev` / Wellington Siqueira Porto | Horizonte | `OWNER` | `demo.wellingtonspdev@example.com` |
| 02 | `@Arthuranjo` / Arthur dos anjos | Horizonte | `BARBERMAN` | `demo.arthuranjo@example.com` |
| 03 | `@Bruxx092` / Pedro Silva | Horizonte | `BARBERMAN` | `demo.bruxx092@example.com` |
| 04 | `@d-Jhon-b` / Jhon Deyvid Quispe Mamani | Horizonte | `BARBERMAN` | `demo.d-jhon-b@example.com` |
| 05 | `@AlvaroSena` / Alvaro Sena | Estação | `OWNER` | `demo.alvarosena@example.com` |
| 06 | `@Carlos-Leon3l` / Carlos Leonel | Estação | `BARBERMAN` | `demo.carlos-leon3l@example.com` |
| 07 | `@FelipeRCod` / Felipe Rocha | Estação | `BARBERMAN` | `demo.felipercod@example.com` |
| 08 | `@kaua-hiro` / Kauã Hiro | Estação | `BARBERMAN` | `demo.kaua-hiro@example.com` |

Na implementação, reconferir nomes/`@logins`, gerar **oito senhas fortes e diferentes** com gerador criptográfico, armazenar apenas hashes no banco e distribuir o par login/senha individualmente por cofre ou canal aprovado da equipe após o apply. O manifesto operacional pode listar pessoa, login, papel, unidade, UUID e status de entrega, **sem senha**. Prever rotação/revogação de cada conta sem afetar as demais, e nunca incluir senhas em Git, issue, log, print ou documento do plano. Credenciais só serão válidas quando o seed for implementado e aplicado; não apresentar exemplos de senha como acesso funcional. Cada pessoa testa os fluxos de seu papel; catálogos públicos podem ser testados por todos. Testes de proprietário por todos os integrantes exigiriam mais unidades ou troca controlada de papéis em homologação.

**Coerência de datas:** calcular o “hoje” da unidade em `America/Sao_Paulo`, gerar datas de reserva no calendário local e gravar `bookings.date` conforme a convenção UTC usada pelas consultas atuais (meia-noite UTC da data `YYYY-MM-DD`). Garantir `end_time - start_time = duration_in_minutes_snapshot`, usar incrementos de 30 min para o cálculo de disponibilidade, não criar reservas após o fechamento e não semear exceções que bloqueiem as reservas normais. Escolher dias futuros dentro da navegação de ±90 dias da agenda. Guardar no manifesto as datas concretas geradas para facilitar conferência.

**Privacidade e credenciais:** somente os nomes públicos dos integrantes serão reais, conforme solicitação; todo o restante é inventado e marcado como demo. E-mails em domínio reservado `example.com`; telefones de teste sem entrega de SMS/WhatsApp e sem aparência de contato utilizável; CPFs/CNPJ apenas identificadores sintéticos compatíveis com os campos atuais, validados quanto a formato/colisão antes de aplicar. Não usar fotos, endereços, contatos ou documentos de pessoas reais. Gerar segredos de staff por conta em cofre/variável segura, fazer hash com o componente de senha existente e nunca registrar senha/token/hash no log. Para clientes sem login, gerar segredo aleatório descartável e armazenar apenas o hash. Desativar destinos de mensagens externas no ambiente da demonstração; se não houver isolamento por tenant, omitir notificações.

## 3. Rotina de implementação planejada na API

1. **Preflight sem escrita.** Validar conexão/identidade do banco e ambiente alvo (host, database, branch do provedor, fingerprint sem credencial); versão das migrações, esquema real e nulabilidade; ausência de colisões de slug, e-mail, CPF/CNPJ e UUIDs; existência de backup recuperável e ensaio de restauração. Comparar a API implantada com o contrato esperado. Parar diante de divergência.
2. **Criar comando próprio**, por exemplo `db:seed:demo:dry-run` e `db:seed:demo:apply`, em arquivo separado do seed local legado. A execução padrão faz somente dry run. Produção requer alvo explícito, allowlist de identidade do banco e confirmação operacional separada no momento da execução. Nunca reutilizar `npm run db:seed`: hoje esse comando chama `src/infra/drizzle/seed.ts`, que executa `DELETE` sem `WHERE` em todas as 11 tabelas e utiliza senha fixa `123456`.
3. **Manifesto/registro de propriedade.** Adicionar um registro de fixture (`seed_registry` em migração pequena ou equivalente persistente) contendo namespace, versão, chave lógica, tabela, UUID e execução; registrar só linhas criadas pelo seed. Resolver IDs por chaves lógicas estáveis e verificar se a linha encontrada ainda pertence ao namespace/unidade. Não “adotar” dado preexistente por coincidência de nome. Alternativa sem migração: UUIDs determinísticos com namespace e manifesto persistido fora do banco, mas confirmar como esse manifesto será auditável e restaurado.
4. **Inserção transacional.** Em ordem de FKs: `staffs` → `barbershops` → `membership` → jornadas → clientes/serviços → `service_items` → `shopping_carts` → `bookings` → exceções → eventual notificação histórica → registro. Usar `INSERT ... ON CONFLICT` somente nas chaves próprias e rollback integral em qualquer falha. Não fazer `TRUNCATE`/limpeza global, não alterar registros reais, não atualizar fixtures editados manualmente sem relatório de conflito e modo específico de reconciliação.
5. **Dois grupos de fixture.** Base estável (contas, unidade, serviços, jornadas) deve ser idempotente e permanecer igual em reaplicações. Cenários consumíveis (reserva de cancelamento, serviço para editar/desativar, exceção descartável) recebem chaves separadas; um novo dry run informa que foram consumidos. Recriação só via operação explícita `replenish` limitada ao namespace, sem ressuscitar automaticamente reservas canceladas nem sobrescrever alterações humanas.
6. **Datas móveis controladas.** O dry run mostra o plano de datas de acordo com o fuso; o apply registra a data-base e IDs. Em execuções posteriores, não deslocar silenciosamente reservas históricas para “hoje”. Criar uma operação explícita de refresh de agenda demo, que adicione uma nova coorte de datas e trate apenas fixtures identificadas; política de retenção/limpeza da coorte antiga precisa de aprovação operacional própria.
7. **Relatório e reversão.** Exibir totais previstos/criados/reaproveitados/conflitantes por tabela, IDs da unidade, datas de teste e contagem geral antes/depois; sem credenciais ou PII. Preparar script de desfazer por IDs do registro, com preview e ordem inversa de FKs, incluindo alerta para qualquer referência nova criada por usuário real aos dados demo. Não executar desfazer automaticamente nem apagar dados que deixaram de ser exclusivamente do seed; usar restauração de backup quando necessário.

## 4. Matriz de verificação após implementação

Executar primeiro em banco descartável/homologação com a mesma migração; depois, na unidade demo de produção, fazer apenas verificações controladas. Definir `EXPO_PUBLIC_AVAILABILITY_SOURCE=http` e apontar o app de teste para a API do ambiente correspondente; modo `mock` não valida o seed. Dados inseridos provam integridade; comportamento HTTP/UI exige testes separados.

| Cenário | Fixture/ação | Aceite observável |
| --- | --- | --- |
| Sessão e descoberta | Entrar com as oito contas planejadas | `GET /me` e `/me/barbershops` retornam a unidade e papel esperados para cada integrante; app abre contexto certo após reinício, sem herdar a unidade do login anterior. |
| Catálogo público | Abrir `/barbershops/{shopId}/services` das duas unidades sem login | Cada unidade expõe seis ativos com título, preço, duração e descrição próprios; inativo ausente; selecionar dois soma preço/duração e mostra modal de handoff, sem confirmar reserva. |
| Gestão do catálogo | Entrar com cada proprietário | Abas exibem 7/6/1 em sua unidade; editar e alternar um serviço **descartável** reflete na API pública. Barbeiro/visitante e proprietário da outra unidade recebem proibição ao tentar operações de gestão. |
| Jornada | Abrir disponibilidade como proprietário | Jornada geral e exceções aparecem; salvar alteração em fixture descartável e recarregar mostra persistência. Jornada por profissional conferir via API. |
| Slots | Consultar 1 e 2 serviços em dia aberto, domingo/fechado e dia com exceção | Duração combinada muda slots; fechado/bloqueado retorna vazio ou intervalos restantes. **Não aprovar ocupação por reserva** até troca do repositório em memória. |
| Agenda | Entrar como cada profissional e navegar hoje/passado/futuro | Apenas suas reservas retornam com cliente, serviço e snapshot histórico; nenhum conflito de horário. Proprietário vê apenas reservas em seu próprio ID, conforme contrato atual. |
| Painel | Entrar com contas demo | Próximo atendimento e contagem/soma de serviços do próprio staff condizem com reservas do dia; não tratar soma como pagamento recebido ou receita global da unidade. |
| Cancelamento | Cancelar somente reserva marcada como descartável pelo profissional vinculado | Reserva desaparece da agenda após refetch; segundo cancelamento retorna não encontrada; outro staff não consegue cancelar. A reaplicação comum do seed não a recria. |
| Isolamento e validações | Leituras/negações entre as duas unidades demo em produção; suíte completa em homologação | Serviço alheio/inativo não passa na disponibilidade; dono de outra unidade não edita o catálogo; restrições de preço/duração e FKs funcionam. Não inserir linhas inválidas em produção. |
| Segurança do seed | Dry run, apply, apply repetido, falha forçada, alvo trocado | Dry run tem zero escritas; segunda execução não duplica; falha gera rollback; banco fora da allowlist aborta; totais/linhas externas ao namespace permanecem iguais. |

**Consultas de aceite do banco:** contar registros por tabela do namespace e por unidade; verificar FKs e `owner_id`/membership; unicidade de e-mail/CPF/CNPJ/slug; preço/duração positivos; `shopping_carts.total_price_in_cents` igual ao snapshot; cada `booking.barbershop_id` igual ao `service.barbershop_id`; `barberman_id` membro da unidade; ausência de sobreposição de reservas por profissional/data; `start_time < end_time`; reserva dentro da jornada e fora das exceções. Conferir via HTTP que o snapshot de reserva histórica não muda após editar preço/título do serviço de demonstração. Não usar testes de mutação em nenhuma das duas unidades sem fixture consumível separada.

## 5. Sequência de execução futura e critérios de conclusão

1. Confirmar implantação e migrações de produção; documentar identidade do banco e backup/restauração testada.
2. Implementar seed demonstrativo separado, registro de propriedade, dry run, apply e testes de integridade/idempotência em ambiente descartável.
3. Executar suíte HTTP/UI em homologação, incluindo as duas unidades, as oito contas, erros de autorização, cancelamento e datas/fuso; registrar os gaps de reserva múltipla e disponibilidade persistida.
4. Gerar preview completo para produção: IDs, contagens, datas, estimativa de escritas e plano de desfazer; obter autorização operacional para a execução real.
5. Aplicar uma vez nas duas unidades demo de produção, validar as oito contas, contagens e fluxos de leitura/login/catálogo/agenda/painel, e executar mutações somente nos fixtures descartáveis previstos.
6. Guardar manifesto, resultado da execução, diffs de contagem e checklist. Considerar concluído quando dry run for sem escrita, apply for idempotente, nenhuma linha real mudar, fixtures aparecerem nas jornadas esperadas e limites conhecidos estiverem registrados como pendências funcionais.

**Fora do escopo deste seed:** implementar reserva pelo cliente, suporte real a múltiplos itens por reserva, corrigir disponibilidade/agenda global, pagamentos, métricas financeiras, entrega de notificações ou dados reais de clientes. Esses itens exigem mudanças de produto/API e testes próprios; o seed serve para demonstrar o que já está implementado e revelar seus limites.
