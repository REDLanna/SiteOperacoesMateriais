// public/js/checkout.js

let currentStep = 1;
let shippingCost = 0;
let paymentMethod = 'credit';

// ─── INIT ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const cart = getCart();
  if (!cart.length) { window.location.href = '/'; return; }
  renderSummary();

  // Máscaras
  document.getElementById('phone')?.addEventListener('input', e => {
    e.target.value = maskPhone(e.target.value);
  });
  document.getElementById('cpf')?.addEventListener('input', e => {
    e.target.value = maskCPF(e.target.value);
  });
  document.getElementById('cep')?.addEventListener('input', e => {
    e.target.value = maskCEP(e.target.value);
  });
});

// ─── SUMMARY ─────────────────────────────────────────────────────────────

function renderSummary() {
  const cart = getCart();
  const icons = { 'reaper-30ml': '🌶️', 'reaper-100ml': '🔥', 'reaper-kit': '🫙' };
  const subtotal = getCartTotal();

  document.getElementById('summaryItems').innerHTML = cart.map(item => `
    <div class="summary-item">
      <div class="summary-item-thumb">🌶️</div>
      <div class="summary-item-info">
        <div class="summary-item-name">${item.name}</div>
        <div class="summary-item-vol">${item.volume_ml ? item.volume_ml + 'ml' : item.subtitle || ''}</div>
        <div class="summary-item-qty">Qtd: ${item.quantity}</div>
      </div>
      <div class="summary-item-price">${fmtBRL(item.price * item.quantity)}</div>
    </div>
  `).join('');

  updateTotals();
}

function updateTotals() {
  const subtotal = getCartTotal();
  const total = subtotal + shippingCost;
  document.getElementById('summarySubtotal').textContent = fmtBRL(subtotal);
  document.getElementById('summaryShipping').textContent = shippingCost > 0 ? fmtBRL(shippingCost) : 'Grátis';
  document.getElementById('summaryTotal').textContent = fmtBRL(total);
}

function updateShipping(cost) {
  shippingCost = parseFloat(cost);
  updateTotals();
}

// ─── STEPS ───────────────────────────────────────────────────────────────

function goToStep(n) {
  if (n > currentStep && !validateStep(currentStep)) return;

  document.querySelectorAll('.form-step').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === n);
  });
  document.querySelectorAll('.step').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i + 1 === n) el.classList.add('active');
    if (i + 1 < n) el.classList.add('done');
  });
  currentStep = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── VALIDATION ──────────────────────────────────────────────────────────

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

function setError(id, msg) {
  const el = document.getElementById(id + 'Error');
  if (el) el.textContent = msg;
  document.getElementById(id)?.focus();
}

function validateStep(step) {
  clearErrors();
  if (step === 1) {
    const name  = document.getElementById('name')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const cpf   = document.getElementById('cpf')?.value.trim();
    let ok = true;
    if (!name || name.length < 3)   { setError('name', 'Nome obrigatório (mín. 3 caracteres)'); ok = false; }
    if (!email || !email.includes('@')) { setError('email', 'E-mail inválido'); ok = false; }
    if (!phone || phone.replace(/\D/g,'').length < 10) { setError('phone', 'Telefone inválido'); ok = false; }
    if (!cpf || cpf.replace(/\D/g,'').length < 11) { setError('cpf', 'CPF inválido'); ok = false; }
    return ok;
  }
  if (step === 2) {
    const cep      = document.getElementById('cep')?.value.trim();
    const street   = document.getElementById('street')?.value.trim();
    const number   = document.getElementById('number')?.value.trim();
    const district = document.getElementById('district')?.value.trim();
    const city     = document.getElementById('city')?.value.trim();
    const state    = document.getElementById('state')?.value.trim();
    let ok = true;
    if (!cep || cep.replace(/\D/g,'').length < 8)   { setError('cep', 'CEP inválido'); ok = false; }
    if (!street)   { setError('street', 'Rua obrigatória'); ok = false; }
    if (!number)   { setError('number', 'Número obrigatório'); ok = false; }
    if (!district) { setError('district', 'Bairro obrigatório'); ok = false; }
    if (!city)     { setError('city', 'Cidade obrigatória'); ok = false; }
    if (!state || state.length !== 2) { setError('state', 'UF inválida'); ok = false; }
    return ok;
  }
  return true;
}

function validatePayment() {
  clearErrors();
  if (paymentMethod === 'pix') return true;
  const num  = document.getElementById('cardNumber')?.value.replace(/\D/g,'');
  const name = document.getElementById('cardName')?.value.trim();
  const exp  = document.getElementById('cardExpiry')?.value.trim();
  const cvv  = document.getElementById('cardCvv')?.value.trim();
  let ok = true;
  if (!num || num.length < 16) { setError('cardNumber', 'Número inválido (16 dígitos)'); ok = false; }
  if (!name || name.length < 3) { setError('cardName', 'Nome obrigatório'); ok = false; }
  if (!exp || exp.length < 5)  { setError('cardExpiry', 'Validade inválida'); ok = false; }
  if (!cvv || cvv.length < 3)  { setError('cardCvv', 'CVV inválido'); ok = false; }
  return ok;
}

