#!/usr/bin/env python3
"""Gera o relatório de auditoria de segurança do SecurePlay em PDF.

Uso:
    python docs/security-audit/generate_security_audit_report.py

Dependência: reportlab. O relatório não consulta rede nem serviços externos.
"""

from __future__ import annotations

import html
import os
from pathlib import Path
from typing import Iterable

from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.doughnut import Doughnut
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    LongTable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_PDF = BASE_DIR / "relatorio-auditoria-seguranca.pdf"

PAGE_W, PAGE_H = A4
MARGIN_X = 20 * mm
TOP_MARGIN = 22 * mm
BOTTOM_MARGIN = 19 * mm
CONTENT_W = PAGE_W - (2 * MARGIN_X)

NAVY = HexColor("#0F172A")
NAVY_2 = HexColor("#172554")
SLATE = HexColor("#334155")
MUTED = HexColor("#64748B")
LIGHT = HexColor("#F8FAFC")
LIGHT_BLUE = HexColor("#EFF6FF")
BORDER = HexColor("#E2E8F0")
WHITE = colors.white
CRITICAL = HexColor("#B91C1C")
HIGH = HexColor("#EA580C")
MEDIUM = HexColor("#D97706")
LOW = HexColor("#2563EB")
STRONG = HexColor("#059669")

SEVERITY_COLORS = {
    "Crítica": CRITICAL,
    "Alta": HIGH,
    "Média": MEDIUM,
    "Baixa": LOW,
    "Informativa": MUTED,
}


def register_fonts() -> tuple[str, str, str]:
    candidates = [
        (
            r"C:\Windows\Fonts\segoeui.ttf",
            r"C:\Windows\Fonts\segoeuib.ttf",
            r"C:\Windows\Fonts\consola.ttf",
        ),
        (
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        ),
    ]
    for regular, bold, mono in candidates:
        if all(os.path.exists(path) for path in (regular, bold, mono)):
            pdfmetrics.registerFont(TTFont("AuditSans", regular))
            pdfmetrics.registerFont(TTFont("AuditSans-Bold", bold))
            pdfmetrics.registerFont(TTFont("AuditMono", mono))
            return "AuditSans", "AuditSans-Bold", "AuditMono"
    return "Helvetica", "Helvetica-Bold", "Courier"


FONT, FONT_BOLD, FONT_MONO = register_fonts()


def esc(value: str) -> str:
    return html.escape(value, quote=False)


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="AuditBody",
        fontName=FONT,
        fontSize=9.2,
        leading=13.2,
        textColor=SLATE,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="AuditSmall",
        fontName=FONT,
        fontSize=7.5,
        leading=10.2,
        textColor=MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="AuditH1",
        fontName=FONT_BOLD,
        fontSize=19,
        leading=23,
        textColor=NAVY,
        spaceBefore=7,
        spaceAfter=9,
    )
)
styles.add(
    ParagraphStyle(
        name="AuditH2",
        fontName=FONT_BOLD,
        fontSize=12.2,
        leading=15,
        textColor=NAVY_2,
        spaceBefore=8,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="AuditH3",
        fontName=FONT_BOLD,
        fontSize=10.2,
        leading=13,
        textColor=NAVY,
        spaceBefore=6,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverKicker",
        fontName=FONT_BOLD,
        fontSize=10,
        leading=13,
        textColor=HexColor("#93C5FD"),
        uppercase=True,
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverTitle",
        fontName=FONT_BOLD,
        fontSize=29,
        leading=34,
        textColor=WHITE,
        spaceAfter=14,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverSubtitle",
        fontName=FONT,
        fontSize=11,
        leading=16,
        textColor=HexColor("#CBD5E1"),
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverMeta",
        fontName=FONT,
        fontSize=8.3,
        leading=12,
        textColor=HexColor("#E2E8F0"),
    )
)
styles.add(
    ParagraphStyle(
        name="TableHeader",
        fontName=FONT_BOLD,
        fontSize=7.7,
        leading=9.5,
        textColor=WHITE,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCell",
        fontName=FONT,
        fontSize=7.25,
        leading=9.7,
        textColor=SLATE,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCellBold",
        fontName=FONT_BOLD,
        fontSize=7.4,
        leading=9.8,
        textColor=NAVY,
    )
)
styles.add(
    ParagraphStyle(
        name="AuditCode",
        fontName=FONT_MONO,
        fontSize=6.9,
        leading=9.2,
        textColor=HexColor("#1E293B"),
        backColor=HexColor("#F1F5F9"),
        borderColor=BORDER,
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=3,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="IssueBlock",
        fontName=FONT_MONO,
        fontSize=6.45,
        leading=8.35,
        textColor=HexColor("#1E293B"),
        backColor=HexColor("#F8FAFC"),
        borderColor=HexColor("#CBD5E1"),
        borderWidth=0.6,
        borderPadding=8,
        spaceBefore=4,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="FindingTitle",
        fontName=FONT_BOLD,
        fontSize=10.8,
        leading=14,
        textColor=NAVY,
    )
)
styles.add(
    ParagraphStyle(
        name="Callout",
        fontName=FONT,
        fontSize=8.3,
        leading=11.7,
        textColor=SLATE,
        backColor=LIGHT_BLUE,
        borderColor=HexColor("#BFDBFE"),
        borderWidth=0.6,
        borderPadding=7,
        spaceAfter=7,
    )
)


