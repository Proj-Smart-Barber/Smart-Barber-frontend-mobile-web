# Confirmação de e-mail por código

A tela usa e-mail e código numérico de seis dígitos, teclado numérico e autofill one-time-code. Não mostra mais “Token de verificação” nem anuncia envio de link em um fluxo que espera código. A API recebe `{email,code}` sem credenciais de sessão ambiente. O sucesso orienta o usuário ao login; não cria sessão automaticamente.

O fluxo antigo de `?token=` permanece suportado: limpa o token do endereço/histórico e confirma por `{token}`. Os controles de tentativas concorrentes, geração de requisições, retry transitório e cooldown foram preservados. Alterar o e-mail limpa o código e a referência de retry da conta anterior. O reenvio limpa o código substituído; solicitação inicial bem-sucedida também inicia a espera visual de 60 segundos.

Headers de `/verify-email` impedem cache/referrer/indexação do fluxo. Códigos nunca entram no endereço. O backend também precisa estar atualizado: o antigo endpoint exigia token e enviava links. Publicar as duas correções no mesmo ciclo; não habilitar isoladamente esta tela contra uma API antiga. A API primeiro cria a tabela aditiva e oferece o contrato novo; publicar o frontend correspondente em seguida. Usuários com abas antigas devem atualizar o app antes de reenviar/confirmar um novo código.

Verificações de 03/11/2026: TypeScript aprovado, build Expo web aprovado e 30 testes focados de cadastro/API/tela aprovados. Incluem código com zero inicial, validação de entrada, cooldown, limpeza após reenvio, links antigos, falhas e respostas concorrentes. Os testes exibem avisos preexistentes do harness (tsconfig/act), sem falhas. Não foi executado teste físico de iPhone nem envio real de e-mail nesta etapa.

O backend relacionado usa TTL de dez minutos, limite persistente de cinco erros, cooldown e orçamento de emissões, HMAC privado e consumo/ativação atômicos. Não foram alteradas agenda, perfil, PWA, mídia, navegação ou versão do Expo.
