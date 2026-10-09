'use strict';

const path = require('node:path');
const config = require('../config');

function fail(message) { const error = new Error(message); error.status = 400; throw error; }

function slugify(value) {
  const slug = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return validateSlug(slug);
}

function validateSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(slug)) fail('Project slug must use 1–48 lowercase letters, numbers, or interior hyphens.');
  if (['api', 'admin', 'system', 'www', 'localhost'].includes(slug)) fail('This project slug is reserved.');
  return slug;
}

function validateName(value) {
  const name = String(value || '').trim();
  if (!name || name.length > 80 || /[\u0000-\u001f]/.test(name)) fail('Project name is required and must be under 80 characters.');
  return name;
}

function validateHostname(value) {
  const host = String(value || '').trim().toLowerCase().replace(/\.$/, '');
  if (!host) return '';
  if (host.length > 253 || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) fail('Enter a valid hostname.');
  if (host === config.baseDomain || host.endsWith(`.${config.baseDomain}`) || host === 'localhost' || host.endsWith('.localhost')) return host;
  fail(`Hostname must be under ${config.baseDomain} or localhost for local testing.`);
}

function validateGitUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { fail('Enter a valid HTTPS Git repository URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname || url.port) fail('Git imports currently accept HTTPS URLs without embedded credentials or custom ports.');
  if (!/^[a-z0-9.-]+$/i.test(url.hostname) || url.hostname.includes('..')) fail('Repository hostname is invalid.');
  return url.toString();
}

function parseCommand(command) {
  if (!String(command || '').trim()) return [];
  const input = String(command).trim();
  if (/[\n\r;&|<>`$()]|\$\{|\$\(/.test(input)) fail('Commands must be a single executable and arguments; shell operators and expansions are not supported.');
  const args = [];
  let current = '';
  let quote = '';
  let escaped = false;
  for (const char of input) {
    if (escaped) { current += char; escaped = false; continue; }
    if (char === '\\' && quote !== "'") { escaped = true; continue; }
    if (quote) { if (char === quote) quote = ''; else current += char; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (/\s/.test(char)) { if (current) { args.push(current); current = ''; } continue; }
    current += char;
  }
  if (escaped || quote) fail('Command contains an unfinished quote or escape.');
  if (current) args.push(current);
  if (!args.length || args.length > 64 || args.some((arg) => arg.length > 512)) fail('Command is empty or too long.');
  return args;
}

function safeAppPath(slug) {
  const target = path.resolve(config.appRoot, validateSlug(slug));
  if (!target.startsWith(`${path.resolve(config.appRoot)}${path.sep}`)) fail('Invalid project path.');
  return target;
}

function safeEnv(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(key)) fail(`Environment variable name is invalid: ${key}`);
    const text = String(value);
    if (text.length > 8192 || /\u0000/.test(text)) fail(`Environment variable ${key} is too long or contains a null byte.`);
    result[key] = text;
  }
  return result;
}

function validateHealthPath(value) {
  const route = String(value || '/').trim();
  if (!route.startsWith('/') || route.startsWith('//') || /[\r\n]/.test(route)) fail('Health check path must be a local path beginning with /.');
  return route;
}

module.exports = { fail, slugify, validateSlug, validateName, validateHostname, validateGitUrl, parseCommand, safeAppPath, safeEnv, validateHealthPath };