findings = [
    {
        "id": "SEC-01",
        "severity": "Alta",
        "category": "IDOR",
        "title": "WebSocket aceita identidade declarada pelo cliente",
        "refs": [
            "backend/src/gateway/app.gateway.ts:24-35",
            "backend/src/gateway/app.gateway.ts:45-56",
            "frontend/src/hooks/useSocket.ts:12-14",
        ],
        "description": (
            "O handshake converte query.userId em identidade e entra na sala user_<id> sem validar JWT, "
            "cookie, expiração ou blacklist. O fanout envia título, mensagem, tipo e data para essa sala."
        ),
        "exploit": (
            "Um cliente Socket.IO escolhe o ID numérico de outra pessoa e aguarda uma nova notificação. "
            "CORS não autentica clientes nativos e não vincula a sala ao sujeito do token."
        ),
        "impact": "Leitura futura de notificações privadas, inclusive entre empresas.",
        "condition": "Gateway alcançável, ID de vítima válido e emissão de nova notificação.",
        "fix": "Validar o JWT no handshake, consultar a blacklist e derivar a sala exclusivamente de sub.",
        "evidence": [
            (
                "backend/src/gateway/app.gateway.ts:24-35",
                "const userId = Number(client.handshake.query.userId);\n"
                "if (!userId || isNaN(userId)) { client.disconnect(); return; }\n"
                "client.join(`user_${userId}`);",
            ),
            (
                "backend/src/gateway/app.gateway.ts:45-56",
                "const room = `user_${payload.usuario_id}`;\n"
                "this.server.to(room).emit('new-notification', payload);",
            ),
        ],
    },
    {
        "id": "SEC-02",
        "severity": "Alta",
        "category": "Banco sem tranca",
        "title": "Administrador ignora tenant nas rotas de notificação",
        "refs": [
            "backend/src/auth/ownership.guard.ts:23-25",
            "backend/src/notification/notification.controller.ts:26-48",
            "backend/src/notification/notification.controller.ts:70-76",
            "backend/src/notification/notification.service.ts:21-43",
            "backend/src/notification/notification.service.ts:99-135",
        ],
        "description": (
            "O OwnershipGuard retorna true para qualquer ADMIN antes de ler o campo de dono. As rotas permitem "
            "criar, listar e marcar todas as notificações para um usuario_id informado pelo cliente; o service não "
            "compara empresa_id."
        ),
        "exploit": (
            "Um administrador da empresa A informa o ID de um usuário da empresa B e lê o histórico, insere uma "
            "mensagem ou marca todas as notificações da vítima como lidas."
        ),
        "impact": "Quebra horizontal de confidencialidade e integridade entre tenants.",
        "condition": "Papel ADMIN, múltiplas empresas e ID válido do usuário alvo.",
        "fix": "Passar o solicitante ao service e exigir igualdade de empresa_id, ou usar guard tenant-aware.",
        "evidence": [
            (
                "backend/src/auth/ownership.guard.ts:23-25",
                "if (user.role === Role.ADMIN) {\n  return true;\n}",
            ),
            (
                "backend/src/notification/notification.service.ts:131-135",
                "return this.notificationRepository.find({\n"
                "  where: { usuario_id },\n"
                "  order: { created_at: 'DESC' },\n"
                "});",
            ),
        ],
    },
    {
        "id": "SEC-03",
        "severity": "Média",
        "category": "Permissão no navegador",
        "title": "Aula bloqueada pode ser lida diretamente por ID",
        "refs": [
            "frontend/src/components/sections/HomePage/Conteudos/AulaListItem.tsx:19-26",
            "backend/src/conteudo/modulo/modulo.service.ts:99-120",
            "backend/src/conteudo/aula/aula.controller.ts:27-29",
            "backend/src/conteudo/aula/aula.service.ts:49-100",
            "backend/src/conteudo/aula/aula.service.ts:354-377",
        ],
        "description": (
            "O frontend desabilita a aula com status locked, mas GET /conteudo/aulas/:id não chama a verificação "
            "de pré-requisito. A resposta inclui vídeo, páginas com URL S3 assinada e perguntas do quiz."
        ),
        "exploit": "Copiar um ID locked retornado pelo módulo e chamar diretamente o GET da aula.",
        "impact": "Acesso antecipado a conteúdo e quiz que a progressão declara bloqueados.",
        "condition": "Usuário autenticado, aula ativa e aula anterior ainda não concluída.",
        "fix": "Executar verificarDesbloqueio antes de assinar ou devolver qualquer mídia da aula.",
        "evidence": [
            (
                "frontend/src/components/sections/HomePage/Conteudos/AulaListItem.tsx:19-26",
                "const isLocked = aula.status === 'locked';\n"
                "<button onClick={isLocked ? undefined : onClick} disabled={isLocked}>",
            ),
            (
                "backend/src/conteudo/aula/aula.service.ts:49-80",
                "const aula = await this.aulaRepository.findOne({\n"
                "  where: { id, active: true },\n"
                "});\n"
                "// sem verificarDesbloqueio\n"
                "content_url: aula.content_url ? await this.resolveUrl(aula.content_url) : null,\n"
                "pages: aula.pages ? await Promise.all(aula.pages.map((key) => this.resolveUrl(key))) : null,",
            ),
        ],
    },
    {
        "id": "SEC-04",
        "severity": "Média",
        "category": "Permissão no navegador",
        "title": "Backend não impõe o desafio diário selecionado",
        "refs": [
            "README.md:24,38",
            "backend/src/challenge/challenge.service.ts:36-58",
            "backend/src/challenge/challenge.service.ts:73-87",
            "backend/src/challenge/challenge.controller.ts:29-56",
            "backend/src/challenge/challenge.service.ts:113-173",
            "backend/src/challenge/challenge.service.ts:175-230",
            "backend/src/challenge/challenge.service.ts:265-295",
        ],
        "description": (
            "Um desafio é escolhido e cacheado por usuário até o fim do dia, porém perguntas, progresso e submit "
            "aceitam qualquer challengeId ativo e nunca o comparam ao valor daily."
        ),
        "exploit": (
            "Enumerar IDs ativos, usar /progress (que revela correct) e submeter vários desafios para acumular XP "
            "no mesmo dia."
        ),
        "impact": "Bypass da regra diária, inflação de XP e distorção de ranking/conquistas.",
        "condition": "Semântica diária ativa, conforme README e chave Redis com TTL diário.",
        "fix": "Vincular questions/progress/submit ao daily do chamador ou a um attempt token diário.",
        "evidence": [
            (
                "backend/src/challenge/challenge.service.ts:52-56,85-87",
                "const challenge = await query.orderBy('RAND()').getOne();\n"
                "await this.setRedisDailyChallenge(usuario_id, challenge);\n"
                "const cacheKey = `daily-challenge:${usuario_id}`;\n"
                "await this.redisService.set(cacheKey, JSON.stringify(challenge), ttl);",
            ),
            (
                "backend/src/challenge/challenge.service.ts:213-223",
                "const challenge = await this.challengeRepository.findOne({\n"
                "  where: { id: challengeId, active: true },\n"
                "});\n"
                "const existing = await this.usuarioChallengeRepository.findOne({\n"
                "  where: { usuario_id, challenge_id: challengeId },\n"
                "});",
            ),
        ],
    },
    {
        "id": "SEC-05",
        "severity": "Alta",
        "category": "Banco sem tranca",
        "title": "Administrador de empresa controla catálogos e mídia globais",
        "refs": [
            "backend/src/auth/roles.enum.ts:1-4",
            "backend/src/admin/admin.controller.ts:11-12",
            "backend/src/conteudo/modulo/modulo.controller.ts:31-49",
            "backend/src/conteudo/aula/aula.controller.ts:32-50",
            "backend/src/conteudo/aula-quiz/aula-quiz.controller.ts:24-45",
            "backend/src/conteudo/s3/upload.controller.ts:31-44",
            "backend/src/benefits/benefits.controller.ts:21-24,35-38",
            "backend/src/conteudo/modulo/modulo.entity.ts:20-60",
            "backend/src/conteudo/aula/aula.entity.ts:15-55",
            "backend/src/conteudo/s3/s3.service.ts:59-72",
        ],
        "description": (
            "O único papel ADMIN também administra uma empresa, mas esse mesmo papel altera objetos globais sem "
            "requester ou empresa_id: módulos, aulas, quizzes, Benefits e chaves de mídia."
        ),
        "exploit": (
            "Um administrador da empresa A chama os CRUDs por ID e altera, exclui ou sobrescreve treinamento "
            "consumido por todas as empresas."
        ),
        "impact": "Comprometimento de integridade multi-tenant e possível indisponibilidade global de conteúdo.",
        "condition": (
            "Classificação pressupõe ADMIN delegado a clientes, como indica a UI/rotas de empresa. Se todo ADMIN "
            "for staff global, o risco passa a ser least privilege e papel ambíguo."
        ),
        "fix": "Criar PLATFORM_ADMIN para catálogo global ou adicionar empresa_id, filtros compostos e prefixo S3.",
        "evidence": [
            (
                "backend/src/conteudo/modulo/modulo.controller.ts:31-49",
                "@Post()\n@Roles(Role.ADMIN)\nasync create(@Body() dto: CreateModuloDto) { ... }\n"
                "@Patch(':id')\n@Roles(Role.ADMIN)\n...\n"
                "@Delete(':id')\n@Roles(Role.ADMIN)",
            ),
            (
                "backend/src/conteudo/s3/s3.service.ts:59-72",
                "return `modulos/${moduloId}/thumbnail`;\n"
                "return `modulos/${moduloId}/aulas/${aulaId}/video`;\n"
                "return `modulos/${moduloId}/aulas/${aulaId}/pages/${pageOrder}`;",
            ),
        ],
    },
    {
        "id": "SEC-06",
        "severity": "Alta",
        "category": "Permissão no navegador",
        "title": "Endpoint do editor Vite sobrescreve fonte sem autenticação",
        "refs": [
            "frontend/vite.config.ts:5-7,13-15",
            "frontend/src/app/App.tsx:25-27",
            "frontend/src/prototypes/worldmap/WorldMapPage.tsx:64-68,99-104",
            "frontend/src/prototypes/worldmap/devSaveRegionPlugin.ts:10-12,19-39",
        ],
        "description": (
            "O Vite registra um middleware de escrita, escuta em todas as interfaces e expõe a rota do editor sem "
            "sessão ou papel. POST /__save-region lê e sobrescreve mockData.ts."
        ),
        "exploit": "Qualquer cliente que alcance a porta 5173 envia um biomeId e pontos e altera o repositório.",
        "impact": "Adulteração persistente de código/dados do desenvolvedor e HMR não confiável.",
        "condition": "Somente vite serve; o plugin usa apply: 'serve'. Requer porta de desenvolvimento acessível.",
        "fix": "Remover a escrita do Vite compartilhado ou limitar a loopback, flag local e endpoint autenticado.",
        "evidence": [
            (
                "frontend/vite.config.ts:5-7,13-15",
                "plugins: [react(), tailwindcss(), devSaveRegionPlugin()],\n"
                "server: { host: true, port: 5173, ... }",
            ),
            (
                "frontend/src/prototypes/worldmap/devSaveRegionPlugin.ts:10-12,32-39",
                "apply: 'serve',\n"
                "server.middlewares.use('/__save-region', async (req, res) => {\n"
                "  const source = await readFile(mockPath, 'utf8');\n"
                "  const updated = upsertRegion(source, biomeId, points);\n"
                "  await writeFile(mockPath, updated, 'utf8');\n"
                "});",
            ),
        ],
    },
    {
        "id": "SEC-07",
        "severity": "Alta",
        "category": "XSS",
        "title": "Coordenadas viram JavaScript persistente em mockData.ts",
        "refs": [
            "frontend/src/prototypes/worldmap/devSaveRegionPlugin.ts:19-31",
            "frontend/src/prototypes/worldmap/devSaveRegionPlugin.ts:87-94",
            "frontend/src/prototypes/worldmap/WorldMapPage.tsx:9,16",
        ],
        "description": (
            "O cast TypeScript não valida JSON em runtime; apenas Array.isArray é exigido. p.x e p.y são "
            "interpolados sem escape em código TypeScript gravado no repositório."
        ),
        "exploit": (
            "Uma string em y fecha o objeto, injeta um IIFE e reabre o objeto. Ao importar ou atualizar via HMR, "
            "o código roda no origin do frontend e pode agir com a sessão da vítima."
        ),
        "impact": "XSS persistente no ambiente dev e alteração de código-fonte com ações autenticadas pela vítima.",
        "condition": "Vite serve acessível e vítima carrega o módulo do mapa (ou recebe HMR).",
        "fix": "Validar números finitos/faixa e persistir JSON com JSON.stringify, nunca TypeScript interpolado.",
        "evidence": [
            (
                "frontend/src/prototypes/worldmap/devSaveRegionPlugin.ts:19-31",
                "const { biomeId, points } = JSON.parse(body) as { ... };\n"
                "if (!biomeId || !Array.isArray(points)) { ... }",
            ),
            (
                "frontend/src/prototypes/worldmap/devSaveRegionPlugin.ts:87-94",
                "const inner = points\n"
                "  .map((p) => `${indent}  { x: ${p.x}, y: ${p.y} },`)\n"
                "  .join('\\n');\n"
                "return `region: [\\n${inner}\\n${indent}],`;",
            ),
        ],
    },
    {
        "id": "SEC-08",
        "severity": "Alta",
        "category": "Chaves expostas",
        "title": "Startup cria dez contas com a senha pública seed123",
        "refs": [
            "backend/src/app.module.ts:12,52",
            "backend/src/seed/seed.service.ts:22-24",
            "backend/src/seed/seed.service.ts:26-40",
            "backend/src/seed/seed.service.ts:42-58",
            "backend/src/auth/auth.controller.ts:26-34",
            "backend/src/auth/auth.service.ts:31-60",
        ],
        "description": (
            "SeedModule é carregado sem condição e OnModuleInit cria dez e-mails previsíveis com a mesma senha "
            "hardcoded. As contas USER sem empresa continuam autenticáveis."
        ),
        "exploit": "Entrar no endpoint público de login com um dos e-mails seed e a senha publicada no código.",
        "impact": "Acesso não autorizado às funções autenticadas, manipulação de progresso, XP e recursos.",
        "condition": "seed-1 não existia no primeiro startup; uma vez criadas, as contas persistem.",
        "fix": "Remover seed do boot normal, bloquear em produção e eliminar/rotacionar contas existentes.",
        "evidence": [
            (
                "backend/src/seed/seed.service.ts:22-24,49-58",
                "async onModuleInit() {\n  await this.seedRankingUsers();\n}\n"
                "const passwordHash = bcrypt.hashSync('seed123', 10);\n"
                "for (const seed of seedUsers) {\n"
                "  ... password: passwordHash, role: Role.USER ...\n"
                "}",
            ),
        ],
    },
    {
        "id": "SEC-09",
        "severity": "Alta",
        "category": "Chaves expostas",
        "title": "Segredo JWT permanece em referência do histórico Git",
        "refs": [
            "commit 06bbb0c7... / backend/src/auth/constants.ts:3",
            "commit 06bbb0c7... / backend/src/auth/auth.module.ts:7,12-15",
            "commit 3641d626... (remoção, sem limpeza do histórico)",
            "refs/remotes/origin/master -> 06bbb0c7...",
        ],
        "description": (
            "O commit inicial contém um segredo JWT não-placeholder de 32 caracteres e o usa no JwtModule. A "
            "remoção posterior não apagou o objeto: origin/master ainda aponta para o commit vulnerável."
        ),
        "exploit": (
            "Se algum ambiente ainda aceitar o valor antigo, um atacante que lê o Git pode assinar JWT com sub e "
            "role arbitrários, inclusive admin."
        ),
        "impact": "Forja de sessão e possível comprometimento total do controle de acesso.",
        "condition": "Algum deployment ainda usa o segredo histórico. O JWT local atual foi verificado como diferente.",
        "fix": "Rotacionar todos os ambientes, invalidar sessões e reescrever todas as refs do histórico.",
        "evidence": [
            (
                "commit 06bbb0c7... / backend/src/auth/constants.ts:2-4",
                "export const jwtConstants = {\n"
                "  secret: '<REDIGIDO: segredo real de 32 caracteres>',\n"
                "};",
            ),
            (
                "commit 06bbb0c7... / backend/src/auth/auth.module.ts:12-15",
                "JwtModule.register({\n"
                "  global: true,\n"
                "  secret: jwtConstants.secret,\n"
                "  signOptions: { expiresIn: '60s' },\n"
                "}),",
            ),
        ],
    },
]


