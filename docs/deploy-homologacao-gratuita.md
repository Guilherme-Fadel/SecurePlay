# Deploy gratuito de homologação da SecurePlay

Este guia publica a aplicação sem alterar sua stack principal:

- **Frontend:** Cloudflare Pages (`*.pages.dev`)
- **API:** Render Free (`*.onrender.com`)
- **Banco:** Aiven for MySQL Free
- **Cache/sessões:** Aiven for Valkey Free
- **Mídias:** Cloudflare R2, opcional durante a homologação

O ambiente gratuito é destinado a demonstrações e homologação. A API do Render adormece após um período sem tráfego e pode demorar aproximadamente um minuto no primeiro acesso. Não use esse conjunto como ambiente definitivo para escolas.

## Responsabilidades

O proprietário do projeto precisa:

1. Criar ou autenticar as contas nos provedores.
2. Escolher e confirmar e-mail, senha, SSO, MFA e aceite de termos.
3. Inserir informações de pagamento somente se decidir habilitar o R2.
4. Guardar os segredos nos painéis dos provedores; nunca enviá-los por chat nem commitá-los.

O Codex pode preparar o código, conduzir a navegação, configurar os serviços depois da autenticação, executar os deploys e validar as URLs.

## Ordem recomendada

### 1. Aiven

Crie um projeto e dois serviços no plano **Free**:

- MySQL, nome sugerido `secureplay-mysql`.
- Valkey, nome sugerido `secureplay-valkey`.

No MySQL, copie individualmente host, porta, usuário, senha e nome do banco para o formulário de variáveis do Render. Baixe também o certificado CA e converta-o localmente para Base64:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('ca.pem'))
```

Cole apenas o resultado em `DB_CA_CERT_BASE64` no Render. Não salve credenciais nem o certificado no repositório.

No Valkey, use a URI do serviço como `REDIS_URL`. O backend aceita `valkeys://`, `rediss://`, `valkey://` e `redis://`.

### 2. Cloudflare R2 — opcional

Crie um bucket Standard chamado `secureplay-media` e um token S3 restrito a esse bucket. Configure:

- `S3_BUCKET_NAME=secureplay-media`
- `AWS_REGION=auto`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- `S3_FORCE_PATH_STYLE=false`

O R2 possui franquia mensal gratuita, mas sua ativação passa por um checkout e pode exigir método de pagamento. Se essa etapa for adiada, páginas públicas, login e recursos sem upload podem ser homologados normalmente; uploads e reprodução de mídias dependentes do bucket não funcionarão.

### 3. Render

O arquivo `render.yaml` descreve a API. No Render:

1. Conecte o repositório GitHub `Guilherme-Fadel/SecurePlay`.
2. Crie um Blueprint a partir de `render.yaml`.
3. Confirme o plano `Free`.
4. Preencha as variáveis marcadas como secretas com os valores do Aiven e, se habilitado, do R2.
5. Em `CORS_ORIGIN`, use temporariamente a futura URL do Pages ou atualize-a após criar o frontend.
6. Aguarde `GET /health` retornar `{ "status": "ok" }`.

O Blueprint usa `DB_SYNCHRONIZE=true` somente para inicializar o banco vazio de homologação. Antes de produção, substitua sincronização automática por migrações versionadas e configure `DB_SYNCHRONIZE=false`.

### 4. Cloudflare Pages

Crie um projeto Pages conectado ao mesmo repositório:

- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `dist`
- Variável de build: `VITE_API_URL=https://<API>.onrender.com`

O diretório `frontend/public` contém regras de SPA, cache e cabeçalhos de segurança que serão incluídas no build.

### 5. Finalização de CORS

Depois que o Pages gerar a URL definitiva, atualize no Render:

```env
CORS_ORIGIN=https://<PROJETO>.pages.dev
COOKIE_SAME_SITE=none
```

Se houver domínio próprio, inclua todas as origens permitidas separadas por vírgula. Não use `*` porque a aplicação envia cookie de autenticação com credenciais.

## Validação pós-deploy

1. `GET https://<API>.onrender.com/health` responde com status 200.
2. A landing page abre diretamente e após recarregar a URL.
3. Login cria cookie `Secure`, `HttpOnly` e `SameSite=None`.
4. `GET /auth/me` permanece autenticado após recarregar.
5. Socket.IO conecta e reconecta após o backend despertar.
6. Conteúdos, progresso, ranking e logout funcionam.
7. Se R2 estiver habilitado, validar upload, leitura e política CORS do bucket.

## Limitações e próxima etapa

Antes de vender ou operar em escolas, migre a API para uma instância sem suspensão, desative `DB_SYNCHRONIZE`, configure domínio próprio, monitoração, backups testados e revise os requisitos jurídicos e de privacidade aplicáveis ao público infantil.
