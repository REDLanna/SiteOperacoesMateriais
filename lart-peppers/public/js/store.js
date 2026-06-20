// public/js/store.js — Lógica da página principal

let products = [];
const quantities = {};

// Scroll nav effect
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 60);
});

// Partículas de fundo
(function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      position:absolute; width:${size}px; height:${size}px; border-radius:50%;
      background:rgba(232,52,26,${Math.random()*0.4+0.1});
      left:${Math.random()*100}%; top:${Math.random()*100}%;
      animation: float ${Math.random()*8+6}s ease-in-out infinite alternate;
      animation-delay:${Math.random()*4}s;
    `;
    container.appendChild(p);
  }
  const style = document.createElement('style');
  style.textContent = `@keyframes float { from{transform:translateY(0) scale(1)} to{transform:translateY(-30px) scale(1.3)} }`;
  document.head.appendChild(style);
})();

// Scroll to products
function scrollToProducts() {
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// Carrega produtos da API
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    products = data.products;
    renderProducts(products);
  } catch (err) {
    document.getElementById('productsGrid').innerHTML =
      `<div style="grid-column:1/-1;text-align:center;color:rgba(245,237,224,0.4);padding:4rem">
        Erro ao carregar produtos. Verifique se o servidor está rodando.
      </div>`;
  }
}

function renderProducts(prods) {
  const grid = document.getElementById('productsGrid');
  if (!prods.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--gray);padding:4rem">Nenhum produto disponível no momento.</div>`;
    return;
  }

  const visualClasses = ['product-visual-1', 'product-visual-2', 'product-visual-3'];
  const badges = [null, null, 'Mais Vendido'];
  const icons = ['🌶️', '🔥', '🫙'];

  grid.innerHTML = prods.map((p, i) => {
    quantities[p.id] = 1;
    const outOfStock = p.stock <= 0;
    return `
    <div class="product-card" style="animation: fadeUp ${0.2 + i * 0.1}s ease forwards; opacity:0">
      <div class="product-visual ${visualClasses[i % 3]}">
        <span class="pepper-icon">${icons[i % 3]}</span>
        ${badges[i % 3] ? `<div class="product-badge">${badges[i % 3]}</div>` : ''}
      </div>
      <div class="product-body">
        <div class="product-vol">${p.volume_ml ? p.volume_ml + 'ml' : 'Kit'}</div>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-subtitle">${p.subtitle || ''}</p>
        <p class="product-desc">${p.description || ''}</p>
        <p class="product-shu">🌡️ ${p.shu || '2.200.000 SHU'}</p>
        <div class="product-footer">
          <div class="product-price">
            <small>R$</small> ${parseFloat(p.price).toFixed(2).replace('.', ',')}
          </div>
          ${outOfStock
            ? `<span style="font-size:0.7rem;color:var(--red-bright);letter-spacing:0.2em">ESGOTADO</span>`
            : `
              <div class="qty-control">
                <button class="qty-btn" onclick="changeQty(${p.id}, -1)">−</button>
                <span class="qty-num" id="qty-${p.id}">1</span>
                <button class="qty-btn" onclick="changeQty(${p.id}, 1)">+</button>
              </div>
              <button class="add-cart-btn" onclick="addProductToCart(${p.id})">Adicionar</button>
            `
          }
        </div>
        <div style="font-size:0.65rem;color:var(--gray);margin-top:0.8rem">
          📦 ${p.stock > 0 ? `${p.stock} unidades disponíveis` : 'Esgotado'}
        </div>
      </div>
    </div>
    `;
  }).join('');
}

function changeQty(productId, delta) {
  quantities[productId] = Math.max(1, (quantities[productId] || 1) + delta);
  const el = document.getElementById('qty-' + productId);
  if (el) el.textContent = quantities[productId];
}

function addProductToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  addToCart(product, quantities[productId] || 1);
  quantities[productId] = 1;
  const el = document.getElementById('qty-' + productId);
  if (el) el.textContent = 1;
}

// Init
loadProducts();
