# Carga das aulas textuais do primeiro piloto

Fonte: 24 DOCX da pasta do Drive indicada na demanda `SP-20260930-pilot-real-lessons`.
O arquivo `data/pilot-lessons-2026.json` contém as páginas de leitura e três questões específicas por aula, adaptadas desses roteiros. Vídeos e quadrinhos descritos nos documentos ainda precisam ser produzidos; esta carga não publica mídia inexistente.

## Preparação

Use `backend/.env` com `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` do banco alvo. Não grave credenciais nos scripts. Os comandos abaixo são executados na pasta `backend/`:

```powershell
npm run db:pilot-schema
npm run db:pilot-schema -- --write
npm run db:pilot-lessons
npm run db:pilot-lessons -- --write
npm run db:pilot-lessons
```

Os comandos sem `--write` só leem e mostram a prévia. `db:pilot-schema -- --write` aplica aditivamente o tipo `texto` nos enums e a coluna `modulo.learning_path`; desliga a sincronização automática do TypeORM durante a execução. `db:pilot-lessons -- --write` usa transação e bloqueio nomeado, só insere quando a trilha `piloto-2026` está ausente e verifica as 24 aulas/72 questões depois. Uma segunda execução íntegra é um no-op. Divergências ou uma importação parcial fazem o script falhar sem sobrescrever registros.

O catálogo é global no modelo atual; o usuário confirmou visibilidade para as duas empresas do banco local. A trilha `piloto-2026` progride independentemente da trilha principal, então os módulos e o progresso anteriores mantêm a sequência atual. A importação não altera contas, pontuação já ganha nem progresso.

## Verificação e recuperação

Depois de atualizar o backend e o frontend em execução com este código, confirme que o módulo `Piloto 2026 · Segurança Digital` aparece com 24 aulas e que a primeira abre quatro páginas de texto seguidas de três questões. Verifique a segunda execução em prévia: ela deve dizer `Carga já íntegra`.

Para retirar temporariamente o conteúdo de circulação, desative o módulo **e as 24 aulas importadas** após identificar o `moduleId` pelo script e confirmar os vínculos. Desativar preserva progresso; exclusão física pode quebrar vínculos de `usuario_aula` e não é o rollback padrão. Antes de reverter o schema, remova ou converta todos os registros `texto` e qualquer trilha diferente de `principal` em um ambiente controlado.

O banco local observado em 30/09/2026 não tinha tabela `migrations`, embora tenha o schema e o catálogo existentes. `db:migrate` não deve ser usado nesse banco sem estabelecer uma baseline das migrações. A migração `1790726400000` existe para ambientes com histórico normal; o aplicador específico acima cobre a base local já sincronizada.
