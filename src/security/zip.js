'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const config = require('../config');

function locateEocd(buffer) {
  const min = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= min; i -= 1) if (buffer.readUInt32LE(i) === 0x06054b50) return i;
  throw invalid('ZIP archive directory is missing or invalid.');
}

function invalid(message) { const error = new Error(message); error.status = 400; return error; }

// Validates and inflates every entry in memory, then writes into `destination`, which must not exist yet.
async function extractZip(buffer, destination) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22 || buffer.length > config.uploadLimitBytes) throw invalid('ZIP upload is empty or exceeds the upload limit.');
  const eocd = locateEocd(buffer);
  const entries = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const centralEnd = cursor + centralSize;
  if (entries > config.maxArchiveFiles || centralEnd > eocd) throw invalid('ZIP archive has too many entries or an invalid directory.');
  let expanded = 0;
  const files = [];
  for (let i = 0; i < entries; i += 1) {
    if (cursor + 46 > centralEnd || buffer.readUInt32LE(cursor) !== 0x02014b50) throw invalid('ZIP archive contains a malformed directory entry.');
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const externalAttributes = buffer.readUInt32LE(cursor + 38);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    if (cursor + 46 + nameLength + extraLength + commentLength > centralEnd) throw invalid('ZIP archive contains a malformed directory entry.');
    const rawName = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    cursor += 46 + nameLength + extraLength + commentLength;
    if (flags & 1) throw invalid('Encrypted ZIP archives are not supported.');
    if (![0, 8].includes(method)) throw invalid(`ZIP compression method ${method} is not supported.`);
    if (((externalAttributes >>> 16) & 0xf000) === 0xa000) throw invalid('ZIP symbolic links are not allowed.');
    const name = rawName.replace(/\\/g, '/');
    if (!name || name.startsWith('/') || /^[a-z]:/i.test(name) || name.includes('\u0000') || name.split('/').some((part) => part === '..')) throw invalid('ZIP archive contains an unsafe path.');
    if (name.endsWith('/')) { files.push({ directory: true, name }); continue; }
    if (uncompressedSize > config.archiveLimitBytes || compressedSize > buffer.length) throw invalid('ZIP archive contains an oversized file.');
    expanded += uncompressedSize;
    if (expanded > config.archiveLimitBytes || (compressedSize > 0 && uncompressedSize / compressedSize > 250)) throw invalid('ZIP expanded size exceeds the safe upload limit.');
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) throw invalid('ZIP archive contains a malformed file record.');
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > buffer.length) throw invalid('ZIP archive is truncated.');
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    let data;
    try { data = method === 0 ? Buffer.from(compressed) : zlib.inflateRawSync(compressed, { maxOutputLength: config.archiveLimitBytes }); }
    catch { throw invalid(`ZIP entry "${name}" is corrupt.`); }
    if (data.length !== uncompressedSize) throw invalid('ZIP file size did not match its directory record.');
    files.push({ name, data });
  }
  await fs.mkdir(destination, { mode: 0o700 });
  const root = path.resolve(destination);
  for (const entry of files) {
    const target = path.resolve(root, entry.name);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw invalid('ZIP archive path escapes its project folder.');
    if (entry.directory) await fs.mkdir(target, { recursive: true, mode: 0o700 });
    else {
      await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await fs.writeFile(target, entry.data, { flag: 'wx', mode: 0o600 });
    }
  }
  return { destination, files: files.filter((entry) => !entry.directory).length, expandedBytes: expanded };
}

module.exports = { extractZip };
