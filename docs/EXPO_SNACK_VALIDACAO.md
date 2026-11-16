# Validação da entrega acadêmica

[Snack publicado e testado no navegador](https://snack.expo.dev/OyOwRgsVOdtU3pQQ--78a?platform=web), com Expo SDK 54. A versão anterior não incluía a correção da jornada individual. A branch `feature/expo-snack-entrega` é independente; a entrega não prevê PR nem merge.

| Fluxo | Evidência | Tipo |
| --- | --- | --- |
| Inicialização e login | Preview abriu sem login Expo; proprietário, barbeiro e cliente acessaram suas telas | Snack Web, dados fictícios |
| Serviços | Criação como proprietário e exibição no catálogo do cliente na mesma sessão, na versão anterior do preview; contrato coberto por teste | Mock |
| Disponibilidade geral | Alteração na terça de 08:00 para 09:00 e confirmação de salvamento no preview intermediário; contrato coberto por teste | Mock |
| Jornada individual | Barbeiro abriu a tela, salvou jornada fechada e voltou a seguir a unidade | Snack Web, dados fictícios |
| Reserva | Escolha de serviço, profissional, data e horário; confirmação e exibição em Meus Agendamentos | Snack Web, dados fictícios |
| Reagendamento e cancelamento | Reserva mudou de 09:00 para 10:00 e a lista mostrou o novo horário. Detalhe exibiu Cancelado e informou liberação do horário; teste verifica a liberação | Snack Web e teste do mock |
| Financeiro, avaliações, notificações, cadastro e convites | Cobertura parcial; não validados ponta a ponta no preview | Mock parcial |

Verificações locais: typecheck do projeto original; 236 testes existentes em 38 arquivos (execução anterior, reaproveitada); 3 testes direcionados da demonstração, incluindo contrato de disponibilidade e interação entre serviços, horários, jornada e reservas; resolução de imports e análise sintática dos 426 módulos JavaScript do pacote.

A instalação local do SDK 54 falhou com `EPERM` em `node_modules`; build e typecheck com dependências locais desse SDK não estão comprovados. A suíte original completa não apresentou um resumo conclusivo, portanto o número acima representa somente o conjunto focado. O editor do Snack exibiu avisos, sem erros no indicador, durante os fluxos validados. Expo Go (Android/iOS) e importação pelo menu Git do editor ainda precisam de validação manual. O link acima foi publicado usando o SDK oficial do Snack e aberto no editor real.
