# Repasse de Google Maps — Álvaro

## Responsabilidade e limite

O responsável pelo acesso ao backend de produção é o Álvaro. Conforme decisão do usuário em 20/10/2026, a configuração da credencial nesse ambiente fica com ele. Este documento é um repasse técnico; nenhuma mensagem foi enviada e nenhuma configuração de produção foi alterada nesta etapa.

O funcionamento completo depende de dois componentes separados: geocodificação no backend e mapa no frontend. Configurar apenas a chave do backend não habilita o mapa JavaScript.

## Backend de produção

1. No projeto Google Cloud, habilitar Geocoding API e faturamento; configurar restrições da chave, quotas e alertas adequados ao uso.
2. No provedor de hospedagem da API, cadastrar **uma** variável secreta: `GOOGLE_MAPS_API_KEY` ou `GOOGLE_GEOCODING_API_KEY`.
3. Preferir `GOOGLE_MAPS_API_KEY`, que tem precedência no código atual. Não deixar essa variável vazia quando for usar a alternativa, pois o operador `??` não ignora string vazia.
4. Restringir a chave à Geocoding API. Aplicar restrição de IP somente quando houver saída estável compatível com a hospedagem. Não aplicar restrição de HTTP referrer à chave usada pelo servidor.
5. Reimplantar a API e verificar uma busca autenticada de endereço com OWNER ativo. Confirmar candidato, expiração, atribuição Google e ausência de credenciais nos logs.
6. Acompanhar manutenção das localizações e seu heartbeat; a proximidade pode retornar 503 quando a manutenção não está saudável. Não executar rotas internas com credenciais em URL nem desabilitar sua autenticação.

Não colocar a chave de servidor em `EXPO_PUBLIC_*`, no Git, em screenshots, PRs ou chat. Não copiar `.env` de produção para o runtime de homologação.

## Frontend web — responsabilidade a combinar com quem administra seu deploy

1. Criar chave separada restrita à Maps JavaScript API e aos HTTP referrers autorizados.
2. Configurar `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY` no ambiente de build do frontend. Essa chave será pública no bundle; sua proteção depende das restrições no Google Cloud.
3. Autorizar o domínio real `https://smartbarber.wellingtonsp.uk/*`. Para homologação local, usar chave própria com os referrers locais necessários, como `http://127.0.0.1:58081/*`.
4. Reexportar e publicar o frontend após configurar a variável; alterar o backend não atualiza um bundle estático já publicado.
5. Validar abertura sob demanda, mapa real com atribuição Google, seleção de barbearia e tratamento de falha. O mapa de contingência não serve como prova de Google Maps.

Android/iOS exigem configuração e credenciais próprias do build nativo; a chave web não substitui essa configuração.

## Aceite após configuração

- OWNER ativo pesquisa um endereço público de teste, escolhe candidato e confirma o ponto. Apenas coordenadas confirmadas devem ser publicadas.
- Cliente concede GPS voluntariamente; testar proximidade em 5, 10, 25 e 50 km, busca textual e ordenação conforme o contrato.
- Cliente abre “Ver no mapa”; confirmar mapa Google real e links ao catálogo/agendamento.
- Repetir com permissão negada e timeout: busca textual continua disponível, sem coordenadas inventadas.
- Não guardar coordenadas reais do usuário em screenshots ou relatórios. Preferir unidade de homologação e dados públicos de teste; mutações em produção precisam de autorização e identificação da unidade usada.
- Confirmar resultados pelo ambiente, sem converter build, mocks ou fallback em prova de GPS físico.

Referências oficiais: [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/get-api-key) e [Google Maps Platform Security](https://developers.google.com/maps/api-security-best-practices).

## Estado desta entrega

Credenciais Google ausentes localmente; geocodificação e mapa Google reais **NOT TESTED**. Solicitação de posição no navegador local expirou; fallback textual permaneceu funcional. Não foram adquiridas ou registradas coordenadas reais.

O emulador Android instalado iniciou. Seu Expo Go foi atualizado de 54.0.8 para 57.0.9 pelo APK indicado na [página oficial para SDK 57](https://expo.dev/go?sdkVersion=57&platform=android&device=false). O projeto preserva Expo 57.0.19; nenhum SDK ou dependência foi alterado. O cliente Expo Go e o Metro local iniciaram, com a API encaminhada por porta local, mas não houve evidência de interação com a UI Android. Portanto, execução funcional nativa, teste físico de GPS e iOS continuam pendentes; não dependem somente da chave do backend.
