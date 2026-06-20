// routes/orders.js
'use strict';
const { createRouter } = require('../lib/micro');
const db = require('../lib/sqlite');
const crypto = require('node:crypto');
const router = createRouter();

function genOrderNumber() {
  return 'LP-' + Date.now().toString().slice(-8).toUpperCase();
}
function genTxId() {
  return 'TX-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

// POST /api/orders — criar pedido
router.post('/', (req, res) => {
  const { customer, address, items, payment, shipping = 0, notes = '' } = req.body;

  if (!customer?.name || !customer?.email)
    return res.json({ success: false, error: 'Dados do cliente incompletos.' }, 400);
  if (!items || items.length === 0)
    return res.json({ success: false, error: 'Carrinho vazio.' }, 400);
  if (!payment?.method)
    return res.json({ success: false, error: 'Forma de pagamento não informada.' }, 400);

  try {
    // Valida e enriquece itens com preços do banco
    let subtotal = 0;
    const enriched = [];
    for (const item of items) {
      const product = db.get('SELECT * FROM products WHERE id = ? AND active = 1', [item.product_id]);
      if (!product)
        return res.json({ success: false, error: `Produto ID ${item.product_id} não encontrado.` }, 400);
      if (product.stock < item.quantity)
        return res.json({ success: false, error: `Estoque insuficiente para "${product.name}".` }, 400);
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      enriched.push({ ...item, product, lineTotal });
    }

    const total = subtotal + parseFloat(shipping || 0);
    const orderNumber  = genOrderNumber();
    const txId         = genTxId();
    const payStatus    = payment.method === 'pix' ? 'pending'           : 'approved';
    const orderStatus  = payment.method === 'pix' ? 'awaiting_payment'  : 'confirmed';

    const result = db.transaction(() => {
      // Upsert cliente
      let customerId;
      const existing = db.get('SELECT id FROM customers WHERE email = ?', [customer.email]);
      if (existing) {
        customerId = existing.id;
        db.run('UPDATE customers SET name=?, phone=COALESCE(?,phone) WHERE id=?',
          [customer.name, customer.phone || null, customerId]);
      } else {
        const ins = db.run(
          'INSERT INTO customers (name,email,phone,cpf) VALUES (?,?,?,?)',
          [customer.name, customer.email, customer.phone || null, customer.cpf || null]
        );
        customerId = ins.lastInsertRowid;
      }

      // Endereço
      if (address?.cep) {
        db.run(
          'INSERT INTO addresses (customer_id,cep,street,number,complement,district,city,state) VALUES (?,?,?,?,?,?,?,?)',
          [customerId, address.cep, address.street, address.number,
           address.complement || null, address.district, address.city, address.state]
        );
      }

      // Pedido
      const ord = db.run(`
        INSERT INTO orders (
          order_number,customer_id,customer_name,customer_email,customer_phone,customer_cpf,
          address_cep,address_street,address_number,address_complement,
          address_district,address_city,address_state,
          subtotal,shipping,total,payment_method,order_status,payment_status,notes
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [orderNumber, customerId, customer.name, customer.email,
         customer.phone||null, customer.cpf||null,
         address?.cep||null, address?.street||null, address?.number||null, address?.complement||null,
         address?.district||null, address?.city||null, address?.state||null,
         subtotal, shipping, total, payment.method, orderStatus, payStatus, notes]
      );
      const orderId = ord.lastInsertRowid;

      // Itens + reduz estoque
      for (const item of enriched) {
        db.run(
          'INSERT INTO order_items (order_id,product_id,product_name,volume_ml,quantity,unit_price,total_price) VALUES (?,?,?,?,?,?,?)',
          [orderId, item.product_id, item.product.name, item.product.volume_ml,
           item.quantity, item.product.price, item.lineTotal]
        );
        db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
      }

      // Registro de pagamento
      db.run(
        'INSERT INTO payments (order_id,method,card_last4,card_brand,cardholder_name,installments,amount,status,transaction_id) VALUES (?,?,?,?,?,?,?,?,?)',
        [orderId, payment.method, payment.card_last4||null, payment.card_brand||null,
         payment.cardholder_name||null, payment.installments||1, total, payStatus, txId]
      );

      return { orderId, orderNumber, txId };
    });

    res.json({
      success: true,
      order_number:    result.orderNumber,
      order_id:        result.orderId,
      transaction_id:  result.txId,
      payment_status:  payStatus,
      order_status:    orderStatus,
      total,
      message: payment.method === 'pix'
        ? 'Pedido registrado! Aguardando confirmação do PIX.'
        : 'Pedido confirmado com sucesso!'
    });

  } catch (e) {
    console.error('Erro ao criar pedido:', e);
    res.json({ success: false, error: 'Erro ao processar pedido.' }, 500);
  }
});

// GET /api/orders/:number — consulta pedido
router.get('/:number', (req, res) => {
  try {
    const order = db.get('SELECT * FROM orders WHERE order_number = ?', [req.params.number]);
    if (!order) return res.json({ success: false, error: 'Pedido não encontrado.' }, 404);
    const items = db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    res.json({ success: true, order, items });
  } catch (e) {
    res.json({ success: false, error: e.message }, 500);
  }
});

module.exports = router;
