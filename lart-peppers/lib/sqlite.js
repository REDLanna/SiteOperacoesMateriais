// lib/sqlite.js — Wrapper SQLite que suporta Node nativo E better-sqlite3
'use strict';
const path = require('node:path');

let _db = null;
let _type = null;

function getDb() {
  if (_db) return _db;
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'store.db');

  // 1) Node.js 22+ sqlite nativo
  try {
    const { DatabaseSync } = require('node:sqlite');
    _db = new DatabaseSync(DB_PATH);
    _db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    _type = 'native';
    return _db;
  } catch {}

  // 2) better-sqlite3
  try {
    const Database = require('better-sqlite3');
    _db = new Database(DB_PATH);
    _db.pragma('foreign_keys = ON');
    _db.pragma('journal_mode = WAL');
    _type = 'bs3';
    return _db;
  } catch {}

  throw new Error('SQLite indisponível. Instale: npm install better-sqlite3');
}

// Prepara e executa — API unificada
function prepare(sql) {
  const db = getDb();
  return db.prepare(sql);
}

function run(sql, params = []) {
  return prepare(sql).run(...params);
}

function all(sql, params = []) {
  return prepare(sql).all(...params);
}

function get(sql, params = []) {
  return prepare(sql).get(...params);
}

function exec(sql) {
  return getDb().exec(sql);
}

function transaction(fn) {
  const db = getDb();
  if (_type === 'native') {
    db.exec('BEGIN');
    try { const r = fn(); db.exec('COMMIT'); return r; }
    catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
  }
  return db.transaction(fn)();
}

module.exports = { getDb, run, all, get, exec, transaction, prepare };