issues = [
    """--- ISSUE 1 ---
# [Segurança] Autenticar assinaturas WebSocket por JWT

Labels sugeridas: `security`, `alta`

## Descrição do problema
O gateway usa `handshake.query.userId` como identidade e entra diretamente em `user_<id>`. Não há validação de assinatura/expiração JWT, cookie, blacklist Redis nem comparação com o usuário informado.

Isso é explorável porque qualquer cliente Socket.IO que alcance o gateway escolhe o ID de outra pessoa. CORS restringe navegadores, mas não autentica clientes nativos.

## Evidência
`backend/src/gateway/app.gateway.ts:24-35`
```ts
const userId = Number(client.handshake.query.userId);
if (!userId || isNaN(userId)) { client.disconnect(); return; }
client.join(`user_${userId}`);
```

`backend/src/gateway/app.gateway.ts:45-56`
```ts
const room = `user_${payload.usuario_id}`;
this.server.to(room).emit('new-notification', payload);
```

## Impacto
Leitura de notificações futuras de outra pessoa, inclusive entre empresas.

## Sugestão de correção
Validar JWT no handshake usando o mesmo segredo, expiração e blacklist do HTTP. Derivar a sala exclusivamente de `payload.sub` e ignorar `query.userId`.

## Critérios de aceite
- [ ] Conexão sem token válido é recusada.
- [ ] Token expirado ou em blacklist é recusado.
- [ ] O room é derivado do `sub` autenticado.
- [ ] Informar outro `userId` não muda o room.
- [ ] Teste e2e prova que usuário A não recebe notificação de B.
--- FIM ISSUE 1 ---""",
    """--- ISSUE 2 ---
# [Segurança] Restringir notificações ao tenant do administrador

Labels sugeridas: `security`, `alta`

## Descrição do problema
`OwnershipGuard` libera todo `Role.ADMIN` antes da checagem de dono. As rotas de criar, buscar e marcar todas aceitam `usuario_id` controlado pelo cliente, e o service não valida `empresa_id`.

Um admin da empresa A pode agir sobre notificações de um usuário da empresa B.

## Evidência
`backend/src/auth/ownership.guard.ts:23-25`
```ts
if (user.role === Role.ADMIN) return true;
```

`backend/src/notification/notification.controller.ts:26-48,70-76`
```ts
@OwnerField('usuario_id', 'body')
@OwnerField('id', 'query')
@OwnerField('usuario_id', 'params')
```

`backend/src/notification/notification.service.ts:99-135`
```ts
where: { usuario_id }
```

## Impacto
Quebra cross-tenant de confidencialidade e integridade: leitura, inserção e alteração de notificações.

## Sugestão de correção
Passar o solicitante ao service e comparar a empresa do alvo com a empresa do admin. Se admin não precisa operar notificações de terceiros, remover o bypass.

## Critérios de aceite
- [ ] Admin só acessa usuários da própria empresa.
- [ ] ID de outra empresa retorna 403 ou 404.
- [ ] Usuário comum continua restrito ao próprio ID.
- [ ] Testes cobrem criar, buscar e marcar todas entre duas empresas.
--- FIM ISSUE 2 ---""",
    """--- ISSUE 3 ---
# [Segurança] Impor desbloqueio antes de retornar conteúdo da aula

Labels sugeridas: `security`, `média`

## Descrição do problema
O frontend desabilita aulas com status `locked`, mas `GET /conteudo/aulas/:id` busca apenas `{ id, active: true }` e retorna vídeo, páginas com URL S3 assinada e quiz sem executar `verificarDesbloqueio`.

## Evidência
`frontend/src/components/sections/HomePage/Conteudos/AulaListItem.tsx:19-26`
```tsx
const isLocked = aula.status === 'locked';
<button disabled={isLocked} />
```

`backend/src/conteudo/aula/aula.service.ts:49-100`
```ts
where: { id, active: true }
// retorna content_url, pages e quiz sem verificarDesbloqueio
```

`backend/src/conteudo/aula/aula.service.ts:354-377` contém a validação já usada nas escritas.

## Impacto
Usuário autenticado acessa material e perguntas antes de concluir a etapa anterior.

## Sugestão de correção
Chamar `verificarDesbloqueio(aula, usuario_id)` antes de resolver/assinar URLs. Para aula bloqueada, devolver 403 ou apenas metadados mínimos.

## Critérios de aceite
- [ ] GET de aula locked retorna 403 sem URLs ou quiz.
- [ ] Após concluir a anterior, o mesmo GET retorna conteúdo.
- [ ] Não é gerada URL S3 antes da autorização.
- [ ] Teste e2e cobre acesso direto por ID.
--- FIM ISSUE 3 ---""",
    """--- ISSUE 4 ---
# [Segurança] Vincular progresso e XP ao desafio diário

Labels sugeridas: `security`, `média`

## Descrição do problema
O backend seleciona/cacheia um desafio por usuário/dia, mas `questions`, `progress` e `submit` aceitam qualquer `challengeId` ativo. O ID recebido nunca é comparado ao valor `daily`.

## Evidência
`backend/src/challenge/challenge.service.ts:36-58,73-87`
```ts
const cacheKey = `daily-challenge:${usuario_id}`;
await this.redisService.set(cacheKey, JSON.stringify(challenge), ttl);
```

`backend/src/challenge/challenge.controller.ts:29-56` e `challenge.service.ts:113-230` operam sobre ID arbitrário. `challenge.service.ts:265-295` concede XP.

## Impacto
Conclusão de vários desafios no mesmo dia, inflação de XP e distorção de ranking/conquistas.

## Sugestão de correção
Resolver o desafio diário do chamador em todas as três operações e exigir igualdade, ou emitir um attempt token diário vinculado a usuário, desafio e data.

## Critérios de aceite
- [ ] Apenas o desafio diário pode fornecer perguntas/progresso/submit.
- [ ] ID ativo diferente retorna 403.
- [ ] Não há concessão de XP para tentativa inelegível.
- [ ] Teste e2e cobre dois challenges ativos no mesmo dia.
--- FIM ISSUE 4 ---""",
    """--- ISSUE 5 ---
# [Segurança] Separar administração de empresa e catálogo global

Labels sugeridas: `security`, `alta`

## Descrição do problema
O único papel `ADMIN` é usado para administrar uma empresa e também para mutar módulos, aulas, quizzes, Benefits e mídia globais. Esses objetos não têm `empresa_id`; updates/deletes usam apenas ID e as chaves S3 não incluem tenant.

Condição: o risco cross-tenant se materializa quando `ADMIN` é delegado a clientes, como indica a UI e as rotas `/admin/empresa`. Se todos os admins forem operadores globais, ainda falta um papel explícito e least privilege.

## Evidência
`backend/src/auth/roles.enum.ts:1-4`, `admin.controller.ts:11-12`

`backend/src/conteudo/modulo/modulo.controller.ts:31-49`, `aula.controller.ts:32-50`, `aula-quiz.controller.ts:24-45`, `conteudo/s3/upload.controller.ts:31-44`, `benefits/benefits.controller.ts:21-24,35-38`

`backend/src/conteudo/s3/s3.service.ts:59-72`
```ts
return `modulos/${moduloId}/aulas/${aulaId}/video`;
```

## Impacto
Admin de uma empresa pode alterar/excluir/reescrever conteúdo visto por todas as empresas.

## Sugestão de correção
Criar `PLATFORM_ADMIN` exclusivo para catálogos globais. Se o conteúdo for por empresa, adicionar `empresa_id`, filtros compostos e prefixo S3 por tenant em todos os reads/writes.

## Critérios de aceite
- [ ] ADMIN de empresa não muta catálogo global.
- [ ] PLATFORM_ADMIN é explicitamente provisionado e auditável.
- [ ] IDs de outro tenant retornam 403/404 quando o catálogo for tenant-scoped.
- [ ] Chaves S3 incluem tenant ou são restritas ao papel de plataforma.
- [ ] Testes usam duas empresas e dois administradores.
--- FIM ISSUE 5 ---""",
    """--- ISSUE 6 ---
# [Segurança] Isolar o editor dev e bloquear injeção em mockData.ts

Labels sugeridas: `security`, `alta`

## Descrição do problema
O plugin do Vite expõe `POST /__save-region` sem sessão/papel, com `host: true`, e sobrescreve `mockData.ts`. Além disso, o cast TypeScript não valida o JSON em runtime e `p.x`/`p.y` são interpolados diretamente em código TypeScript.

Uma string manipulada fecha o objeto, injeta um IIFE e persiste JavaScript executado ao importar/HMR do mapa.

## Evidência
`frontend/vite.config.ts:5-7,13-15`
```ts
plugins: [react(), tailwindcss(), devSaveRegionPlugin()],
server: { host: true, port: 5173 }
```

`frontend/src/prototypes/worldmap/devSaveRegionPlugin.ts:19-39,87-94`
```ts
if (!biomeId || !Array.isArray(points)) { ... }
.map((p) => `${indent}  { x: ${p.x}, y: ${p.y} },`)
await writeFile(mockPath, updated, 'utf8');
```

## Impacto
Adulteração remota do repositório e XSS persistente no origin do frontend de desenvolvimento.

## Sugestão de correção
Remover o endpoint de ambientes compartilhados; exigir flag local e bind loopback; autenticar/autorizar; validar schema runtime (`number`, finito, faixa 0..100, limites); persistir JSON via `JSON.stringify` em vez de gerar `.ts`.

## Critérios de aceite
- [ ] Endpoint não existe fora de modo local explícito.
- [ ] Sem sessão/papel autorizado retorna 401/403.
- [ ] Strings, NaN, infinito e fora de faixa retornam 400 sem alterar arquivo.
- [ ] Payload de injeção não compila nem executa.
- [ ] Testes confirmam persistência segura em dados, não código.
--- FIM ISSUE 6 ---""",
    """--- ISSUE 7 ---
# [Segurança] Remover contas seed com credencial pública

Labels sugeridas: `security`, `alta`

## Descrição do problema
`SeedModule` é carregado no boot normal e cria dez contas previsíveis com a mesma senha hardcoded `seed123`. A checagem evita nova inserção, mas não remove nem desativa contas já criadas.

## Evidência
`backend/src/app.module.ts:12,52`

`backend/src/seed/seed.service.ts:22-24,26-40,42-58`
```ts
async onModuleInit() { await this.seedRankingUsers(); }
const passwordHash = bcrypt.hashSync('seed123', 10);
```

`backend/src/auth/auth.controller.ts:26-34` expõe o login público.

## Impacto
Acesso não autorizado às áreas autenticadas e manipulação de progresso/XP.

## Sugestão de correção
Retirar a seed do startup. Permitir dados demo apenas com flag explícita fora de produção. Excluir, bloquear ou rotacionar as dez contas existentes.

## Critérios de aceite
- [ ] Boot de produção não cria `seed-%@secureplay.dev`.
- [ ] Aplicação falha se flag demo estiver ativa em produção.
- [ ] Login com `seed123` falha para todas as contas seed.
- [ ] Migração/operacional remove ou bloqueia contas existentes.
- [ ] Teste de integração cobre o boot de produção.
--- FIM ISSUE 7 ---""",
    """--- ISSUE 8 ---
# [Segurança] Rotacionar e remover segredo JWT do histórico Git

Labels sugeridas: `security`, `alta`

## Descrição do problema
O commit `06bbb0c7f79939cded30218cf82d92571be6e9e2` contém um segredo JWT real de 32 caracteres em `backend/src/auth/constants.ts:3` e o usa no `JwtModule`. A remoção no commit `3641d626...` não limpou o objeto; `refs/remotes/origin/master` ainda aponta para o commit vulnerável.

O valor foi redigido neste relatório. O segredo local atual é diferente, mas isso não prova a rotação em todos os ambientes.

## Evidência
`commit 06bbb0c7... / backend/src/auth/constants.ts:2-4`
```ts
export const jwtConstants = {
  secret: '<REDIGIDO: segredo real de 32 caracteres>',
};
```

`commit 06bbb0c7... / backend/src/auth/auth.module.ts:12-15`
```ts
secret: jwtConstants.secret,
```

## Impacto
Se ainda aceito por qualquer ambiente, permite forjar JWT com usuário e papel arbitrários.

## Sugestão de correção
Rotacionar todos os ambientes, invalidar sessões, reescrever todas as refs e coordenar force-push/novos clones. Manter segredo somente em secret manager e adicionar scanner no CI/pre-commit.

## Critérios de aceite
- [ ] Token assinado com o segredo antigo é rejeitado em todos os ambientes.
- [ ] Todas as sessões antigas foram invalidadas.
- [ ] Busca em todas as refs não encontra o literal.
- [ ] `origin/master` não aponta para objeto vulnerável.
- [ ] Startup rejeita segredo ausente ou fraco.
- [ ] Scanner de segredos bloqueia regressões.
--- FIM ISSUE 8 ---""",
]


