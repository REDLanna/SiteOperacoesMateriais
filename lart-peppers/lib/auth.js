// lib/auth.js — Hash de senha sem bcryptjs (usando crypto nativo)
'use strict';
const crypto = require('node:crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return `${salt}:${hash}`;
}

function comparePassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const candidate = crypto.createHmac('sha256', salt).update(password).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash,'hex'), Buffer.from(candidate,'hex'));
  } catch { return false; }
}

module.exports = { hashPassword, comparePassword };
