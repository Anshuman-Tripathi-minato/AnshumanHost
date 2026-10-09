'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const config = require('../config');

const scrypt = promisify(crypto.scrypt);
const authPath = path.join(config.dataRoot, 'admin-auth.json');
const cookieName = 'anshumanhost_session';
const sessionSeconds = 12 * 60 * 60;
const attempts = new Map();

async function readRecord() {
  try { return JSON.parse(await fs.readFile(authPath, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function writeRecord(record) {
  await fs.mkdir(config.dataRoot, { recursive: true, mode: 0o700 });
  const temp = `${authPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temp, authPath);
  try { await fs.chmod(authPath, 0o600); } catch { /* Some Android filesystems do not support Unix modes. */ }
}

async function passwordRecord(password, sessionKey = crypto.randomBytes(32).toString('base64url')) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return { version: 1, salt: salt.toString('base64url'), hash: hash.toString('base64url'), sessionKey, updatedAt: new Date().toISOString() };
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 14 && password.length <= 256 && !/[\u0000-\u001f\u007f]/.test(password);
}

async function verifyPassword(password, record) {
  if (!validPassword(password) || !record?.salt || !record?.hash) return false;
  const candidate = await scrypt(password, Buffer.from(record.salt, 'base64url'), 64);
  const expected = Buffer.from(record.hash, 'base64url');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function cookieHeader(value, req, maxAge = sessionSeconds) {
  const secure = req.socket.encrypted || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function cookieValue(req) {
  const cookies = String(req.headers.cookie || '').split(';');
  const found = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  return found ? found.slice(cookieName.length + 1) : '';
}

function sign(payload, key) {
  return crypto.createHmac('sha256', Buffer.from(key, 'base64url')).update(payload).digest('base64url');
}

function issueCookie(record, req, res) {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + sessionSeconds, nonce: crypto.randomBytes(12).toString('base64url') })).toString('base64url');
  const value = `${payload}.${sign(payload, record.sessionKey)}`;
  res.setHeader('set-cookie', cookieHeader(value, req));
}

function isAuthenticated(req, record) {
  if (!record?.sessionKey) return false;
  const value = cookieValue(req);
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra) return false;
  const expected = Buffer.from(sign(payload, record.sessionKey));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).exp > Math.floor(Date.now() / 1000); }
  catch { return false; }
}

function allowAttempt(req) {
  const key = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const item = attempts.get(key);
  if (!item || now - item.startedAt > 15 * 60 * 1000) { attempts.set(key, { startedAt: now, count: 0 }); return true; }
  return item.count < 8;
}

function failedAttempt(req) {
  const key = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const item = attempts.get(key);
  if (!item || now - item.startedAt > 15 * 60 * 1000) attempts.set(key, { startedAt: now, count: 1 });
  else item.count += 1;
}

function clearAttempts(req) { attempts.delete(req.socket.remoteAddress || 'unknown'); }

function isLoopback(req) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
}

function setSession(req, res, record) { issueCookie(record, req, res); }
function clearSession(req, res) { res.setHeader('set-cookie', cookieHeader('', req, 0)); }

async function setPassword(password, existingRecord = null) {
  if (!validPassword(password)) {
    const error = new Error('Use a password with at least 14 characters and no control characters.');
    error.status = 400;
    throw error;
  }
  const record = await passwordRecord(password, existingRecord?.sessionKey);
  await writeRecord(record);
  return record;
}

module.exports = { readRecord, validPassword, verifyPassword, isAuthenticated, allowAttempt, failedAttempt, clearAttempts, isLoopback, setSession, clearSession, setPassword };
