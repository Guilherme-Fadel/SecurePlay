# Dicionários do Palavra Secreta

O jogo mantém dois repertórios separados:

- `termoWords.ts` contém somente as palavras pedagógicas de tecnologia que podem ser sorteadas, junto com suas dicas.
- Os palpites adicionais são validados pelo backend nos vocabulários português e inglês. Eles nunca passam a ser respostas sorteáveis automaticamente.

## Provedores

- Português: [Dicionário Aberto](https://api.dicionario-aberto.net/index.html).
- Inglês: [Datamuse API](https://www.datamuse.com/api/), usando correspondência exata sobre seu vocabulário inglês.

Somente a palavra de cinco letras é enviada aos provedores. Nenhum identificador do estudante acompanha essas consultas. Resultados válidos ficam em cache por 24 horas; resultados inválidos, por uma hora.

O Datamuse informa que exigirá uma chave de API a partir de 1º de janeiro de 2027. Antes dessa data, a configuração do provedor deve ser revista conforme a documentação atualizada do serviço.

## Proteção infantil

Termos impróprios em português e inglês são bloqueados no backend antes da consulta externa. A interface exibe uma mensagem neutra, não registra a tentativa e não repete o conteúdo bloqueado.
