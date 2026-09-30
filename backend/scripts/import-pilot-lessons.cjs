#!/usr/bin/env node
'use strict';

const mysql = require('mysql2/promise');
const source = require('./data/pilot-lessons-2026.json');

const MODULE = Object.freeze({
  title: 'Piloto 2026 · Segurança Digital',
  description: '24 aulas de leitura e avaliação baseadas nos roteiros do primeiro piloto.',
  type: 'texto',
  category: 'Segurança digital',
  difficulty: 'iniciante',
  xp_total: 10150,
  xp_bonus: 0,
  order: 1,
  learning_path: 'piloto-2026',
  active: 1,
});
const CHAPTERS = [
  'Fundamentos e golpes',
  'Privacidade e informação',
  'IA e proteção do dispositivo',
  'Escolhas e resposta',
];
const write = process.argv.includes('--write');
if (process.argv.slice(2).some((arg) => arg !== '--write')) {
  console.error('Uso: npm run db:pilot-lessons [-- --write]');
  process.exit(2);
}

function expectedLesson(item) {
  return {
    title: item.title,
    description: item.objective,
    type: 'texto',
    content_url: null,
    pages: item.pages,
    duration: 3,
    xp: item.xp,
    order: item.number,
    section_name: CHAPTERS[Math.floor((item.number - 1) / 6)],
    active: 1,
  };
}

function assertSource() {
  const lessons = source.lessons;
  if (source.version !== 1 || !Array.isArray(lessons) || lessons.length !== 24) {
    throw new Error('A fonte deve conter exatamente as 24 aulas revisadas do piloto.');
  }
  if (new Set(lessons.map((item) => item.sourceId)).size !== 24) {
    throw new Error('Há fontes do Drive duplicadas na carga.');
  }
  if (lessons.reduce((total, item) => total + item.xp, 0) !== MODULE.xp_total) {
    throw new Error('A soma de XP da fonte difere da definição do módulo.');
  }
  lessons.forEach((item, index) => {
    if (item.number !== index + 1 || !item.sourceId || !item.title ||
        item.title.length > 150 || !item.objective || item.objective.length > 1000 ||
        !Number.isInteger(item.xp) || item.xp < 0 ||
        !Array.isArray(item.pages) || item.pages.length < 2 ||
        item.pages.some((page) => typeof page !== 'string' || !page.trim()) ||
        !Array.isArray(item.quiz) || item.quiz.length !== 3) {
      throw new Error(`Aula ${index + 1} contém dados ausentes ou inválidos.`);
    }
    item.quiz.forEach((question) => {
      if (!question.text || question.text.length > 500 ||
          !Array.isArray(question.options) || question.options.length !== 4 ||
          new Set(question.options).size !== 4 ||
          question.options.some((option) => typeof option !== 'string' || !option.trim()) ||
          !Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
        throw new Error(`Quiz inválido na aula ${item.number}.`);
      }
    });
  });
}

function compare(actual, expected, fields, label) {
  for (const field of fields) {
    const value = field === 'pages' || field === 'options'
      ? (typeof actual[field] === 'string' ? JSON.parse(actual[field]) : actual[field])
      : actual[field];
    if (JSON.stringify(value) !== JSON.stringify(expected[field])) {
      throw new Error(`${label}: campo ${field} difere. Nada foi sobrescrito.`);
    }
  }
}

async function assertSchema(connection) {
  const [rows] = await connection.query(
    'SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND ((TABLE_NAME = ? AND COLUMN_NAME IN (?, ?)) OR (TABLE_NAME = ? AND COLUMN_NAME = ?))',
    ['modulo', 'learning_path', 'type', 'aula', 'type'],
  );
  const byKey = new Map(rows.map((row) => [`${row.TABLE_NAME}.${row.COLUMN_NAME}`, row]));
  if (!byKey.has('modulo.learning_path') ||
      !String(byKey.get('modulo.type')?.COLUMN_TYPE).includes("'texto'") ||
      !String(byKey.get('aula.type')?.COLUMN_TYPE).includes("'texto'")) {
    throw new Error('Schema textual ausente. Execute db:pilot-schema -- --write primeiro.');
  }
}

