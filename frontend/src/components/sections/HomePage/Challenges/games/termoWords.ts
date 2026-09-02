export type WordOfTheDay = {
  word: string;
  hint: string;
};

export const ANSWERS: WordOfTheDay[] = [
  { word: 'SENHA', hint: 'Ela protege a sua conta. Não conte para ninguém.' },
  { word: 'VIRUS', hint: 'Um programa perigoso que pode deixar o computador doente.' },
  { word: 'EMAIL', hint: 'Uma mensagem que chega pela internet.' },
  { word: 'NUVEM', hint: 'Lugar na internet onde arquivos podem ficar guardados.' },
  { word: 'DADOS', hint: 'Informações que devemos cuidar com atenção.' },
  { word: 'REDES', hint: 'Lugares da internet para conversar e compartilhar.' },
  { word: 'JOGOS', hint: 'Missões divertidas para aprender brincando.' },
  { word: 'VIDEO', hint: 'Imagem que se mexe na tela.' },
  { word: 'MOUSE', hint: 'Ajudante usado para apontar e clicar no computador.' },
  { word: 'PIXEL', hint: 'Pequeno quadradinho que ajuda a formar uma imagem na tela.' },
  { word: 'BOTAO', hint: 'Você aperta este item para fazer algo acontecer na tela.' },
  { word: 'FOTOS', hint: 'Imagens de momentos que merecem cuidado ao compartilhar.' },
  { word: 'CHAVE', hint: 'Também pode ser uma forma de abrir algo protegido.' },
  { word: 'SITES', hint: 'Páginas que visitamos na internet.' },
  { word: 'AVISO', hint: 'Um sinal importante para parar e prestar atenção.' },
  { word: 'SINAL', hint: 'Algo que pode mostrar se uma mensagem é segura ou estranha.' },
  { word: 'DICAS', hint: 'Pequenas ajudas para descobrir uma resposta.' },
  { word: 'AMIGO', hint: 'Pessoa que respeita você e suas informações.' },
  { word: 'GRUPO', hint: 'Pessoas reunidas para aprender ou brincar juntas.' },
  { word: 'TELAS', hint: 'Elas mostram imagens, jogos e mensagens.' },
];

const KID_FRIENDLY_GUESSES = [
  'AGORA', 'ALUNO', 'AMIGO', 'ANTES', 'APOIO', 'AVISO', 'BOLAS', 'BOTAO',
  'CABOS', 'CAIXA', 'CALMA', 'CANAL', 'CARTA', 'CHAVE', 'CINCO', 'CLARO',
  'COISA', 'CORES', 'CONTA', 'COPIA', 'CUIDA', 'DADOS', 'DICAS', 'EMAIL',
  'FALAR', 'FOTOS', 'FRASE', 'GRUPO', 'IDEIA', 'JOGOS', 'LETRA', 'LIGAR',
  'LIVRO', 'MAGIA', 'MOUSE', 'MUNDO', 'NOMES', 'NUVEM', 'PASTA', 'PIXEL',
  'REDES', 'SENHA', 'SINAL', 'SITES', 'TELAS', 'TEXTO', 'VIDEO', 'VIRUS',
  'VOCE',
];

const VALID = new Set<string>([
  ...ANSWERS.map(({ word }) => word),
  ...KID_FRIENDLY_GUESSES,
]);

export function getWordOfTheDayDetails(date = new Date()): WordOfTheDay {
  const epoch = Date.UTC(2026, 0, 1);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayIndex = Math.floor((today - epoch) / 86400000);
  const index = ((dayIndex % ANSWERS.length) + ANSWERS.length) % ANSWERS.length;
  return ANSWERS[index];
}

export function getWordOfTheDay(date = new Date()): string {
  return getWordOfTheDayDetails(date).word;
}

export function isValidWord(word: string): boolean {
  return VALID.has(word.toUpperCase());
}