severity_counts = {"Crítica": 0, "Alta": 7, "Média": 2, "Baixa": 0}
category_counts = {
    "Banco sem tranca": 2,
    "Permissão no navegador": 3,
    "IDOR": 1,
    "Chaves expostas": 2,
    "XSS": 1,
}

assert len(findings) == 9
assert sum(severity_counts.values()) == len(findings)
assert sum(category_counts.values()) == len(findings)
assert len(issues) == 8


def p(text: str, style: str = "AuditBody") -> Paragraph:
    return Paragraph(text, styles[style])


def code_block(code: str) -> Paragraph:
    return Paragraph(esc(code).replace("\n", "<br/>"), styles["AuditCode"])


def severity_badge(level: str) -> Paragraph:
    style_name = f"Severity-{level}"
    if style_name not in styles:
        styles.add(
            ParagraphStyle(
                name=style_name,
                fontName=FONT_BOLD,
                fontSize=6.8,
                leading=8.5,
                textColor=WHITE,
                alignment=TA_CENTER,
                backColor=SEVERITY_COLORS[level],
                borderColor=SEVERITY_COLORS[level],
                borderWidth=0.5,
                borderPadding=4,
            )
        )
    return Paragraph(level.upper(), styles[style_name])


def section_heading(number: str, title: str) -> list:
    return [
        Spacer(1, 2),
        p(f"<font color='#2563EB'>{esc(number)}</font>  {esc(title)}", "AuditH1"),
        HRFlowable(width="100%", thickness=0.8, color=BORDER, spaceAfter=7),
    ]