async function inspectExisting(connection) {
  const [modules] = await connection.query(
    'SELECT * FROM `modulo` WHERE `learning_path` = ?', [MODULE.learning_path],
  );
  if (modules.length > 1) throw new Error('Há mais de um módulo na trilha do piloto.');
  if (!modules.length) return { state: 'absent' };

  const module = modules[0];
  compare(module, MODULE, Object.keys(MODULE), 'Módulo do piloto');
  const [aulas] = await connection.query(
    'SELECT * FROM `aula` WHERE `modulo_id` = ? ORDER BY `order`, `id`', [module.id],
  );
  if (aulas.length !== source.lessons.length) {
    throw new Error(`Módulo existente contém ${aulas.length} aulas; esperado 24. Nada será alterado.`);
  }
  for (const [index, aula] of aulas.entries()) {
    const item = source.lessons[index];
    compare(aula, expectedLesson(item), Object.keys(expectedLesson(item)), `Aula ${item.number}`);
    const [quizzes] = await connection.query(
      'SELECT * FROM `aula_quiz` WHERE `aula_id` = ? ORDER BY `order`, `id`', [aula.id],
    );
    if (quizzes.length !== item.quiz.length) {
      throw new Error(`Aula ${item.number} possui ${quizzes.length} questões; esperado 3.`);
    }
    quizzes.forEach((question, questionIndex) => {
      const expected = item.quiz[questionIndex];
      compare(question, {
        text: expected.text,
        options: expected.options,
        correct_index: expected.correctIndex,
        order: questionIndex + 1,
      }, ['text', 'options', 'correct_index', 'order'], `Quiz ${item.number}.${questionIndex + 1}`);
    });
  }
  return { state: 'complete', moduleId: module.id };
}

async function insertCatalog(connection) {
  const [moduleResult] = await connection.execute(
    'INSERT INTO `modulo` (`title`,`description`,`type`,`category`,`learning_path`,`difficulty`,`xp_total`,`xp_bonus`,`order`,`active`) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [MODULE.title, MODULE.description, MODULE.type, MODULE.category,
      MODULE.learning_path, MODULE.difficulty, MODULE.xp_total,
      MODULE.xp_bonus, MODULE.order, MODULE.active],
  );
  for (const item of source.lessons) {
    const aula = expectedLesson(item);
    const [lessonResult] = await connection.execute(
      'INSERT INTO `aula` (`modulo_id`,`title`,`description`,`type`,`content_url`,`pages`,`duration`,`xp`,`order`,`section_name`,`active`) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [moduleResult.insertId, aula.title, aula.description, aula.type, aula.content_url,
        JSON.stringify(aula.pages), aula.duration, aula.xp, aula.order,
        aula.section_name, aula.active],
    );
    for (const [questionIndex, question] of item.quiz.entries()) {
      await connection.execute(
        'INSERT INTO `aula_quiz` (`aula_id`,`text`,`options`,`correct_index`,`order`) VALUES (?,?,?,?,?)',
        [lessonResult.insertId, question.text, JSON.stringify(question.options),
          question.correctIndex, questionIndex + 1],
      );
    }
  }
  return moduleResult.insertId;
}

async function main() {
  assertSource();
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  let locked = false;
  try {
    await assertSchema(connection);
    if (write) {
      const [[result]] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired', ['secureplay-pilot-2026']);
      if (result.acquired !== 1) throw new Error('Outra carga do piloto está em andamento.');
      locked = true;
      await connection.beginTransaction();
    }
    const current = await inspectExisting(connection);
    if (current.state === 'complete') {
      if (write) await connection.commit();
      console.log(`Carga já íntegra: módulo ${current.moduleId}, 24 aulas, 72 questões. Nenhuma alteração.`);
      return;
    }
    if (!write) {
      console.log('Prévia: inserir 1 módulo, 24 aulas, 72 questões e 10150 XP de catálogo. Nenhum dado alterado.');
      return;
    }
    const moduleId = await insertCatalog(connection);
    await connection.commit();
    const verified = await inspectExisting(connection);
    if (verified.state !== 'complete' || verified.moduleId !== moduleId) {
      throw new Error('Carga gravada, mas a verificação posterior falhou. Inspecione antes de repetir.');
    }
    console.log(`Carga confirmada: módulo ${moduleId}, 24 aulas, 72 questões.`);
  } catch (error) {
    if (write) await connection.rollback();
    throw error;
  } finally {
    if (locked) await connection.query('SELECT RELEASE_LOCK(?)', ['secureplay-pilot-2026']);
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Falha na carga do piloto:', error.code || error.message);
  process.exitCode = 1;
});
