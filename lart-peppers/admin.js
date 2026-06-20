'use strict';
const { createRouter } = require('../lib/http');
const db = require('../lib/sqlite');
const { comparePassword } = require('../lib/auth');
const router = createRouter();

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  res.json({ success: false, error: 'Não autorizado.' }, 401);
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.json({ success: false, error: 'Credenciais obrigatórias.' }, 400);

  const admin = db.get('SELECT * FROM admins WHERE username = ?', [username]);
  if (!admin || !comparePassword(password, admin.password_hash))
    return res.json({ success: false, error: 'Usuário ou senha incorretos.' }, 401);

  req.session.adminId       = admin.id;
  req.session.adminUsername = admin.username;
  req.session.save();
  res._setSessionCookie = true;
  res.json({ success: true, message: 'Login realizado.' });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/dashboard', requireAdmin, (req, res) => {
  try {
    const totalOrders    = db.get('SELECT COUNT(*) as n FROM orders').n;
    const totalRevenue   = db.get("SELECT SUM(total) as s FROM orders WHERE payment_status='approved'").s || 0;
    const totalCustomers = db.get('SELECT COUNT(*) as n FROM customers').n;
    const pendingOrders  = db.get("SELECT COUNT(*) as n FROM orders WHERE order_status IN ('received','awaiting_payment')").n;
    const recentOrders   = db.all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10');
    const stockAlert     = db.all('SELECT * FROM products WHERE stock <= 3 AND active = 1');

    res.json({
      success: true,
      stats: { totalOrders, totalRevenue, totalCustomers, pendingOrders },
      recentOrders, stockAlert
    });
  } catch (e) {
    res.json({ success: false, error: e.message }, 500);
  }
});

router.get('/orders', requireAdmin, (req, res) => {
  try {
    const orders = db.all('SELECT * FROM orders ORDER BY created_at DESC');
    res.json({ success: true, orders });
  } catch (e) {
    res.json({ success: false, error: e.message }, 500);
  }
});

router.patch('/orders/:id/status', requireAdmin, (req, res) => {
  try {
    const { order_status, payment_status } = req.body;
    db.run(
      "UPDATE orders SET order_status = COALESCE(?,order_status), payment_status = COALESCE(?,payment_status), updated_at = datetime('now') WHERE id = ?",
      [order_status || null, payment_status || null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message }, 500);
  }
});

router.get('/customers', requireAdmin, (req, res) => {
  try {
    const customers = db.all(`
      SELECT c.*, COUNT(o.id) as order_count, SUM(o.total) as total_spent
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY c.id ORDER BY c.created_at DESC
    `);
    res.json({ success: true, customers });
  } catch (e) {
    res.json({ success: false, error: e.message }, 500);
  }
});

router.get('/products', requireAdmin, (req, res) => {
  try {
    const products = db.all('SELECT * FROM products ORDER BY id ASC');
    res.json({ success: true, products });
  } catch (e) {
    res.json({ success: false, error: e.message }, 500);
  }
});

router.patch('/products/:id', requireAdmin, (req, res) => {
  try {
    const { price, stock } = req.body;
    db.run(
      'UPDATE products SET price = COALESCE(?,price), stock = COALESCE(?,stock) WHERE id = ?',
      [price != null ? parseFloat(price) : null,
       stock != null ? parseInt(stock)   : null,
       req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message }, 500);
  }
});

module.exports = router;