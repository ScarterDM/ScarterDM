# Publicar a página da Trindade Craft

Destino escolhido: repositório de apresentação ScarterDM/ScarterDM, branch main, raiz. A pasta de trabalho local é /workspace/sites/trindade-craft. Os arquivos do site serão sincronizados com esse repositório sem código ou executáveis dos plugins.

A conexão GitHub atual permite enviar arquivos, mas retorna HTTP 403 para administrar a visibilidade e o Pages. Por isso, os passos abaixo precisam ser feitos na conta do proprietário:

1. No repositório ScarterDM/ScarterDM, Settings → General → Danger Zone → Change repository visibility: tornar público, caso ainda esteja privado.
2. Settings → Pages → Build and deployment: escolher Deploy from a branch.
3. Selecionar a branch main e a pasta / (root). Salvar e aguardar o GitHub informar a publicação.
4. Copiar o endereço exibido no painel Pages e verificar o site no computador e no celular.

O endereço esperado para esse nome de repositório é https://scarterdm.github.io/ScarterDM/, mas só considere a publicação concluída quando o GitHub confirmar. Não altere a visibilidade de ScarterDM/Teste: ele contém código e binários privados.

Não é necessário compilar: o site é HTML/CSS/JavaScript estático, com .nojekyll. Os arquivos usados são index.html, site.css, site.js, dados/notas.json e assets/*.webp + assets/coroa.svg. O README de perfil e as páginas dos plugins continuam separados.

Para domínio próprio, configure o domínio no Pages e o DNS somente quando ScarterDM escolher o endereço e autorizar a configuração. Os endereços jogar.trindadecraft.com.br e bedrock.trindadecraft.com.br são endereços de jogo: não os reutilize como domínio do site nem altere seu DNS.

---

# Notas públicas da Trindade Craft

O mural lê `dados/notas.json`. Ele começa vazio porque nenhuma nota de atualização foi aprovada como oficial para esta página. Não copie automaticamente notas DEV, dados de teste ou informações de repositórios privados.

Para acrescentar uma nota aprovada por ScarterDM, insira em `notas` um objeto com:

- `id`: identificador único estável.
- `titulo`: título simples voltado ao jogador.
- `data`: dia de publicação no formato AAAA-MM-DD, considerando America/Manaus.
- `categoria`: `novidade`, `melhoria` ou `correcao`.
- `resumo`: um parágrafo sobre a mudança real.
- `mudancas`: lista de textos curtos, sem dados sensíveis.
- `aprovada`: `true`, somente depois da aprovação.
- `oficial`: `true`, somente para mudanças oficiais já autorizadas.

Não acrescente notas não aprovadas neste arquivo: ele é público. O filtro do navegador é uma proteção de exibição, não uma forma de manter dados privados. Rascunhos devem permanecer no acervo privado.

A publicação do site não aprova ou promove versões dos plugins.

## Revisar conteúdo

- Conferir se cada experiência anunciada está habilitada no servidor.
- Famílias com descendência/árvore genealógica, criação de religiões por jogadores e vampiros/possessões foram marcados como futuros.
- As regras resumidas são orientações de convivência, não uma nova tabela formal de punições.
- Não foram criados links fictícios de WhatsApp/Discord. Adicione somente convites oficiais confirmados.
- Os atalhos minecraft:// do Bedrock dependem da plataforma; mantenha a alternativa manual com endereço e porta.
- As imagens são artes conceituais, não capturas reais do servidor.

## Verificação desta entrega

Sintaxe JavaScript, IDs e referências ARIA, links internos, presença de assets, JSON de notas e formato dos dois atalhos Bedrock foram verificados estaticamente. Não houve teste visual em navegador, nem teste dos atalhos em dispositivos reais. A disponibilidade do GitHub Pages ainda depende da conta do proprietário.
