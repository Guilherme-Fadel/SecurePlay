const { spawnSync } = require('child_process');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(script) {
  const result = spawnSync(npmCommand, ['run', script], {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Mantém uma única entrada para a atualização da homologação, mas preserva
// o histórico individual das migrations no controle do TypeORM.
run('db:migrate');
run('db:lesson-order');

process.stdout.write('Atualização do banco de homologação concluída.\n');
