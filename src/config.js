'use strict';

const path = require('node:path');

const root = path.resolve(__dirname, '..');
module.exports = {
  root,
  host: process.env.ANSHUMANHOST_HOST || '127.0.0.1',
  port: Number(process.env.ANSHUMANHOST_PORT || 3000),
  proxyHost: process.env.ANSHUMANHOST_PROXY_HOST || '127.0.0.1',
  proxyPort: Number(process.env.ANSHUMANHOST_PROXY_PORT || 8780),
  appRoot: path.join(root, 'apps'),
  dataRoot: path.join(root, 'data'),
  logRoot: path.join(root, 'logs'),
  backupRoot: path.join(root, 'backups'),
  publicRoot: path.join(root, 'public'),
  showcaseRoot: path.join(root, 'public-showcase'),
  portStart: Number(process.env.ANSHUMANHOST_APP_PORT_START || 3100),
  portEnd: Number(process.env.ANSHUMANHOST_APP_PORT_END || 3999),
  baseDomain: (process.env.ANSHUMANHOST_BASE_DOMAIN || 'anshman.online').toLowerCase(),
  uploadLimitBytes: Number(process.env.ANSHUMANHOST_UPLOAD_LIMIT || 100 * 1024 * 1024),
  archiveLimitBytes: 200 * 1024 * 1024,
  maxArchiveFiles: 2000,
};
