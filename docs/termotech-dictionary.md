# Dicionários do Palavra Secreta

O jogo mantém dois repertórios separados:

- `termoWords.ts` contém somente as palavras pedagógicas de tecnologia que podem ser sorteadas, junto com suas dicas.
- `frontend/public/dictionaries/termotech-valid-words-5.txt` contém um vocabulário amplo usado apenas para validar palpites. Ele nunca passa a ser repertório sorteável automaticamente.

## Geração

O arquivo local é gerado por `npm run build:termotech-dictionary` a partir de:

- `dictionary-pt`, dicionário hunspell de português derivado do LibreOffice.
- `an-array-of-english-words`, lista ampla de palavras em inglês.

Durante a geração, as palavras são normalizadas sem acentos, filtradas para exatamente cinco letras e salvas em maiúsculas. A validação normal roda no navegador contra esse arquivo, carregado quando o jogo abre e mantido em cache pelo browser.

## Proteção infantil

Termos impróprios em português e inglês são excluídos antes da geração do arquivo público. Como esses termos não entram no vocabulário local, a interface recusa a palavra sem registrar tentativa e exibe a mesma mensagem neutra usada para termos inexistentes.

## Verificação

Use `npm run test:termotech-dictionary` para confirmar que o arquivo contém casos esperados, como `CYBER`, `PRIME` e `PRIDE`, e que sequências inexistentes ou bloqueadas não foram incluídas.
