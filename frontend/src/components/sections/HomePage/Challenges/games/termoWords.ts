// Dicionario do Termo Tech.
// - ANSWERS: palavras de tecnologia/seguranca (5 letras) sorteadas como resposta.
// - VALID: conjunto amplo aceito como palpite (ANSWERS + palavras comuns EN).
// Tudo offline para nao depender de API instavel. Futuramente pode vir de
// GET /termo/word (resposta do dia) e GET /termo/validate (validacao).

// Respostas tematicas (todas com exatamente 5 letras, maiusculas, sem acento).
export const ANSWERS: string[] = [
  'CACHE', 'LOGIN', 'PROXY', 'TOKEN', 'BYTES', 'STACK', 'QUERY', 'ARRAY',
  'CLASS', 'DEBUG', 'EMAIL', 'MOUSE', 'PIXEL', 'VIRUS', 'CLOUD', 'CYBER',
  'PATCH', 'FRAME', 'INPUT', 'MACRO', 'MODEM', 'LINUX', 'REACT', 'REDIS',
  'REGEX', 'SCOPE', 'SHELL', 'SLASH', 'SPLIT', 'FETCH', 'MERGE', 'CLONE',
  'BUILD', 'FLASK', 'NGINX', 'PANIC', 'RETRY', 'ASYNC', 'AWAIT', 'INDEX',
  'QUEUE', 'STORE', 'TABLE', 'TRACE', 'VALUE', 'WRITE', 'PARSE', 'BLOCK',
  'CHAIN', 'CRYPT', 'FRAUD', 'GHOST', 'MEDIA', 'PHONE', 'ROBOT', 'SPARK',
];

// Palavras comuns em ingles (5 letras) para ampliar a aceitacao de palpites.
// Nao sao usadas como resposta, apenas para validar o que o jogador digita.
const COMMON: string[] = [
  'ABOUT', 'ABOVE', 'ADMIN', 'AGENT', 'ALARM', 'ALERT', 'ALIVE', 'ALLOW',
  'ALONE', 'ALPHA', 'ANGLE', 'APPLE', 'APPLY', 'AUDIO', 'BADGE', 'BASIC',
  'BEACH', 'BEGIN', 'BOARD', 'BRAIN', 'BRAND', 'BREAK', 'BRING', 'BROWN',
  'BRUSH', 'CABLE', 'CANDY', 'CARRY', 'CATCH', 'CAUSE', 'CHAIR', 'CHART',
  'CHASE', 'CHEAP', 'CHECK', 'CHESS', 'CHILD', 'CLAIM', 'CLEAN', 'CLEAR',
  'CLICK', 'CLIMB', 'CLOCK', 'CLOSE', 'COACH', 'COAST', 'COLOR', 'COUNT',
  'COURT', 'COVER', 'CRAFT', 'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CROSS',
  'CROWD', 'CROWN', 'CURVE', 'DAILY', 'DANCE', 'DEALT', 'DEATH', 'DELAY',
  'DEPTH', 'DIARY', 'DIRTY', 'DOZEN', 'DRAFT', 'DRAMA', 'DREAM', 'DRESS',
  'DRINK', 'DRIVE', 'EAGER', 'EARLY', 'EARTH', 'EIGHT', 'ELECT', 'EMPTY',
  'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY',
  'EXACT', 'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FAVOR', 'FIELD',
  'FIGHT', 'FINAL', 'FIRST', 'FLASH', 'FLEET', 'FLOOR', 'FOCUS', 'FORCE',
  'FORTH', 'FORTY', 'FORUM', 'FOUND', 'FRESH', 'FRONT', 'FRUIT', 'FUNNY',
  'GIANT', 'GLASS', 'GLOBE', 'GRACE', 'GRADE', 'GRAND', 'GRANT', 'GRASS',
  'GREAT', 'GREEN', 'GROUP', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'HAPPY',
  'HEART', 'HEAVY', 'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'IDEAL', 'IMAGE',
  'ISSUE', 'JOINT', 'JUDGE', 'KNIFE', 'KNOWN', 'LABEL', 'LARGE', 'LASER',
  'LAYER', 'LEARN', 'LEAST', 'LEAVE', 'LEGAL', 'LEVEL', 'LIGHT', 'LIMIT',
  'LOCAL', 'LOGIC', 'LOOSE', 'LOWER', 'LUCKY', 'LUNCH', 'MAGIC', 'MAJOR',
  'MARCH', 'MATCH', 'METAL', 'MIGHT', 'MINOR', 'MINUS', 'MONEY', 'MONTH',
  'MORAL', 'MOTOR', 'MOUNT', 'MOVIE', 'MUSIC', 'NIGHT', 'NOISE', 'NORTH',
  'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'ORDER', 'OTHER', 'OUGHT',
  'PAINT', 'PANEL', 'PAPER', 'PARTY', 'PEACE', 'PHASE', 'PHOTO', 'PIANO',
  'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE',
  'POINT', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT',
  'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE', 'QUICK', 'QUIET', 'QUITE',
  'RADIO', 'RAISE', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'READY', 'REFER',
  'RIGHT', 'RIVAL', 'RIVER', 'ROUND', 'ROUTE', 'ROYAL', 'RURAL', 'SCALE',
  'SCENE', 'SCORE', 'SENSE', 'SERVE', 'SEVEN', 'SHALL', 'SHAPE', 'SHARE',
  'SHARP', 'SHEET', 'SHELF', 'SHIFT', 'SHINE', 'SHIRT', 'SHOCK', 'SHOOT',
  'SHORT', 'SIGHT', 'SILLY', 'SINCE', 'SIXTH', 'SIXTY', 'SKILL', 'SLEEP',
  'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY',
  'SOUND', 'SOUTH', 'SPACE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPORT',
  'STAFF', 'STAGE', 'STAND', 'START', 'STATE', 'STEAM', 'STEEL', 'STICK',
  'STILL', 'STOCK', 'STONE', 'STOOD', 'STORM', 'STORY', 'STUDY', 'STUFF',
  'STYLE', 'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TASTE', 'TEACH', 'TEETH',
  'THANK', 'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK', 'THIRD',
  'THOSE', 'THREE', 'THREW', 'THROW', 'TIGHT', 'TIMER', 'TITLE', 'TODAY',
  'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN',
  'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRUCK', 'TRULY', 'TRUST',
  'TRUTH', 'TWICE', 'UNCLE', 'UNDER', 'UNION', 'UNITY', 'UNTIL', 'UPPER',
  'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VITAL', 'VOICE', 'WASTE', 'WATCH',
  'WATER', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE',
  'WOMAN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WOUND',
  'WRIST', 'WRONG', 'YOUNG', 'YOUTH',
];

// Conjunto de validacao (rapido de consultar).
const VALID = new Set<string>([...ANSWERS, ...COMMON]);

// Palavra do dia: deterministica pelo numero de dias desde uma epoca fixa.
export function getWordOfTheDay(date = new Date()): string {
  const epoch = Date.UTC(2026, 0, 1);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayIndex = Math.floor((today - epoch) / 86400000);
  const idx = ((dayIndex % ANSWERS.length) + ANSWERS.length) % ANSWERS.length;
  return ANSWERS[idx];
}

export function isValidWord(word: string): boolean {
  return VALID.has(word.toUpperCase());
}
