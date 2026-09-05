# Armazenamento de mídia

## Assets públicos e padronizados

As artes fixas da interface acompanham o build do frontend em
`frontend/src/assets`. O Vite acrescenta hash aos nomes publicados, permitindo
cache longo sem manter URLs assinadas:

- conquistas: `frontend/src/assets/static/achievements/<slug>.png`;
- jogos e desafios: `frontend/src/assets/static/games/<slug>.png`;
- Sala de Missões: `frontend/src/assets/static/mission-room/`;
- dashboard, landing page e login: suas pastas existentes em
  `frontend/src/assets/dashboard` e `frontend/src/assets/kids`.

O catálogo central fica em `frontend/src/lib/staticArtwork.ts`. Módulos são
associados por chave lógica e título; conquistas e jogos usam seus respectivos
`slug`s.

## Conteúdo mantido no S3 privado

- vídeos e páginas de quadrinhos;
- avatares e logos específicos de usuários/organizações;
- uploads e outros arquivos que exigem autorização.

Esses arquivos continuam usando URLs assinadas. Nunca persista uma URL
assinada no banco, pois ela expira.

## Banco de dados

Campos de imagens padronizadas devem guardar chaves lógicas, não caminhos do
computador. Exemplo: `modulo.thumbnail = 'module-foundations'`.

Para migrar as capas atuais, execute
`backend/database/migrate-static-module-thumbnails.sql` pelo DBeaver. Valores
antigos `s3://...` já são ignorados pelos serviços públicos durante a transição,
portanto não geram novas assinaturas.
