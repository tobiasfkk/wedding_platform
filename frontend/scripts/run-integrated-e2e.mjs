import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryDirectory = path.resolve(frontendDirectory, '..');
const composeFile = path.join(repositoryDirectory, 'infrastructure', 'compose.e2e.yaml');
const composeArguments = [
  'compose',
  '--project-name',
  'wedding-platform-e2e',
  '--file',
  composeFile,
];
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repositoryDirectory,
    stdio: 'inherit',
    ...options,
  });
}

const dockerStatus = spawnSync('docker', ['info'], { stdio: 'ignore' });
if (dockerStatus.status !== 0) {
  console.error(
    'Docker não está disponível. Inicie o Docker Engine antes de executar a suíte E2E integrada.',
  );
  process.exit(1);
}

let exitCode = 1;
try {
  const started = run('docker', [...composeArguments, 'up', '--detach', '--wait']);
  if (started.status !== 0) {
    exitCode = started.status ?? 1;
  } else {
    const tests = run(
      npxCommand,
      ['playwright', 'test', '--config', 'playwright.integrated.config.ts'],
      { cwd: frontendDirectory },
    );
    exitCode = tests.status ?? 1;
  }
} finally {
  const stopped = run('docker', [...composeArguments, 'down', '--volumes', '--remove-orphans']);
  if (exitCode === 0 && stopped.status !== 0) exitCode = stopped.status ?? 1;
}

process.exit(exitCode);