def metric_card(value: str, label: str, color: colors.Color) -> Table:
    data = [
        [Paragraph(value, ParagraphStyle(
            name=f"Metric-{value}-{label}", fontName=FONT_BOLD, fontSize=18,
            leading=20, textColor=color, alignment=TA_CENTER,
        ))],
        [Paragraph(label, ParagraphStyle(
            name=f"MetricLabel-{value}-{label}", fontName=FONT, fontSize=7.4,
            leading=9, textColor=MUTED, alignment=TA_CENTER,
        ))],
    ]
    table = Table(data, colWidths=[39 * mm], rowHeights=[10 * mm, 8 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return table


def donut_chart() -> Drawing:
    drawing = Drawing(250, 165)
    pie = Doughnut()
    pie.x = 10
    pie.y = 22
    pie.width = 120
    pie.height = 120
    pie.innerRadiusFraction = 0.58
    pie.startAngle = 90
    pie.direction = "clockwise"
    pie.data = [severity_counts["Alta"], severity_counts["Média"]]
    pie.labels = ["", ""]
    pie.slices[0].fillColor = HIGH
    pie.slices[1].fillColor = MEDIUM
    pie.slices.strokeColor = WHITE
    pie.slices.strokeWidth = 2
    drawing.add(pie)
    drawing.add(String(70, 84, "9", fontName=FONT_BOLD, fontSize=20, fillColor=NAVY, textAnchor="middle"))
    drawing.add(String(70, 69, "achados", fontName=FONT, fontSize=7.5, fillColor=MUTED, textAnchor="middle"))
    drawing.add(String(150, 122, "Severidade", fontName=FONT_BOLD, fontSize=9, fillColor=NAVY))
    legend = [(HIGH, "Alta", 7), (MEDIUM, "Média", 2), (CRITICAL, "Crítica", 0), (LOW, "Baixa", 0)]
    y = 100
    for color, label, value in legend:
        drawing.add(Rect(151, y - 4, 8, 8, fillColor=color, strokeColor=None))
        drawing.add(String(165, y - 2, f"{label}: {value}", fontName=FONT, fontSize=7.8, fillColor=SLATE))
        y -= 19
    return drawing


def category_chart() -> Drawing:
    labels = ["Isolamento", "Browser", "IDOR", "Segredos", "XSS"]
    values = [category_counts[name] for name in category_counts]
    palette = [CRITICAL, HIGH, MEDIUM, LOW, STRONG]
    drawing = Drawing(260, 165)
    chart = VerticalBarChart()
    chart.x = 31
    chart.y = 38
    chart.width = 210
    chart.height = 95
    chart.data = [values]
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = 4
    chart.valueAxis.valueStep = 1
    chart.valueAxis.labels.fontName = FONT
    chart.valueAxis.labels.fontSize = 6.5
    chart.valueAxis.strokeColor = BORDER
    chart.categoryAxis.categoryNames = labels
    chart.categoryAxis.labels.fontName = FONT
    chart.categoryAxis.labels.fontSize = 6.2
    chart.categoryAxis.labels.dy = -6
    chart.categoryAxis.strokeColor = BORDER
    chart.barWidth = 18
    chart.groupSpacing = 12
    chart.bars.strokeColor = None
    for index, color in enumerate(palette):
        chart.bars[(0, index)].fillColor = color
    drawing.add(chart)
    for index, value in enumerate(values):
        x = 50 + index * 42
        drawing.add(String(x, 139, str(value), fontName=FONT_BOLD, fontSize=7.2, fillColor=NAVY, textAnchor="middle"))
    return drawing


def draw_first_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setTitle("Relatório de Auditoria de Segurança — SecurePlay")
    canvas.setAuthor("SecurePlay Security Audit")
    canvas.setSubject("Auditoria de isolamento, autorização, IDOR, segredos e XSS")
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(NAVY_2)
    canvas.circle(PAGE_W - 30 * mm, PAGE_H - 32 * mm, 50 * mm, fill=1, stroke=0)
    canvas.setFillColor(HexColor("#1E3A8A"))
    canvas.circle(PAGE_W - 9 * mm, PAGE_H - 8 * mm, 30 * mm, fill=1, stroke=0)
    canvas.setFillColor(HexColor("#2563EB"))
    canvas.rect(0, 0, 7 * mm, PAGE_H, fill=1, stroke=0)
    canvas.setStrokeColor(HexColor("#334155"))
    canvas.line(MARGIN_X, 17 * mm, PAGE_W - MARGIN_X, 17 * mm)
    canvas.setFont(FONT, 7)
    canvas.setFillColor(HexColor("#94A3B8"))
    canvas.drawString(MARGIN_X, 10.5 * mm, "SecurePlay - auditoria independente do estado atual do código")
    canvas.drawRightString(PAGE_W - MARGIN_X, 10.5 * mm, "Página 1")
    canvas.restoreState()


def draw_later_pages(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN_X, PAGE_H - 15 * mm, PAGE_W - MARGIN_X, PAGE_H - 15 * mm)
    canvas.setFont(FONT_BOLD, 7.2)
    canvas.setFillColor(NAVY)
    canvas.drawString(MARGIN_X, PAGE_H - 11.5 * mm, "Relatório de Auditoria de Segurança — SecurePlay")
    canvas.setFont(FONT, 7)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 11.5 * mm, "30 de agosto de 2026")
    canvas.line(MARGIN_X, 15 * mm, PAGE_W - MARGIN_X, 15 * mm)
    canvas.drawString(MARGIN_X, 9.5 * mm, "CONFIDENCIAL - uso interno")
    canvas.drawRightString(PAGE_W - MARGIN_X, 9.5 * mm, f"Página {doc.page}")
    canvas.restoreState()


def finding_table() -> LongTable:
    rows = [[
        p("Severidade", "TableHeader"),
        p("Arquivo:linha", "TableHeader"),
        p("Descrição", "TableHeader"),
    ]]
    for finding in findings:
        refs = "<br/>".join(esc(ref) for ref in finding["refs"])
        description = (
            f"<b>{esc(finding['id'])} - {esc(finding['title'])}</b><br/>"
            f"{esc(finding['description'])}<br/>"
            f"<font color='#64748B'><b>Exploração:</b> {esc(finding['exploit'])}</font>"
        )
        rows.append([
            severity_badge(finding["severity"]),
            Paragraph(refs, styles["TableCell"]),
            Paragraph(description, styles["TableCell"]),
        ])
    table = LongTable(rows, colWidths=[23 * mm, 57 * mm, CONTENT_W - (80 * mm)], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
    ]))
    return table


