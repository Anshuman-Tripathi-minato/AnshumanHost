'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const config = require('../config');
const { safeAppPath } = require('./validation');

function locateEocd(buffer) {
  const min = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= min; i -= 1) if (buffer.readUInt32LE(i) === 0x06054b50) return i;
  throw new Error('ZIP archive directory is missing or invalid.');
}

async function extractZip(buffer, slug) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22 || buffer.length > config.uploadLimitBytes) throw new Error('ZIP upload is empty or exceeds the upload limit.');
  const destination = safeAppPath(slug);
  const eocd = locateEocd(buffer);
  const entries = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  let cursor = buffer.readUInt32LE(eocd + 16);
  if (entries > config.maxArchiveFiles || cursor + centralSize > buffer.length) throw new Error('ZIP archive has too many entries or an invalid directory.');
  let expanded = 0;
  const files = [];
  for (let i = 0; i < entries; i += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('ZIP archive contains a malformed directory entry.');
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const externalAttributes = buffer.readUInt32LE(cursor + 38);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const rawName = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    cursor += 46 + nameLength + extraLength + commentLength;
    if (flags & 1) throw new Error('Encrypted ZIP archives are not supported.');
    if (![0, 8].includes(method)) throw new Error(`ZIP compression method ${method} is not supported.`);
    if (((externalAttributes >>> 16) & 0xf000) === 0xa000) throw new Error('ZIP symbolic links are not allowed.');
    const name = rawName.replace(/\\/g, '/');
    if (!name || name.startsWith('/') || /^[a-z]:/i.test(name) || name.split('/').some((part) => part === '..')) throw new Error('ZIP archive contains an unsafe path.');
    if (name.endsWith('/')) { files.push({ directory: true, name }); continue; }
    if (uncompressedSize > config.archiveLimitBytes || compressedSize > buffer.length) throw new Error('ZIP archive contains an oversized file.');
    expanded += uncompressedSize;
    if (expanded > config.archiveLimitBytes || (compressedSize > 0 && uncompressedSize / compressedSize > 250)) throw new Error('ZIP expanded size exceeds the safe upload limit.');
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('ZIP archive contains a malformed file record.');
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? Buffer.from(compressed) : zlib.inflateRawSync(compressed, { maxOutputLength: config.archiveLimitBytes });
    if (data.length !== uncompressedSize) throw new Error('ZIP file size did not match its directory record.');
    files.push({ name, data });
  }
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(destination, { recursive: true, mode: 0o700 });
  const root = path.resolve(destination);
  for (const entry of files) {
    const target = path.resolve(root, entry.name);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error('ZIP archive path escapes its project folder.');
    if (entry.directory) await fs.mkdir(target, { recursive: true, mode: 0o700 });
    else {
      await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await fs.writeFile(target, entry.data, { flag: 'wx', mode: 0o600 });
    }
  }
  return { destination, files: files.filter((entry) => !entry.directory).length, expandedBytes: expanded };
}

module.exports = { extractZip };
