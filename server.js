'use strict';
const path = require('node:path');
const { createApp } = require('./lib/http');

const PORT   = process.env.PORT || 3000;
const app    = createApp();
const PUBLIC = path.join(__dirname, 'public');

app.setStatic(PUBLIC);

app.use('/api/products', require('./routes/products'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/admin',    require('./routes/admin'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: "L'Art Peppers", version: '1.0.0', time: new Date().toISOString() });
});

const sendPage = page => (req, res) => res.sendFile(path.join(PUBLIC, page));
app.get('/',            sendPage('index.html'));
app.get('/checkout',    sendPage('checkout.html'));
app.get('/confirmacao', sendPage('confirmacao.html'));
app.get('/admin',       sendPage('admin.html'));

app.listen(PORT, () => {
  const c = s => `\x1b[36m${s}\x1b[0m`;
  console.log('');
  console.log("  \x1b[31m🌶️\x1b[0m  \x1b[1mL'Art Peppers\x1b[0m — Servidor iniciado");
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  🚀  Loja:   ${c(`http://localhost:${PORT}`)}`);
  console.log(`  🛡️   Admin:  ${c(`http://localhost:${PORT}/admin`)}`);
  console.log(`  🔧  API:    ${c(`http://localhost:${PORT}/api/health`)}`);
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});