def add_finding_detail(story: list, finding: dict) -> None:
    header = Table(
        [[
            Paragraph(f"{esc(finding['id'])} - {esc(finding['title'])}", styles["FindingTitle"]),
            severity_badge(finding["severity"]),
        ]],
        colWidths=[CONTENT_W - 31 * mm, 31 * mm],
    )
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
        ("LINEBEFORE", (0, 0), (0, 0), 4, SEVERITY_COLORS[finding["severity"]]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.extend([
        Spacer(1, 6),
        header,
        Spacer(1, 4),
        p(f"<b>Categoria:</b> {esc(finding['category'])}"),
        p(f"<b>Por que é explorável:</b> {esc(finding['exploit'])}"),
        p(f"<b>Impacto:</b> {esc(finding['impact'])}"),
        p(f"<b>Condição:</b> {esc(finding['condition'])}"),
        p(f"<b>Correção recomendada:</b> {esc(finding['fix'])}"),
        p("<b>Evidência de código:</b>", "AuditSmall"),
    ])
    for ref, snippet in finding["evidence"]:
        story.append(p(f"<font color='#2563EB'>{esc(ref)}</font>", "AuditSmall"))
        story.append(code_block(snippet))


def issue_flowable(issue: str) -> Paragraph:
    return Paragraph(esc(issue).replace("\n", "<br/>"), styles["IssueBlock"])


def controller_coverage_table() -> LongTable:
    coverage = [
        ("app.controller.ts", "2", "JWT global; sem acesso a objeto de terceiro", "Correto"),
        ("auth.controller.ts", "4 / 5 paths", "Login público; me/token/password vinculados ao caller", "Correto"),
        ("usuario.controller.ts", "0", "Sem handlers", "N/A"),
        ("admin.controller.ts", "7", "Tema, logo, usuários e convites por empresa do caller", "Correto"),
        ("convites.controller.ts", "2", "Token 256-bit, hash, validade, lock e empresa herdada", "Correto"),
        ("achievements.controller.ts", "5", "Wallet, métricas e cosméticos pelo caller", "Correto"),
        ("arcade.controller.ts", "4", "Run Redis usa caller + UUID; stats pelo caller", "Correto"),
        ("benefits.controller.ts", "3", "GET público; mutações globais pelo ADMIN de empresa", "SEC-05"),
        ("challenge.controller.ts", "5", "Owner correto; elegibilidade daily ausente em 3", "SEC-04"),
        ("modulo.controller.ts", "5", "Progresso do caller; CRUD global por ADMIN", "SEC-05"),
        ("aula.controller.ts", "7", "3 escritas owner-safe; GET locked e CRUD global", "SEC-03/05"),
        ("aula-quiz.controller.ts", "3", "CRUD global por ADMIN", "SEC-05"),
        ("upload.controller.ts", "1", "Presign global sem empresa/lookup", "SEC-05"),
        ("dashboard.controller.ts", "4", "Caller em stats/streak; scope company filtra empresa", "Correto"),
        ("notification.controller.ts", "5", "2 ações owner-safe; 3 bypassam tenant para ADMIN", "SEC-02"),
        ("Socket.IO gateway", "1 conexão", "Identidade declarada na query", "SEC-01"),
    ]
    rows = [[p("Arquivo", "TableHeader"), p("Handlers", "TableHeader"), p("Resultado", "TableHeader"), p("Status", "TableHeader")]]
    for file_name, handlers, result, status in coverage:
        status_color = STRONG if status == "Correto" else (MUTED if status == "N/A" else HIGH)
        rows.append([
            p(esc(file_name), "TableCellBold"),
            p(esc(handlers), "TableCell"),
            p(esc(result), "TableCell"),
            Paragraph(f"<font color='{status_color.hexval()}'><b>{esc(status)}</b></font>", styles["TableCell"]),
        ])
    table = LongTable(rows, colWidths=[44 * mm, 22 * mm, CONTENT_W - (91 * mm), 25 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
    ]))
    return table


