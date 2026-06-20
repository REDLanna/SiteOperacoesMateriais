// public/js/cart.js — Gerenciamento do carrinho (localStorage)

const CART_KEY = 'lart_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartUI();
}

function addToCart(product, qty = 1) {
  const cart = getCart();
  const idx = cart.findIndex(i => i.product_id === product.id);
  if (idx >= 0) {
    cart[idx].quantity += qty;
  } else {
    cart.push({
      product_id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      volume_ml: product.volume_ml,
      price: product.price,
      quantity: qty
    });
  }
  saveCart(cart);
  showToast(`🌶️ ${product.name} adicionado ao carrinho!`);
}

function removeFromCart(productId) {
  saveCart(getCart().filter(i => i.product_id !== productId));
}

function updateQty(productId, qty) {
  if (qty <= 0) return removeFromCart(productId);
  const cart = getCart();
  const idx = cart.findIndex(i => i.product_id === productId);
  if (idx >= 0) { cart[idx].quantity = qty; saveCart(cart); }
}

function getCartTotal() {
  return getCart().reduce((s, i) => s + i.price * i.quantity, 0);
}

function getCartCount() {
  return getCart().reduce((s, i) => s + i.quantity, 0);
}

function updateCartUI() {
  const cart = getCart();
  const count = getCartCount();

  // Badge no botão
  const badge = document.getElementById('cartCount');
  if (badge) badge.textContent = count;

  // Drawer
  const itemsEl = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');
  const totalEl  = document.getElementById('cartTotalDisplay');

  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty"><span>🛒</span><p>Seu carrinho está vazio</p></div>`;
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-vol">${item.volume_ml ? item.volume_ml + 'ml' : item.subtitle || ''}</div>
        <div class="cart-item-qty">
          <div class="qty-control">
            <button class="qty-btn" onclick="updateQty(${item.product_id}, ${item.quantity - 1})">−</button>
            <span class="qty-num">${item.quantity}</span>
            <button class="qty-btn" onclick="updateQty(${item.product_id}, ${item.quantity + 1})">+</button>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem">
        <div class="cart-item-price">${fmtBRL(item.price * item.quantity)}</div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.product_id})">✕ remover</button>
      </div>
    </div>
  `).join('');

  if (footerEl) footerEl.style.display = 'block';
  if (totalEl)  totalEl.textContent = fmtBRL(getCartTotal());
}

function toggleCart() {
  const drawer  = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (!drawer) return;
  const open = drawer.classList.toggle('open');
  overlay.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

function goToCheckout() {
  if (getCartCount() === 0) return showToast('Carrinho vazio!');
  window.location.href = '/checkout';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function fmtBRL(v) {
  return 'R$ ' + parseFloat(v).toFixed(2).replace('.', ',');
}

// Inicializa UI ao carregar
document.addEventListener('DOMContentLoaded', updateCartUI);
