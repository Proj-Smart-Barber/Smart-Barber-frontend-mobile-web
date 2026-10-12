# Geolocalização e descoberta de barbearias próximas

Registro solicitado pelo usuário em 11/10/2026. Estado: requisito de evolução futura, ainda sem desenho aprovado ou implementação autorizada nesta frente.

## Necessidade de produto

O cliente deve conseguir visualizar as barbearias mais próximas de sua localização no momento da busca. Esta descoberta deve se conectar ao catálogo e à jornada de agendamento.

## Situação encontrada

- O frontend guarda endereço textual em `location`; o DTO de barbearia não possui latitude/longitude.
- Não foi encontrada integração de localização do aparelho/navegador em `src`, nem dependência `expo-location` em `package.json`.
- Endereço textual, sozinho, não comprova coordenadas ou distância calculada.
- API main `a1ba2dae`: barbearia possui endereço textual, sem coordenadas; não há consulta pública de unidades ou rota de proximidade. A evolução depende também do backend.

## Questões para uma futura rodada de planejamento

- Fonte e validação das coordenadas das barbearias; correção de endereço pelo proprietário.
- Solicitação de localização no web/Android/iOS e momento apropriado para pedir permissão.
- Alternativa quando o usuário negar permissão, estiver sem GPS ou quiser buscar outra região.
- Busca, ordenação, raio, paginação e indicação de distância aproximada.
- Necessidade de mapa versus listagem e impacto de custo dos provedores.
- Precisão, atualização e tratamento de resultados indisponíveis.
- Privacidade: finalidade, retenção mínima e consentimento; não assumir rastreamento contínuo.

## Relação com a frente atual

Registrar a dependência da descoberta na futura home do cliente. O fluxo de agendamento de uma barbearia conhecida ou aberta por link não depende de implementar localização agora. A fase atual não deve mostrar distância fictícia nem afirmar que uma barbearia é a mais próxima sem dados e cálculo reais.