def build_story() -> list:
    story: list = []

    story.extend([
        Spacer(1, 36 * mm),
        p("AUDITORIA DE SEGURANÇA DE APLICAÇÃO", "CoverKicker"),
        p("Relatório de Auditoria de Segurança — SecurePlay", "CoverTitle"),
        p(
            "Revisão integral do estado atual do código, com foco em isolamento de tenant/dono, "
            "autorização server-side, IDOR, segredos e XSS.",
            "CoverSubtitle",
        ),
        Spacer(1, 9 * mm),
    ])

    cover_table = Table(
        [
            [p("DATA", "CoverMeta"), p("ESCOPO", "CoverMeta")],
            [p("30 de agosto de 2026", "CoverMeta"), p("Backend, frontend, auth, MySQL, Redis, Socket.IO, S3, Git e bundle", "CoverMeta")],
            [p("ESTADO AUDITADO", "CoverMeta"), p("NOTA METODOLÓGICA", "CoverMeta")],
            [p("Worktree local atual, incluindo alterações não commitadas", "CoverMeta"), p("57 handlers HTTP, gateway, sinks XSS, 102 commits e 114 blobs Git inalcançáveis", "CoverMeta")],
        ],
        colWidths=[58 * mm, CONTENT_W - (58 * mm)],
    )
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#1E293B")),
        ("BOX", (0, 0), (-1, -1), 0.7, HexColor("#475569")),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, HexColor("#475569")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.extend([
        cover_table,
        Spacer(1, 8 * mm),
        p(
            "Mapeamento por stack: MySQL/TypeORM usa filtros manuais por usuario_id/empresa_id; "
            "NestJS usa JWT e RolesGuard globais; React/Vite foi revisado por gates, sinks e bundle; "
            "Git foi examinado em todas as refs e objetos alcançáveis/inalcançáveis.",
            "CoverMeta",
        ),
        PageBreak(),
    ])

    story.extend(section_heading("01", "Resumo executivo"))
    story.append(
        p(
            "Foram confirmados <b>9 achados</b>: 7 de severidade alta e 2 de severidade média. "
            "Os riscos centrais são confiança em identidade fornecida pelo cliente, controles de elegibilidade "
            "mantidos apenas no frontend, ausência de tenant-awareness em pontos administrativos, tooling de "
            "desenvolvimento que grava código e credenciais reutilizáveis."
        )
    )
    metrics = Table(
        [[
            metric_card("9", "ACHADOS", NAVY),
            metric_card("7", "ALTOS", HIGH),
            metric_card("2", "MÉDIOS", MEDIUM),
            metric_card("8", "ISSUES AGRUPADAS", STRONG),
        ]],
        colWidths=[CONTENT_W / 4] * 4,
    )
    metrics.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.extend([Spacer(1, 4), metrics, Spacer(1, 8)])
    charts = Table(
        [[donut_chart(), category_chart()]],
        colWidths=[CONTENT_W / 2, CONTENT_W / 2],
    )
    charts.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BACKGROUND", (0, 0), (-1, -1), WHITE),
    ]))
    story.extend([charts, Spacer(1, 7)])
    story.append(
        p(
            "<b>Leitura dos gráficos.</b> A categoria 'Permissão no navegador' reúne duas regras de "
            "elegibilidade não impostas no servidor e o endpoint privilegiado do editor dev. O achado XSS é "
            "contado separadamente, embora compartilhe a mesma issue do editor."
        )
    )

    story.extend(section_heading("02", "Stack, escopo e metodologia"))
    stack_rows = [
        [p("Camada", "TableHeader"), p("Tecnologia detectada", "TableHeader"), p("Mapeamento de segurança", "TableHeader")],
        [p("Backend", "TableCellBold"), p("Node.js/TypeScript, NestJS 11, Fastify", "TableCell"), p("JWT e RolesGuard globais; controllers/services revisados integralmente", "TableCell")],
        [p("Persistência", "TableCellBold"), p("TypeORM 0.3, MySQL", "TableCell"), p("Sem RLS; isolamento manual por usuario_id e empresa_id", "TableCell")],
        [p("Auth", "TableCellBold"), p("Passport JWT, cookie httpOnly, Bearer, bcrypt, Redis blacklist", "TableCell"), p("Principal vem de req.user; owner/tenant por filtros e guards", "TableCell")],
        [p("Frontend", "TableCellBold"), p("React 18, Vite 6, Tailwind 4, Axios, React Router", "TableCell"), p("Gates React cruzados com 20 handlers privilegiados; sinks XSS e URLs revisados", "TableCell")],
        [p("Tempo real/mídia", "TableCellBold"), p("Socket.IO, AWS S3", "TableCell"), p("Handshake, rooms, fanout e presigned URLs/chaves revisados", "TableCell")],
        [p("Deploy", "TableCellBold"), p("Somente frontend/serve.json", "TableCell"), p("Não há Docker, Compose, CI, Helm, Kubernetes ou Terraform, nem no histórico", "TableCell")],
    ]
    stack_table = Table(stack_rows, colWidths=[31 * mm, 58 * mm, CONTENT_W - (89 * mm)], repeatRows=1)
    stack_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([
        stack_table,
        Spacer(1, 6),
        p(
            "<b>Cobertura:</b> 15 controllers, 57 métodos HTTP (58 paths efetivos porque auth/me e auth/token "
            "compartilham handler), gateway Socket.IO, 164 arquivos TS/TSX frontend e 130 TS backend. O histórico "
            "foi percorrido em 102 commits, todas as refs/reflog e 114 blobs inalcançáveis. O bundle de produção "
            "foi recompilado em pasta temporária e escaneado."
        ),
        p(
            "<b>Limites:</b> análise estática e build local. Não houve conexão com MySQL/Redis/S3, teste de "
            "credenciais externas, DAST em deployment real ou publicação de dados. O segredo histórico foi "
            "redigido. Nenhuma issue foi criada no GitHub."
        ),
    ])

    story.extend(section_heading("03", "Pontos fortes e pontos fracos"))
    strengths = [
        ("RBAC server-side", "JWT e RolesGuard são globais; os 20 handlers privilegiados Nest possuem @Roles(ADMIN)."),
        ("Admin por empresa", "Tema/logo/usuários/convites derivam a empresa do caller; revogação usa {id, empresa_id}."),
        ("Convites", "Token aleatório de 32 bytes, SHA-256 em repouso, validade/uso, lock pessimista e empresa herdada."),
        ("Owner por usuário", "Achievements, arcade, progresso de conteúdo, stats e duas ações unitárias de notificação usam caller/comparação composta."),
        ("XSS comum", "React mantém escaping; não há raw HTML, Markdown, templates HTML ou e-mail; avatar codifica o nome."),
        ("Segredos atuais", "JWT ausente impede startup; .env está ignorado e seus valores não aparecem no Git nem no bundle atual."),
    ]
    weaknesses = [
        ("Identidade do socket", "Room deriva de query.userId, não do token."),
        ("Tenant admin", "OwnershipGuard libera ADMIN e papéis de empresa/plataforma são indistintos."),
        ("Regras só na UI", "Aulas locked e daily challenge não são impostos em toda rota sensível."),
        ("Tooling exposto", "Vite em host:true grava TypeScript e aceita valores sem validação runtime."),
        ("Credenciais", "Seed pública no startup e segredo JWT preservado em ref histórica."),
    ]
    strong_rows = [[p("PONTOS FORTES", "TableHeader"), p("PONTOS FRACOS", "TableHeader")]]
    max_len = max(len(strengths), len(weaknesses))
    for index in range(max_len):
        left = strengths[index] if index < len(strengths) else ("", "")
        right = weaknesses[index] if index < len(weaknesses) else ("", "")
        strong_rows.append([
            Paragraph(f"<font color='#059669'><b>{esc(left[0])}</b></font><br/>{esc(left[1])}", styles["TableCell"]),
            Paragraph(f"<font color='#B91C1C'><b>{esc(right[0])}</b></font><br/>{esc(right[1])}", styles["TableCell"]),
        ])
    strong_table = Table(strong_rows, colWidths=[CONTENT_W / 2] * 2, repeatRows=1)
    strong_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), STRONG),
        ("BACKGROUND", (1, 0), (1, 0), CRITICAL),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([strong_table, Spacer(1, 7)])
    story.append(p("Cobertura de controllers e handlers", "AuditH2"))
    story.append(controller_coverage_table())

    story.extend(section_heading("04", "Achados detalhados por categoria"))
    story.append(finding_table())
    story.append(PageBreak())
    story.extend(section_heading("05", "Evidências, explorabilidade e correção"))
    for finding in findings:
        add_finding_detail(story, finding)

    story.extend(section_heading("06", "Recomendações priorizadas"))
    recommendations = [
        ("P1", "Isolar o editor dev", "Desligar o endpoint por padrão, bind loopback, autorização, validação runtime e persistência JSON.", "SEC-06/07"),
        ("P2", "Autenticar Socket.IO", "Validar JWT/blacklist no handshake e derivar o room do sub.", "SEC-01"),
        ("P3", "Eliminar credenciais seed", "Remover SeedModule do boot e bloquear/rotacionar contas existentes.", "SEC-08"),
        ("P4", "Rotacionar e limpar JWT", "Invalidar sessões e reescrever todas as refs que preservam o segredo.", "SEC-09"),
        ("P5", "Tenant-aware notifications", "Comparar empresa do solicitante e do alvo em criar/listar/marcar todas.", "SEC-02"),
        ("P6", "Separar papéis de plataforma", "Criar PLATFORM_ADMIN ou tornar todos os catálogos tenant-scoped.", "SEC-05"),
        ("P7", "Impor desbloqueio no GET", "Verificar pré-requisito antes de retornar URL ou quiz de aula.", "SEC-03"),
        ("P8", "Impor elegibilidade diária", "Vincular questions/progress/submit ao daily ou attempt token diário.", "SEC-04"),
    ]
    rec_rows = [[p("Prioridade", "TableHeader"), p("Ação", "TableHeader"), p("Resultado esperado", "TableHeader"), p("Achado", "TableHeader")]]
    for priority, action, result, finding_id in recommendations:
        rec_rows.append([
            Paragraph(f"<b>{priority}</b>", styles["TableCell"]),
            p(esc(action), "TableCellBold"),
            p(esc(result), "TableCell"),
            p(esc(finding_id), "TableCell"),
        ])
    rec_table = Table(rec_rows, colWidths=[19 * mm, 45 * mm, CONTENT_W - (88 * mm), 24 * mm], repeatRows=1)
    rec_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([
        rec_table,
        Spacer(1, 8),
        p(
            "<b>Sequenciamento:</b> P1-P4 reduzem superfícies de acesso imediato/credenciais; P5-P6 corrigem "
            "fronteiras de tenant e privilégio; P7-P8 fecham regras de progressão e integridade da economia."
        ),
        PageBreak(),
    ])

    story.extend(section_heading("07", "ISSUES PARA O GITHUB"))
    story.append(
        p(
            "Textos completos em Markdown, prontos para copiar e colar. Achados SEC-06 e SEC-07 foram agrupados "
            "em uma única issue porque compartilham o mesmo endpoint e correção. Nenhuma issue foi publicada."
        )
    )
    for issue in issues:
        story.append(issue_flowable(issue))

    story.extend([
        Spacer(1, 8),
        HRFlowable(width="100%", thickness=0.8, color=BORDER),
        Spacer(1, 5),
        p(
            "Fim do relatório. Contagens e evidências refletem o worktree local auditado em 30/08/2026; "
            "alterações posteriores exigem nova execução do script e nova revisão de código.",
            "AuditSmall",
        ),
    ])
    return story


def generate() -> Path:
    OUTPUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT_PDF),
        pagesize=A4,
        rightMargin=MARGIN_X,
        leftMargin=MARGIN_X,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title="Relatório de Auditoria de Segurança — SecurePlay",
        author="SecurePlay Security Audit",
        subject="Auditoria de isolamento, autorização, IDOR, segredos e XSS",
    )
    document.build(build_story(), onFirstPage=draw_first_page, onLaterPages=draw_later_pages)
    return OUTPUT_PDF


if __name__ == "__main__":
    result = generate()
    print(result)
