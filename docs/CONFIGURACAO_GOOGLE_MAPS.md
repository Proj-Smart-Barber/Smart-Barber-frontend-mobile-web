# Configuração Google Maps por ambiente

As quatro chaves foram geradas e configuradas no Google Cloud, segundo confirmação do responsável. Nenhum valor foi recebido ou verificado nesta execução. Cada chave precisa ser inserida no ambiente que a utiliza.

| Ambiente | Variável | Próxima ação |
| --- | --- | --- |
| Vercel da API, administrada pelo Álvaro | `GOOGLE_MAPS_API_KEY` | Inserir chave Geocoding, configurar `CRON_SECRET` e redeploy |
| Vercel do frontend | `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY` | Inserir chave Maps JavaScript e fazer novo build/deploy web |
| Build Android | `GOOGLE_MAPS_ANDROID_API_KEY` | Inserir chave Maps SDK for Android e gerar novo binário |
| Build iOS | `GOOGLE_MAPS_IOS_API_KEY` | Inserir chave Maps SDK for iOS e gerar novo binário |

Inserir todas as chaves no backend não as transfere ao site ou aos apps. Não há endpoint para distribuir a chave secreta do servidor.

## Frontend web

Na Vercel do frontend, **Settings → Environment Variables → Production**, cadastrar `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY`. O domínio autorizado no Google deve incluir `https://smartbarber.wellingtonsp.uk/*`. Fazer redeploy após salvar: o valor é incorporado ao bundle durante o build.

Para homologação local, usar `.env.local` ignorado pelo Git e os referrers locais autorizados. O mapa só carrega sob demanda. `EXPO_PUBLIC_*` é público: nunca colocar `GOOGLE_MAPS_API_KEY` ou `CRON_SECRET` nessa família de variáveis.

## Android e iOS

O `app.config.ts` preserva o `app.json` e configura o plugin instalado `react-native-maps` usando as variáveis nativas acima. Os identificadores continuam `com.smartbarber.app` nas duas plataformas, com permissões existentes preservadas. O SDK Expo 57.0.19 não foi alterado.

Em EAS Build, cadastrar cada variável no ambiente escolhido pelo perfil de build; fora de EAS, fornecer as variáveis ao processo de prebuild/build nativo. Não colocar valores em `app.json`, `eas.json`, Git ou issue. Este projeto ainda não tem perfil EAS pronto para publicação em loja; não criar projeto remoto nem contratar builds automaticamente.

Quando `EAS_BUILD_PLATFORM` indicar Android/iOS, a configuração recusa o build se a chave da plataforma estiver ausente. Web continua independente das chaves nativas. Não imprimir `expo config` usando valores reais: o resultado de configuração pode incluir chaves dos SDKs clientes.

A chave Android precisa autorizar pacote e SHA-1 do certificado efetivo do binário; debug, build de distribuição e Play App Signing podem usar certificados distintos. A chave iOS precisa autorizar o bundle ID. Expo Go não substitui a homologação do binário próprio com essas credenciais.

Configuração de plugin e chaves nativas exige **novo binário**, não apenas atualização do backend ou bundle JavaScript.

## Aceite

1. Publicar os ajustes de configuração antes de declarar o pacote pronto em produção.
2. Álvaro configura os dois segredos do servidor e segue `docs/GOOGLE_MAPS_PRODUCAO.md` no repositório da API.
3. Publicar a chave web no frontend e conferir mapa Google real, atribuição e catálogo.
4. Gerar builds próprios Android/iOS e testar GPS permitido, negado e timeout, posição aproximada e navegação ao catálogo/agendamento.
5. Separar evidência de configuração, resposta HTTP, mapa real e GPS físico. As verificações com chaves fictícias não comprovam acesso ao Google.

Referências: [plugin react-native-maps](https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md) e [variáveis Expo](https://docs.expo.dev/guides/environment-variables/).
