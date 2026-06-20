// routes/products.js
'use strict';
const { createRouter } = require('../lib/micro');
const db = require('../lib/sqlite');
const router = createRouter();

// GET /api/products
router.get('/', (req, res) => {
  try {
    const products = db.all('SELECT * FROM products WHERE active = 1 ORDER BY price ASC');
    res.json({ success: true, products });
  } catch (e) {
    res.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/products/:slug
router.get('/:slug', (req, res) => {
  try {
    const product = db.get('SELECT * FROM products WHERE slug = ? AND active = 1', [req.params.slug]);
    if (!product) return res.json({ success: false, error: 'Produto não encontrado.' }, 404);
    res.json({ success: true, product });
  } catch (e) {
    res.json({ success: false, error: e.message }, 500);
  }
});

module.exports = router;
