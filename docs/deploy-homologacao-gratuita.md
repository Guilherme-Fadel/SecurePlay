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
- Variável de build: `VITE_API_URL=/api`
- Variável de runtime das Functions: `API_ORIGIN=https://<API>.onrender.com`
- Segredo de runtime das Functions: `PROXY_SHARED_SECRET`, com o mesmo valor configurado no Render (gere com `openssl rand -hex 32`). Sem ele a API enxerga o IP da Cloudflare para todos os usuários e o limite de tentativas de login passa a ser compartilhado.

A pasta `frontend/functions` deve ser publicada pela integração Git ou Wrangler.
O proxy atende `/api/*`, incluindo Socket.IO, e evita cookies de terceiros na guia
anônima. Siga o passo a passo em [configuracao-proxy-hml.md](configuracao-proxy-hml.md).

O diretório `frontend/public` contém regras de SPA, cache e cabeçalhos de segurança que serão incluídas no build.

### 5. Finalização de CORS

Depois que o Pages gerar a URL definitiva, atualize no Render:

```env
CORS_ORIGIN=https://<PROJETO>.pages.dev
COOKIE_SAME_SITE=lax
```

Deixe `COOKIE_DOMAIN` vazio. Em um ambiente já publicado, altere para `lax` somente
depois de publicar o proxy e o frontend com `VITE_API_URL=/api`.

Se houver domínio próprio, inclua todas as origens permitidas separadas por vírgula. Não use `*` porque a aplicação envia cookie de autenticação com credenciais.

### 6. Domínio próprio (recomendado)

Pelo proxy da Pages, o Render recebe todas as chamadas a partir dos IPs de saída da Cloudflare e pode responder `429` com `x-render-routing: hibernate-rate-limited` antes de a API ser executada. O login falha na primeira tentativa mesmo com a senha certa. Com subdomínios do mesmo domínio, o navegador fala direto com a API e o cookie `SameSite=Lax` continua válido (mesmo site).

Use `app.<DOMINIO>` para o site e `api.<DOMINIO>` para a API. O e-mail do domínio não é afetado: só se adicionam dois registros `CNAME`; não altere `MX`, `TXT`/SPF, DKIM nem os servidores de nome.

1. Pages → projeto → **Custom domains** → adicionar `app.<DOMINIO>`.
2. Render → serviço da API → **Settings → Custom Domains** → adicionar `api.<DOMINIO>`.
3. No DNS do domínio (por exemplo, Squarespace → Domínios → DNS → registros personalizados):
   - `CNAME` host `app` → `<PROJETO>.pages.dev`
   - `CNAME` host `api` → `<API>.onrender.com`
   Se o DNS estiver na Cloudflare, deixe o `api` como **DNS only** (nuvem cinza).
4. Aguarde o certificado HTTPS dos dois painéis ficar ativo.
5. No Render:

   ```env
   CORS_ORIGIN=https://app.<DOMINIO>,https://<PROJETO>.pages.dev
   COOKIE_SAME_SITE=lax
   PUBLIC_SITE_URL=https://app.<DOMINIO>
   ```

   Mantenha `COOKIE_DOMAIN` vazio (cookie só do host da API).
6. Na Pages, troque a variável de build para `VITE_API_URL=https://api.<DOMINIO>` e faça um novo deploy. O socket usa a mesma origem automaticamente.
7. Valide: `https://api.<DOMINIO>/health` responde 200; o login em `https://app.<DOMINIO>` cria o cookie; recarregar mantém a sessão; o socket conecta.

Depois que tudo funcionar pelo domínio, `<PROJETO>.pages.dev` pode sair de `CORS_ORIGIN`.

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
