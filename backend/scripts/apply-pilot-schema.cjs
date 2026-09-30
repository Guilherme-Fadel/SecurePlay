#!/usr/bin/env node
'use strict';

const { createDatabaseDataSource } = require('../src/database/database.providers.ts');
const { AddTextLessonsAndLearningPath1790726400000 } = require('../src/database/migrations/1790726400000-add-text-lessons-and-learning-path.ts');

const write = process.argv.includes('--write');
if (process.argv.slice(2).some((arg) => arg !== '--write')) {
  console.error('Uso: npm run db:pilot-schema [-- --write]');
  process.exit(2);
}

async function inspect(queryRunner) {
  const [moduloType] = await queryRunner.query(
    'SELECT COLUMN_TYPE AS columnType FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    ['modulo', 'type'],
  );
  const [aulaType] = await queryRunner.query(
    'SELECT COLUMN_TYPE AS columnType FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    ['aula', 'type'],
  );
  if (!moduloType || !aulaType) throw new Error('Schema base de módulo/aula ausente.');
  return {
    learningPath: await queryRunner.hasColumn('modulo', 'learning_path'),
    textModule: String(moduloType.columnType).includes("'texto'"),
    textLesson: String(aulaType.columnType).includes("'texto'"),
  };
}

async function main() {
  const dataSource = createDatabaseDataSource();
  dataSource.setOptions({ synchronize: false, migrationsRun: false });
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  try {
    const before = await inspect(queryRunner);
    console.log('Schema atual:', JSON.stringify(before));
    if (write) {
      await new AddTextLessonsAndLearningPath1790726400000().up(queryRunner);
      const after = await inspect(queryRunner);
      if (Object.values(after).some((value) => value !== true)) {
        throw new Error('Schema do piloto não ficou completo. Verifique cada alteração antes de repetir.');
      }
      console.log('Schema do piloto aplicado:', JSON.stringify(after));
    } else {
      console.log('Prévia apenas. Use --write para aplicar alterações aditivas.');
    }
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Falha ao preparar schema do piloto:', error.code || error.message);
  process.exitCode = 1;
});
