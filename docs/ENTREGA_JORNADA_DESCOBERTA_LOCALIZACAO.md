# Jornada, descoberta e localização comercial

## Escopo

A contribuição original de jornada do PR #38 foi composta com a main que contém os PRs #47/#48. O merge preserva os commits originais e a autoria. A jornada pessoal usa os contratos HTTP de horários, com estados INHERIT/CUSTOM/CLOSED, versão esperada, tentativas idempotentes, revisão de conflito e recuperação de resultado incerto.

A descoberta do cliente abre o catálogo canônico, oferece busca textual/proximidade e isola o próximo agendamento por ator. A busca textual pode continuar quando o GPS ou o cálculo de proximidade estiverem indisponíveis.

A localização comercial utiliza os endpoints existentes de busca de endereço e leitura/atualização da localização. Confirmação depende de contexto OWNER ativo, versão autoritativa, relógio sincronizado e referência local persistida antes da mutação. Restauração pendente ou com erro bloqueia novo envio. Resposta de sucesso incompatível com o schema permanece incerta.

No cadastro da unidade, o aviso de localização pendente permanece visível após atualizar a sessão, com ação explícita para Configurações. Retentativas sequenciais reutilizam a unidade criada.

## Configuração

Mapa web sob demanda: `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY` (fallback público `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) e, quando utilizado, `EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID`. São configurações públicas do bundle e precisam de restrições adequadas no provedor. Não utilizar a chave secreta de geocoding nesses campos.

O projeto declara expo-location e react-native-maps. app.json configura permissões de localização e o plugin expo-location. Google Maps em builds Android/iOS depende da configuração nativa de chave/SDK correspondente. A instalação do pacote não comprova execução nativa.

O backend não foi alterado. Este pacote não inclui migrations, seeds, mudanças de faturamento ou credenciais.

## Verificação local

- 92 arquivos de teste e 622 testes aprovados, incluindo nove cenários de onboarding com atualização de sessão e 16 regressões do hook de localização.
- TypeScript sem erros na revisão independente.
- Export web com cache limpo: 67 rotas, incluindo Minha jornada.
- Manifests do produto separados das configurações locais de tooling; consistência do lockfile validada com npm ci em dry-run.

Os testes usam fronteiras controladas e dados sintéticos. Não constituem prova de HTTP autenticado com API real, PostgreSQL, Google Maps externo, GPS real ou Android/iOS. Essas validações e o aceite visual permanecem na homologação integrada.

## Limites conhecidos

O contrato de localização pode confirmar uma mutação aplicada pela evidência retornada. Ausência dessa evidência não autoriza afirmar que uma tentativa incerta foi descartada. O frontend mantém UNKNOWN e bloqueia nova confirmação nesse caso.

A proteção de criação da unidade descrita nesta entrega foi verificada para retentativas sequenciais. Não se atribui ao state createdShopId uma trava síncrona que ele não implementa.
