# Smart Barber no Expo Snack

## Variante web com API real

Importe a branch `feature/expo-snack-api-producao` com o caminho
`snack/runtime` e selecione **SDK 54 → Web**. O runtime versionado nessa branch
é gerado na raiz com `node scripts/build-snack.mjs --http-web`. Execute o
gerador sem a flag para obter uma cópia mockada. A flag só ativa HTTP na Web.

Use uma conta de teste ativa, com e-mail verificado e sem acesso a dados reais
de terceiros. O login bem-sucedido registra uma sessão no backend, portanto a
validação no iframe precisa de autorização específica. Para verificar somente
o login e o perfil, basta uma conta comum dedicada. Para verificar vínculos
operacionais, use uma conta vinculada a uma barbearia de teste.

O access token vive em memória. A sessão termina ao sair, ao recarregar, no
prazo informado pela API ou quando a sessão ativa recebe um HTTP 401. A saída
limpa os dados da sessão no preview. Uma cópia do access token pode permanecer
válida no servidor até expirar.

Após gerar a variante web, rode `node scripts/verify-snack.mjs` e
`npx vitest run --config scripts/snack-tests/vitest.config.mts` para validar
os módulos gerados, a sessão com HTTP simulado e o transporte de demonstração.

### Google Maps no preview Web

O mapa usa a Maps JavaScript API no iframe `https://snack-runtime.eascdn.net`.
No Google Cloud do projeto, confirme faturamento e API habilitados. Na chave Web,
selecione a restrição de aplicativo **Sites**, permita
`https://snack-runtime.eascdn.net/*` e limite a chave à **Maps JavaScript API**.
Defina cotas compatíveis com o teste e alertas de orçamento. O domínio do iframe
é compartilhado, então a restrição de referenciador não distingue este Snack.
Confirme a autorização do responsável pela chave antes de torná-la pública.

Para configurar a chave no editor após a aprovação, abra uma cópia sob sua conta,
selecione **Web** e abra `src/shared/config/env.js`. Na propriedade
`GOOGLE_MAPS_WEB_API_KEY`, substitua a expressão pelo valor da chave Web como
uma string JavaScript. O editor e o bundle do Snack poderão expor esse valor.
Faça o teste em **Explorar → Mapa** e conceda a localização no navegador se
quiser testar o GPS. A aplicação continua exibindo a visualização de
contingência quando o SDK fica indisponível.

Para guardar a cópia na conta Expo, abra o link no desktop, entre na conta,
edite o nome para um nome novo e clique em **Save**. Se aparecer o diálogo de
publicação, escolha **Save to Profile** ou **Save to your Expo Profile**.
Confirme o endereço `snack.expo.dev/@seu-usuario/nome-do-snack` no perfil e
use esse endereço nas próximas edições.

## Objetivo e isolamento

Adaptação acadêmica do repositório https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web, baseada na `main` em `99da9f8`. Branch exclusiva: `feature/expo-snack-entrega`. **Não realizar merge sem revisão e autorização.**

O código original em `src/`, o `package.json` e o lockfile original permanecem preservados. A exclusão das pastas geradas no `tsconfig.json` evita que a execução original misture duas versões do Expo. Não foram alteradas branches existentes.

## Organização e compatibilidade

- `src/app`: Expo Router, 46 módulos de rota/layout reaproveitados; grupos auth, app, client, barber, account, public e platform.
- `src/features`: autenticação, barbearia, serviços, equipe, disponibilidade, agenda, reservas, descoberta, avaliações, financeiro, notificações e landing page.
- `src/shared`: componentes, design system, temas, transporte HTTP, armazenamento, cache e controle de operações.
- `snack-support`: configurações e implementação dos dados fictícios.
- `snack`: cópias TypeScript com imports relativos e adaptações pontuais.
- **`snack/runtime`: pasta JavaScript destinada à importação no Snack.**
- `scripts/build-snack.mjs`: geração reproduzível a partir das telas originais.
- `scripts/snack-tests`: testes da coerência dos dados demonstrativos.

