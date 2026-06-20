// public/js/admin.js — Painel administrativo L'Art Peppers

// ─── AUTH ─────────────────────────────────────────────────────────────────

async function doLogin() {
  const username = document.getElementById('adminUser').value.trim();
  const password = document.getElementById('adminPass').value.trim();
  const errEl    = document.getElementById('loginError');
  errEl.textContent = '';

  if (!username || !password) {
    errEl.textContent = 'Preencha usuário e senha.';
    return;
  }

  try {
    const res  = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!data.success) {
      errEl.textContent = data.error || 'Credenciais inválidas.';
      return;
    }

    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminLayout').style.display  = 'flex';
    loadDashboard();

  } catch (err) {
    errEl.textContent = 'Erro de conexão com o servidor.';
  }
}

async function doLogout() {
  await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
  location.reload();
}

// ─── TABS ─────────────────────────────────────────────────────────────────

function showTab(name, linkEl) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (linkEl) linkEl.classList.add('active');

  const loaders = { orders: loadOrders, customers: loadCustomers, products: loadAdminProducts };
  if (loaders[name]) loaders[name]();
}

// ─── HELPERS ──────────────────────────────────────────────────────────────

function fmtBRL(v) {
  return 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',');
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function payBadge(status) {
  const map = {
    approved: ['badge-green', 'Aprovado'],
    pending:  ['badge-yellow', 'Pendente'],
    failed:   ['badge-red', 'Falhou'],
    refunded: ['badge-gray', 'Estornado']
  };
  const [cls, label] = map[status] || ['badge-gray', status || '—'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function orderBadge(status) {
  const map = {
    received:         ['badge-yellow', 'Recebido'],
    awaiting_payment: ['badge-yellow', 'Ag. Pagamento'],
    confirmed:        ['badge-green', 'Confirmado'],
    preparing:        ['badge-green', 'Preparando'],
    shipped:          ['badge-green', 'Enviado'],
    delivered:        ['badge-green', 'Entregue'],
    cancelled:        ['badge-red', 'Cancelado']
  };
  const [cls, label] = map[status] || ['badge-gray', status || '—'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function methodLabel(m) {
  return { credit: '💳 Crédito', debit: '🏧 Débito', pix: '⚡ PIX' }[m] || m;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────

async function loadDashboard() {
  try {
    const res  = await fetch('/api/admin/dashboard', { credentials: 'include' });
    const data = await res.json();
    if (!data.success) return;

    const { stats, recentOrders, stockAlert } = data;

    document.getElementById('statOrders').textContent    = stats.totalOrders;
    document.getElementById('statRevenue').textContent   = fmtBRL(stats.totalRevenue);
    document.getElementById('statCustomers').textContent = stats.totalCustomers;
    document.getElementById('statPending').textContent   = stats.pendingOrders;

    // Alerta de estoque
    if (stockAlert.length > 0) {
      const alertHtml = `
        <div style="background:rgba(192,32,15,0.1);border:1px solid rgba(192,32,15,0.3);padding:1rem 1.5rem;margin-bottom:1.5rem;font-size:0.8rem;color:rgba(245,237,224,0.8)">
          ⚠️ <strong style="color:#e8341a">Estoque baixo:</strong>
          ${stockAlert.map(p => `${p.name} (${p.stock} un.)`).join(' · ')}
        </div>`;
      document.getElementById('tab-dashboard').insertAdjacentHTML('afterbegin', alertHtml);
    }

    // Tabela de pedidos recentes
    const tbody = document.getElementById('recentOrdersBody');
    if (!recentOrders.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:2rem">Nenhum pedido ainda.</td></tr>`;
      return;
    }
    tbody.innerHTML = recentOrders.map(o => `
      <tr>
        <td><strong style="color:var(--gold-light)">${o.order_number}</strong></td>
        <td>
          <div style="font-weight:600;color:var(--cream)">${o.customer_name}</div>
          <div style="font-size:0.7rem;color:var(--gray)">${o.customer_email}</div>
        </td>
        <td><strong style="color:var(--warm-white)">${fmtBRL(o.total)}</strong></td>
        <td>${payBadge(o.payment_status)}</td>
        <td>${orderBadge(o.order_status)}</td>
        <td style="color:var(--gray);font-size:0.75rem">${fmtDate(o.created_at)}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
  }
}

// ─── ORDERS ───────────────────────────────────────────────────────────────

async function loadOrders() {
  try {
    const res  = await fetch('/api/admin/orders', { credentials: 'include' });
    const data = await res.json();
    if (!data.success) return;

    const tbody = document.getElementById('ordersBody');
    if (!data.orders.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--gray);padding:2rem">Nenhum pedido encontrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.orders.map(o => `
      <tr>
        <td><strong style="color:var(--gold-light)">${o.order_number}</strong></td>
        <td>
          <div style="font-weight:600;color:var(--cream)">${o.customer_name}</div>
          <div style="font-size:0.7rem;color:var(--gray)">${o.customer_email}</div>
          <div style="font-size:0.7rem;color:var(--gray)">${o.customer_phone || ''}</div>
        </td>
        <td style="font-size:0.78rem;color:var(--gray)">
          ${o.address_city || '—'}${o.address_state ? '/' + o.address_state : ''}
        </td>
        <td><strong style="color:var(--warm-white)">${fmtBRL(o.total)}</strong>
          <div style="font-size:0.7rem;color:var(--gray)">${methodLabel(o.payment_method)}</div>
        </td>
        <td>${payBadge(o.payment_status)}</td>
        <td>${orderBadge(o.order_status)}</td>
        <td style="color:var(--gray);font-size:0.72rem">${fmtDate(o.created_at)}</td>
        <td>
          <div style="display:flex;flex-direction:column;gap:0.4rem">
            <select id="ostatus-${o.id}" style="background:#1a1208;border:1px solid rgba(201,148,58,0.2);color:var(--cream);padding:0.3rem;font-size:0.7rem;outline:none">
              ${['received','awaiting_payment','confirmed','preparing','shipped','delivered','cancelled']
                .map(s => `<option value="${s}" ${o.order_status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <select id="pstatus-${o.id}" style="background:#1a1208;border:1px solid rgba(201,148,58,0.2);color:var(--cream);padding:0.3rem;font-size:0.7rem;outline:none">
              ${['pending','approved','failed','refunded']
                .map(s => `<option value="${s}" ${o.payment_status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button onclick="updateOrderStatus(${o.id})" class="btn-save" style="font-size:0.65rem">✓ Salvar</button>
          </div>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Erro ao carregar pedidos:', err);
  }
}

async function updateOrderStatus(orderId) {
  const order_status   = document.getElementById('ostatus-' + orderId)?.value;
  const payment_status = document.getElementById('pstatus-' + orderId)?.value;

  try {
    const res  = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ order_status, payment_status })
    });
    const data = await res.json();
    if (data.success) showAdminToast('✅ Status atualizado!');
    else showAdminToast('❌ Erro ao atualizar.');
  } catch {
    showAdminToast('❌ Erro de conexão.');
  }
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────

async function loadCustomers() {
  try {
    const res  = await fetch('/api/admin/customers', { credentials: 'include' });
    const data = await res.json();
    if (!data.success) return;

    const tbody = document.getElementById('customersBody');
    if (!data.customers.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:2rem">Nenhum cliente cadastrado ainda.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.customers.map(c => `
      <tr>
        <td><strong style="color:var(--cream)">${c.name}</strong></td>
        <td style="color:var(--gray);font-size:0.8rem">${c.email}</td>
        <td style="color:var(--gray);font-size:0.8rem">${c.phone || '—'}</td>
        <td style="text-align:center">
          <span style="font-weight:700;color:var(--warm-white)">${c.order_count || 0}</span>
        </td>
        <td>
          <span style="font-weight:700;color:var(--gold-light)">${fmtBRL(c.total_spent || 0)}</span>
        </td>
        <td style="color:var(--gray);font-size:0.72rem">${fmtDate(c.created_at)}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Erro ao carregar clientes:', err);
  }
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────

async function loadAdminProducts() {
  try {
    const res  = await fetch('/api/admin/products', { credentials: 'include' });
    const data = await res.json();
    if (!data.success) return;

    const grid = document.getElementById('productsAdminGrid');
    grid.innerHTML = data.products.map(p => `
      <div class="product-admin-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem">
          <div>
            <div style="font-size:0.55rem;letter-spacing:0.4em;text-transform:uppercase;color:var(--red-bright);margin-bottom:0.3rem">
              ${p.volume_ml ? p.volume_ml + 'ml' : 'Kit'}
            </div>
            <h3>${p.name}</h3>
          </div>
          <span class="${p.active ? 'badge badge-green' : 'badge badge-red'}">${p.active ? 'Ativo' : 'Inativo'}</span>
        </div>
        <div class="p-price">${fmtBRL(p.price)}</div>
        <div class="p-stock">
          Estoque: <strong style="color:${p.stock <= 3 ? 'var(--red-bright)' : 'var(--success)'}">${p.stock} unidades</strong>
        </div>
        <div style="font-size:0.7rem;color:var(--gray);margin-bottom:1rem;line-height:1.6">
          🌡️ ${p.shu || '—'}<br>
          📋 ${p.ingredients ? p.ingredients.substring(0, 60) + '...' : '—'}
        </div>
        <div class="inline-edit">
          <input type="number" id="price-${p.id}" placeholder="Preço (R$)" value="${p.price}" step="0.01" min="0">
          <input type="number" id="stock-${p.id}" placeholder="Estoque" value="${p.stock}" min="0">
          <button class="btn-save" onclick="saveProduct(${p.id})">✓</button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
  }
}

async function saveProduct(productId) {
  const price = parseFloat(document.getElementById('price-' + productId)?.value);
  const stock = parseInt(document.getElementById('stock-' + productId)?.value);

  if (isNaN(price) || isNaN(stock) || price < 0 || stock < 0) {
    showAdminToast('❌ Valores inválidos.');
    return;
  }

  try {
    const res  = await fetch(`/api/admin/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ price, stock })
    });
    const data = await res.json();
    if (data.success) { showAdminToast('✅ Produto atualizado!'); loadAdminProducts(); }
    else showAdminToast('❌ Erro ao salvar.');
  } catch {
    showAdminToast('❌ Erro de conexão.');
  }
}

// ─── TOAST ────────────────────────────────────────────────────────────────

function showAdminToast(msg) {
  let t = document.getElementById('adminToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'adminToast';
    t.style.cssText = `
      position:fixed;bottom:2rem;right:2rem;z-index:9999;
      background:rgba(20,18,10,0.98);border:1px solid rgba(201,148,58,0.4);
      color:var(--cream);padding:0.9rem 1.8rem;font-size:0.8rem;
      font-family:'Montserrat',sans-serif;
      transform:translateY(80px);transition:transform 0.3s;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.transform = 'translateY(0)';
  setTimeout(() => { t.style.transform = 'translateY(80px)'; }, 2800);
}

// ─── INIT ─────────────────────────────────────────────────────────────────

// Permite login com Enter na tela de login
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('adminPass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
});
