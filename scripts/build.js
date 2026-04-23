const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const distDir = path.join(rootDir, 'dist');
const seedDbPath = path.join(rootDir, 'backend', 'data', 'yorstatus.seed.db');

function rimraf(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function run(command, args, extraEnv = {}) {
  const options = {
    cwd: rootDir,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
  };

  const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', [command, ...args].join(' ')], options)
    : spawnSync(command, args, options);

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

rimraf(distDir);
copyDir(frontendDir, distDir);

fs.mkdirSync(path.dirname(seedDbPath), { recursive: true });
rimraf(seedDbPath);
rimraf(`${seedDbPath}-shm`);
rimraf(`${seedDbPath}-wal`);

run('npm', ['run', 'seed'], {
  NODE_ENV: 'production',
  YORSTATUS_DB_PATH: seedDbPath,
});

console.log(`Build output ready in ${distDir}`);
