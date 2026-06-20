// database/db.js — Banco de dados SQLite usando apenas Node.js nativo
// Node 22 tem suporte experimental a SQLite embutido

let _db;

function getDb() {
  if (_db) return _db;

  // Tenta sqlite nativo do Node 22+ primeiro
  try {
    const { DatabaseSync } = require('node:sqlite');
    const path = require('node:path');
    const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'store.db');
    _db = new DatabaseSync(DB_PATH);
    _db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    _db._type = 'native';
    console.log('  💾  SQLite nativo (Node.js built-in)');
    return _db;
  } catch (e) {
    // Cai para better-sqlite3 se disponível
    try {
      const Database = require('better-sqlite3');
      const path = require('node:path');
      const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'store.db');
      _db = new Database(DB_PATH);
      _db.pragma('foreign_keys = ON');
      _db.pragma('journal_mode = WAL');
      _db._type = 'better-sqlite3';
      console.log('  💾  SQLite via better-sqlite3');
      return _db;
    } catch (e2) {
      throw new Error(
        'SQLite não disponível.\n' +
        'Execute: npm install better-sqlite3\n' +
        'Ou use Node.js >= 22.5.0 com --experimental-sqlite'
      );
    }
  }
}

// Wrapper unificado — abstrai diferenças entre APIs
function query(db, sql, params = []) {
  if (db._type === 'native') {
    const stmt = db.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(...params);
    }
    return stmt.run(...params);
  }
  // better-sqlite3
  const stmt = db.prepare(sql);
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    return stmt.all(...params);
  }
  return stmt.run(...params);
}

function queryOne(db, sql, params = []) {
  if (db._type === 'native') {
    return db.prepare(sql).get(...params);
  }
  return db.prepare(sql).get(...params);
}

function transaction(db, fn) {
  if (db._type === 'native') {
    db.exec('BEGIN');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db.transaction(fn)();
}

module.exports = { getDb, query, queryOne, transaction };