A revisão original usa Expo 58, React Native 0.88.1 e React 19.3. O editor do Snack consultado oferecia SDKs 50–55, com 54 padrão. A entrega usa SDK **54**, React 19.1 e React Native 0.81.5. As bibliotecas Expo são alinhadas ao SDK 54; as bibliotecas de formulários/consulta de dados são fixadas nas versões do lockfile original. Não há NativeWind ou Axios no manifesto atual, portanto nenhuma migração dessas bibliotecas foi necessária.

Expo Router foi mantido: `ExpoRoot`, contexto estático das rotas e localização inicial `/` evitam depender de `require.context` do Metro e da URL interna do iframe do Snack. A proteção da jornada contra saída com edição não salva usa a instância de navegação do próprio Router, evitando o conflito com um segundo contexto de navegação.

O parser do Snack rejeitou sintaxe TypeScript válida (uniões de literais numéricos). O runtime recebe JavaScript transpilado com JSX preservado, sem reescrever telas. Imports de subpacotes (`@hookform/resolvers/zod` e `motion/react`) são declarados explicitamente no manifesto do runtime. Esse manifesto é específico do Snack e **não deve ser instalado com npm**; para execução local use o manifesto da pasta `snack`.

`react-native-reanimated` e `react-native-worklets` não são importados pelo código desta revisão. Não são declarados no manifesto adaptado: o bundler do Snack falhou ao resolver Worklets isoladamente. O runtime do Snack fornece suas bibliotecas internas de animação.

Imagens usam URLs dos próprios assets, fixadas no commit original; isso evita um erro observado em que o Snack tratava um PNG importado como JavaScript. Paleta, componentes, fontes Inter/Epilogue, ícones e estilos Obsidian Atelier são reaproveitados. O aviso de demonstração é a principal alteração intencional na interface.

## Abrir e importar

