'use strict';

const { spawnSync } = require('node:child_process');
const os = require('node:os');

function check(command, args = ['--version']) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 2500, stdio: ['ignore', 'pipe', 'pipe'] });
  return { available: !result.error && result.status === 0, version: (result.stdout || result.stderr || '').trim().split('\n')[0].slice(0, 160) };
}

function discover() {
  const node = check(process.execPath, ['--version']);
  const git = check('git', ['--version']);
  const npm = check('npm', ['--version']);
  const python = check('python3', ['--version']);
  const pythonAlt = python.available ? python : check('python', ['--version']);
  const pythonCommand = python.available ? 'python3' : pythonAlt.available ? 'python' : null;
  const dockerEngine = check('docker', ['info', '--format', '{{.ServerVersion}}']);
  const dockerCompose = dockerEngine.available && check('docker', ['compose', 'version']).available;
  const java = check('java', ['-version']);
  const go = check('go', ['version']);
  const php = check('php', ['--version']);
  const ruby = check('ruby', ['--version']);
  const capability = (name, state, detail, version = '') => ({ name, state, detail, version });
  return {
    baseDomain: require('../config').baseDomain,
    host: { platform: process.platform, architecture: process.arch, node: process.version, cores: os.cpus().length },
    runtimes: [
      capability('Node.js', node.available ? 'native' : 'unavailable', node.available ? 'Native project processes are supported.' : 'Node.js is unavailable.', node.version),
      capability('Static websites', 'native', 'Served by the bundled lightweight static adapter.'),
      capability('Python', pythonAlt.available ? 'native' : 'requires-runtime', pythonAlt.available ? 'Native Python project processes are supported.' : 'Install Python 3 to enable this runtime.', pythonAlt.version),
      capability('Java', 'requires-runtime', java.available ? 'Java is detected, but a Java deployment adapter is not enabled in this build.' : 'Java is not detected; container deployment is the portable fallback.', java.version),
      capability('Go', 'requires-runtime', go.available ? 'Go is detected, but a Go deployment adapter is not enabled in this build.' : 'Go is not detected; container deployment is the portable fallback.', go.version),
      capability('PHP', 'requires-runtime', php.available ? 'PHP is detected, but a PHP deployment adapter is not enabled in this build.' : 'PHP is not detected; container deployment is the portable fallback.', php.version),
      capability('Ruby', 'requires-runtime', ruby.available ? 'Ruby is detected, but a Ruby deployment adapter is not enabled in this build.' : 'Ruby is not detected; container deployment is the portable fallback.', ruby.version),
      capability('Docker Engine', dockerEngine.available ? 'detected' : 'unavailable', dockerEngine.available ? 'Engine detected. Container deployment controls are not enabled in this build.' : 'Not detected. Container-only features are disabled.' , dockerEngine.version),
      capability('Docker Compose', dockerCompose ? 'detected' : 'unavailable', dockerCompose ? 'Compose detected; multi-container deployment controls are not enabled in this build.' : 'Not detected or unavailable.'),
      capability('Buildpacks', 'unsupported', 'No compatible buildpack builder is configured.'),
    ],
    tools: { git: git.available, npm: npm.available, python: pythonAlt.available, pythonCommand, docker: dockerEngine.available, dockerCompose },
    system: { uptimeSeconds: Math.floor(os.uptime()), loadAverage: os.loadavg(), memoryTotal: os.totalmem(), memoryFree: os.freemem() },
  };
}

module.exports = { discover, check };
