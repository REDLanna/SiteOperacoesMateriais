'use strict';
const path = require('node:path');
const { hashPassword } = require('../lib/auth');

const DB_PATH = path.join(__dirname, 'store.db');

let db;
try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  console.log('  💾  SQLite nativo (Node.js built-in)');
} catch {
  try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    console.log('  💾  better-sqlite3');
  } catch {
    console.error('❌  SQLite indisponível. Use Node >= 22 ou instale better-sqlite3.');
    process.exit(1);
  }
}

const run = (sql, ...p) => db.prepare(sql).run(...p);
const get = (sql, ...p) => db.prepare(sql).get(...p);

// ── SCHEMA ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    volume_ml INTEGER,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 10,
    shu TEXT,
    ingredients TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    cpf TEXT,
    password_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    label TEXT DEFAULT 'Principal',
    cep TEXT, street TEXT, number TEXT, complement TEXT,
    district TEXT, city TEXT, state TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_cpf TEXT,
    address_cep TEXT, address_street TEXT, address_number TEXT, address_complement TEXT,
    address_district TEXT, address_city TEXT, address_state TEXT,
    subtotal REAL NOT NULL,
    shipping REAL DEFAULT 0,
    total REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    order_status TEXT DEFAULT 'received',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    volume_ml INTEGER,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    method TEXT NOT NULL,
    card_last4 TEXT,
    card_brand TEXT,
    cardholder_name TEXT,
    installments INTEGER DEFAULT 1,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    transaction_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── SEED PRODUTOS ─────────────────────────────────────────────────────────
const prodCount = get('SELECT COUNT(*) as n FROM products');
if ((prodCount?.n || 0) === 0) {
  const ins = (slug, name, sub, desc, vol, price, stock, shu, ing) =>
    run(
      'INSERT INTO products (slug,name,subtitle,description,volume_ml,price,stock,shu,ingredients) VALUES (?,?,?,?,?,?,?,?,?)',
      slug, name, sub, desc, vol, price, stock, shu, ing
    );

  ins(
    'reaper-30ml', 'Reaper Concentrado', 'Molho Extremo 30ml',
    'A versão mais pura e concentrada do nosso molho artesanal. Cada gota contém a essência de pimentas Carolina Reaper selecionadas manualmente. Para os verdadeiros apreciadores do extremo — use com extrema cautela.',
    30, 48.00, 25, '2.200.000 SHU',
    'Pimenta Carolina Reaper, azeite extravirgem, vinagre branco, sal marinho, açúcar.'
  );

  ins(
    'reaper-100ml', 'Reaper Premium', 'Molho Extremo 100ml',
    'Nossa edição premium para quem já domina o calor da Reaper. Frasco maior para uso contínuo, mesmo processo artesanal, mesma intensidade absurda.',
    100, 65.00, 15, '2.200.000 SHU',
    'Pimenta Carolina Reaper, azeite extravirgem, vinagre branco, sal marinho, açúcar.'
  );

  ins(
    'reaper-kit', "Kit L'Art", 'Kit Completo 30ml + 100ml',
    'O kit completo para explorar todos os níveis da nossa produção artesanal. Um frasco de 30ml para experimentar e compartilhar, um de 100ml para o uso diário.',
    null, 105.00, 10, '2.200.000 SHU',
    "1x Reaper Concentrado 30ml + 1x Reaper Premium 100ml"
  );

  console.log('  ✅  Produtos inseridos.');
}

// ── SEED ADMIN ────────────────────────────────────────────────────────────
const adminCount = get('SELECT COUNT(*) as n FROM admins');
if ((adminCount?.n || 0) === 0) {
  run('INSERT INTO admins (username,password_hash) VALUES (?,?)', 'admin', hashPassword('admin123'));
  console.log('  ✅  Admin criado — usuário: admin | senha: admin123');
}

console.log(`  ✅  Banco pronto: ${DB_PATH}`);
try { db.close(); } catch {}