[Abrir o Smart Barber no Expo Snack](https://snack.expo.dev/OyOwRgsVOdtU3pQQ--78a?platform=web). Em um navegador de desktop, selecione **Web** se o preview não abrir automaticamente. A cópia publicada abriu sem login na conta Expo; as contas abaixo são do aplicativo.

1. Abra https://snack.expo.dev/ em navegador de desktop.
2. Escolha **Import Git repository** no menu do projeto.
3. Use as opções avançadas para informar separadamente:
   - Repositório: `https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web`
   - Branch: `feature/expo-snack-entrega`
   - Caminho: `snack/runtime`
4. Selecione **Expo SDK 54**. Aguarde a resolução das dependências.
5. Selecione **Web** e aguarde a tela de login.
6. Use **Save** para gerar o link compartilhável. Para manter o Snack em sua própria conta, entre na conta Expo e salve uma cópia.

O importador oficial possui campos separados de branch e subpasta. Isso evita ambiguidade causada pela barra no nome da branch. Não use a raiz da `main` nem importe o manifesto local com Expo 58.

Para Expo Go, selecione **Run on device** e use um aplicativo compatível com SDK 54. A execução nativa deve ser validada em dispositivo; um preview web funcionando não comprova Android/iOS. O Expo Go instalado na loja pode aceitar somente um SDK mais recente.

## Contas fictícias

Senha de todas as contas: **`Demo123!`**.

| Perfil | E-mail | Acesso |
|---|---|---|
| Proprietário | `dono@demo.test` | Gestão da unidade, serviços, equipe, disponibilidade, agenda, financeiro e avaliações |
| Barbeiro | `barbeiro@demo.test` | Sua jornada e seus atendimentos |
| Cliente | `cliente@demo.test` | Explorar, catálogo, reserva, perfil e seus agendamentos |

São identificadores públicos de demonstração, sem vínculo com contas reais. Não use dados pessoais reais nos formulários.

## Dados e roteiro

As operações do cliente HTTP são atendidas em memória, sem fallback para a API de produção. Os adaptadores e mapeadores originais continuam em uso. O mock de disponibilidade existente é reaproveitado; os dois profissionais fictícios começam herdando a jornada da loja.

1. Entre como proprietário. Abra Serviços e crie ou altere um serviço.
2. Abra Disponibilidade e altere a jornada. Na equipe, abra a jornada do barbeiro e teste herança, jornada própria e fechamento.
3. Saia e entre como cliente **sem recarregar o preview**. Abra Explorar, a barbearia fictícia, seu catálogo e a reserva.
4. Escolha serviço, profissional, data futura e horário. Confirme a reserva.
5. Consulte seus agendamentos. Reagende ou cancele e observe a nova disponibilidade.
6. Saia e entre como proprietário/barbeiro; consulte a agenda na data escolhida. A reserva deve aparecer na mesma sessão.

Preços, durações e slots são calculados a partir dos dados demonstrativos atuais. Reservas ocupam horários e cancelamentos os liberam. Jornada geral, jornada individual e exceções limitam a oferta. Não há sincronização entre dispositivos. Recarregar o runtime reinicia os dados de negócio. Preferências e armazenamento da aplicação podem usar os mecanismos locais originais; isso não transforma os dados mockados em persistência de backend.

## Limitações explícitas

- Relógio e regras de autorização são simulações locais; não representam garantias de um servidor.
- A unidade fictícia usa `America/Sao_Paulo` e offset `-03:00`. Não se pretende simular fuso arbitrário/horário de verão.
- Recuperação/verificação de e-mail, alteração de senha, upload de mídia, geocodificação e integrações de mapas não são reproduzidos integralmente. Operações sem mock retornam mensagem explícita de recurso não simulado, sem sucesso fictício.
- Cadastro local cria dados de demonstração; não envia mensagens nem cria conta de produção.
- Convites são registros demonstrativos pendentes; não há entrega real por e-mail.
- Notificações começam vazias; não há push/scheduler de servidor.
- Financeiro opera apenas sobre registros locais. Métricas detalhadas por alvo das avaliações e a moderação de plataforma não reproduzem todas as regras do servidor.
- Não há conta demonstrativa de administrador da plataforma. A rota original permanece no código.
- Internet ainda é necessária para o editor, bibliotecas, fontes e assets. Independência de backend local não significa funcionamento offline.
- As telas originais são preservadas, mas nem toda ação de todas as telas equivale ao backend real. Consulte o relatório de validação antes de considerar a entrega aprovada.

## Gerar e testar

Na raiz do repositório:

```sh
npm ci
node scripts/build-snack.mjs
node scripts/verify-snack.mjs
npx vitest run --config scripts/snack-tests/vitest.config.mts
npm run typecheck
```

Para testar localmente a geração SDK 54:

```sh
cd snack
npm install
npm run typecheck
npm run build
```

Não editar cópias em `snack/src` ou `snack/runtime` manualmente. Altere o gerador ou `snack-support`, regenere e revise o diff. O gerador é usado nesta branch, não muda o aplicativo original e não publica automaticamente.

## Fontes técnicas

- [SDK do Snack, arquivos, dependências e publicação](https://github.com/expo/snack/blob/main/docs/snack-sdk.md)
- [Integração Expo Router no runtime](https://github.com/expo/snack/blob/main/packages/snack-runtime/src/NativeModules/ExpoRouter.tsx)
- [Importador Git oficial: branch e subpasta](https://github.com/expo/snack/blob/main/website/src/client/components/Import/ImportRepoModal.tsx)
- [Versões e módulos fornecidos pelo Snack](https://github.com/expo/snack/blob/main/packages/snack-content/src/sdks/index.ts)

Resultados, evidências, link efetivamente publicado e pendências são registrados em `EXPO_SNACK_VALIDACAO.md`.
