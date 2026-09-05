# Assets estáticos do SecurePlay

Esta pasta contém artes públicas e padronizadas que acompanham o build do
frontend. O Vite publica esses arquivos com hash no nome, permitindo cache
longo no navegador sem depender de URLs assinadas do S3.

- `achievements/`: uma imagem por `achievement.slug`.
- `games/`: uma imagem por `arcade_game.slug`.
- `mission-room/`: capas, níveis e elementos da Sala de Missões.

No banco, `modulo.thumbnail` deve guardar uma chave lógica como
`module-foundations`, nunca um caminho absoluto do computador. Quadrinhos,
vídeos, avatares e arquivos privados continuam no bucket.

O mapeamento central fica em `src/lib/staticArtwork.ts`.
