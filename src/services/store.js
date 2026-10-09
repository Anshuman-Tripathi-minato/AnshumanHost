'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const config = require('../config');

const storePath = path.join(config.dataRoot, 'store.json');
const secretsPath = path.join(config.dataRoot, 'secrets.json');
let writeQueue = Promise.resolve();

async function ensureFiles() {
  await Promise.all([config.dataRoot, config.appRoot, config.logRoot, config.backupRoot].map((dir) => fs.mkdir(dir, { recursive: true, mode: 0o700 })));
  try { await fs.access(storePath); } catch { await atomicWrite(storePath, { version: 1, projects: [], deployments: [] }); }
  try { await fs.access(secretsPath); } catch { await atomicWrite(secretsPath, {}); }
}

async function atomicWrite(file, value) {
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temp, file);
  try { await fs.chmod(file, 0o600); } catch { /* permissions vary on Android filesystems */ }
}

async function read() {
  await ensureFiles();
  try { return JSON.parse(await fs.readFile(storePath, 'utf8')); }
  catch (error) { throw new Error(`Could not read project metadata: ${error.message}`); }
}

async function update(mutator) {
  const run = writeQueue.then(async () => {
    const data = await read();
    const next = await mutator(data) || data;
    await atomicWrite(storePath, next);
    return next;
  });
  writeQueue = run.catch(() => {});
  return run;
}

async function readSecrets() {
  await ensureFiles();
  return JSON.parse(await fs.readFile(secretsPath, 'utf8'));
}

async function writeSecrets(value) {
  await ensureFiles();
  await atomicWrite(secretsPath, value);
}

function publicProject(project) {
  const { env = {}, ...safe } = project;
  return { ...safe, env: Object.keys(env) };
}

module.exports = { ensureFiles, read, update, readSecrets, writeSecrets, publicProject, storePath, secretsPath };
