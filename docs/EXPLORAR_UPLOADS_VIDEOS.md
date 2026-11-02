# Explorar e mídias da unidade

A implementação usa a base SDK 58 já existente neste checkout. Mantém os temas do aplicativo e não depende dos componentes Next.js da landing.

## Experiência

O Explorar usa feed vertical virtualizado por unidade e galeria horizontal independente. Preserva a foto ao remontar um cartão, realinha a posição em resize e mede a área ocupada pela navbar. Início, Explorar, Agenda e Conta permanecem disponíveis, com Menu como ação auxiliar preservada. Serviço, catálogo, informações e avaliações usam a unidade ativa. Ao abrir o catálogo pelo serviço, a seleção acompanha o serviceId válido.

Filtros oferecem busca, raio e região manual. A paginação transmite cancelamento de requisições; falhas de continuação oferecem atualização da sessão, sem concatenar um cursor expirado ao resultado antigo. O backend controla a ordenação e o snapshot.

Somente o vídeo do cartão e foto ativos reproduz. Painéis, troca de mídia, saída de tela e background interrompem o player. Reprodução inicia sem som quando permitida; há controles de áudio e pausa e fallback para erro. Reduced motion evita início automático. A galeria pública usa posters e distingue vídeo de fotografia.

## Gestão pelo owner

Configurações mantém upload de logo, galeria, definição de capa, ordenação e remoção. Serviço salvo possui seletor de fotos/vídeos, galeria, capa e remoção. O arquivo passa por intenção autenticada, envio, processamento e associação à unidade/serviço corretos. Não é mais necessário informar URL livre.

Vídeos maiores usam multipart com partes limitadas, retomada das partes existentes e cancelamento. Vídeo só aparece como opção quando a API informa que seu processamento está habilitado. As credenciais do R2 pertencem exclusivamente ao backend; nenhuma chave privada deve entrar em EXPO_PUBLIC_* ou no bundle.

No iPhone, a preparação de imagem converte HEIC/HEIF via módulo nativo compatível, quando necessário, antes de enviar formato aceito. A permissão de biblioteca tem descrição explícita; câmera e microfone não são solicitados para selecionar arquivos existentes. Essa configuração e os testes de componentes não substituem ensaio em aparelho físico.

## Entrada e publicação

A rota /inicio redireciona para a entrada do aplicativo. Visitante segue para login. Na web, fontes usam fallback com swap e não bloqueiam a entrada; erro de fonte não prende a splash nativa. A feature antiga da landing foi preservada sem rota ativa porque a exclusão da pasta foi bloqueada pela ferramenta; não reativá-la para publicar o app.

Origem pública do app: https://app.smartbarber.wellingtonsp.uk. A web usa proxy /api para a API publicada. A landing independente continua em https://smartbarber.wellingtonsp.uk.

## Limites de validação

TypeScript, suíte local e export web foram executados. Upload real exige sessão owner, R2 configurado no backend e confirmação do arquivo/registro após processamento. Testes de multipart com transporte simulado não comprovam transferência ao R2. Os vídeos dependem também de worker operacional no ambiente de destino, com a flag correspondente habilitada. Sem dispositivo conectado, iPhone/Android físicos permanecem não testados.

O acervo preparado e suas aprovações não são publicados automaticamente por este checkout. Importação deve seguir o manifesto revisado da API, sem associar fotografias incompatíveis aos serviços ou identificar pessoas de banco como funcionários.