// ─── PAYMENT ─────────────────────────────────────────────────────────────

function selectPayment(method, btn) {
  paymentMethod = method;
  document.querySelectorAll('.pay-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const isCard = method === 'credit' || method === 'debit';
  document.getElementById('cardForm').style.display = isCard ? 'block' : 'none';
  document.getElementById('pixForm').style.display  = method === 'pix' ? 'block' : 'none';
  document.getElementById('installmentsField').style.display = method === 'credit' ? 'block' : 'none';
  document.getElementById('payBtnText').textContent = method === 'pix' ? 'Gerar PIX' : 'Confirmar Pedido';
}

// Card formatting
function formatCard(input) {
  let v = input.value.replace(/\D/g,'').slice(0,16);
  input.value = v.match(/.{1,4}/g)?.join(' ') || v;
  document.getElementById('previewNumber').textContent =
    (v + '0000000000000000').slice(0,16).match(/.{1,4}/g).join(' ').replace(/0+$/, '••••').replace(/(\d)0/g, '$1•');
  const brands = { '4':'VISA', '5':'MASTERCARD', '3':'AMEX', '6':'ELO' };
  document.getElementById('previewBrand').textContent = brands[v[0]] || 'CARTÃO';
}

function formatExpiry(input) {
  let v = input.value.replace(/\D/g,'').slice(0,4);
  if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
  input.value = v;
  document.getElementById('previewExpiry').textContent = v || 'MM/AA';
}

// ─── CEP AUTOCOMPLETE ─────────────────────────────────────────────────────

let cepTimer;
async function fetchCep(value) {
  const cep = value.replace(/\D/g,'');
  if (cep.length !== 8) return;
  clearTimeout(cepTimer);
  cepTimer = setTimeout(async () => {
    document.getElementById('cepLoading').style.display = 'flex';
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await res.json();
      if (d.erro) { setError('cep', 'CEP não encontrado'); return; }
      document.getElementById('street').value   = d.logradouro || '';
      document.getElementById('district').value = d.bairro || '';
      document.getElementById('city').value     = d.localidade || '';
      document.getElementById('state').value    = d.uf || '';
      document.getElementById('number').focus();
    } catch {
      // Sem internet para o ViaCEP — usuário preenche manualmente
    } finally {
      document.getElementById('cepLoading').style.display = 'none';
    }
  }, 600);
}

// ─── SUBMIT ───────────────────────────────────────────────────────────────

async function submitOrder() {
  if (!validatePayment()) return;

  const cart = getCart();
  if (!cart.length) return;

  const btn     = document.getElementById('payBtn');
  const btnText = document.getElementById('payBtnText');
  const spinner = document.getElementById('paySpinner');

  btn.disabled = true;
  btnText.style.display = 'none';
  spinner.style.display = 'inline-block';

  const cardNumber = document.getElementById('cardNumber')?.value.replace(/\D/g,'');
  const total = getCartTotal() + shippingCost;

  const payload = {
    customer: {
      name:  document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      cpf:   document.getElementById('cpf').value.trim()
    },
    address: {
      cep:        document.getElementById('cep').value.trim(),
      street:     document.getElementById('street').value.trim(),
      number:     document.getElementById('number').value.trim(),
      complement: document.getElementById('complement').value.trim(),
      district:   document.getElementById('district').value.trim(),
      city:       document.getElementById('city').value.trim(),
      state:      document.getElementById('state').value.trim()
    },
    items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
    payment: {
      method: paymentMethod,
      card_last4: cardNumber ? cardNumber.slice(-4) : null,
      card_brand: document.getElementById('previewBrand')?.textContent || null,
      cardholder_name: document.getElementById('cardName')?.value.trim() || null,
      installments: parseInt(document.getElementById('installments')?.value || 1)
    },
    shipping: shippingCost
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'Erro ao processar pedido.');

    window.location.href = `/confirmacao?order=${data.order_number}&pay=${paymentMethod}&total=${total}`;
  } catch (err) {
    btn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
    alert('❌ ' + err.message);
  }
}

// ─── MASKS ───────────────────────────────────────────────────────────────

function maskPhone(v) {
  v = v.replace(/\D/g,'').slice(0,11);
  if (v.length > 6) return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0,2)}) ${v.slice(2)}`;
  return v;
}

function maskCPF(v) {
  v = v.replace(/\D/g,'').slice(0,11);
  if (v.length > 9) return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
  if (v.length > 6) return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
  if (v.length > 3) return `${v.slice(0,3)}.${v.slice(3)}`;
  return v;
}

function maskCEP(v) {
  v = v.replace(/\D/g,'').slice(0,8);
  if (v.length > 5) return `${v.slice(0,5)}-${v.slice(5)}`;
  return v;
}
