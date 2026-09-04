# Armazenamento de imagens

## Convenção

- Conquistas: `achievement.image_url` (referência persistente `s3://bucket/key`).
- Jogos: `arcade_game.image` (mesma referência).
- Missões diárias: `challenge.image` (mesma referência).
- A API assina a leitura no bucket privado por uma hora. Nunca persistir URLs assinadas: elas expiram.
- As ilustrações da Sala de Missões ficam em `ui/missions-room/v1/`. O backend mantém um catálogo de chaves fixas e entrega URLs assinadas em `GET /conteudo/ui-assets/missions-room`; não são persistidas URLs temporárias nem criada tabela apenas para decoração.
- PNGs antigos, referências e temporários ficam fora do Git. Os cinco PNGs de jogos são fallbacks locais usados também por instalações ainda não migradas.

## Publicação

Na pasta `backend`, com `.env` configurado:

```powershell
node --env-file=.env scripts/inspect-achievement-art.cjs --images
node --env-file=.env scripts/publish-challenge-art.cjs
node --env-file=.env scripts/publish-challenge-art.cjs --apply
```

Sem `--apply`, a publicação dos desafios só mostra as associações planejadas. Com a opção, faz backup dos valores anteriores em `tmp/challenge-art`, publica objetos com hash e verifica os bytes via download antes de atualizar as duas tabelas em transação. Imagens personalizadas e valores nulos não são substituídos. Reexecuções não duplicam registros nem sobrescrevem objetos.

Para republicar conquistas, disponibilize os PNGs originais em `frontend/public/achievements` e execute `node --env-file=.env scripts/publish-achievement-art.cjs`. Os 20 originais estão no S3; não são necessários no bundle do frontend. O manifesto em `achievement-art-manifest.json` identifica os arquivos. O backup local e as referências no banco permitem localizar as versões publicadas.

Implante o backend com resolução de S3 antes de migrar os campos de jogos/missões. A missão diária resolve a imagem após ler o cache; a URL assinada não é gravada no Redis. Nenhuma política ou ACL pública do bucket é necessária.
