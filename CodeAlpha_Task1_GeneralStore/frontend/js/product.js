// ============================================
// Product detail page
// ============================================

let currentProduct = null;

function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

async function loadProduct() {
  const wrap = document.getElementById('pdp-wrap');
  const id = getProductIdFromUrl();

  if (!id) {
    wrap.innerHTML = `<p>No product specified.</p>`;
    return;
  }

  try {
    const p = await apiRequest(`/products/${id}`);
    currentProduct = p;
    document.title = `${p.name} — General Store`;

    const outOfStock = p.stock <= 0;

    wrap.innerHTML = `
      <div class="thumb-large"><img src="${p.image_url}" alt="${escapeHtml(p.name)}"></div>
      <div>
        <div class="category">${escapeHtml(p.category || 'General')}</div>
        <h1>${escapeHtml(p.name)}</h1>
        <div class="price">${money(p.price)}</div>
        <p class="desc">${escapeHtml(p.description || '')}</p>
        <p class="stock-note" style="margin-bottom:20px">${outOfStock ? 'Out of stock' : `${p.stock} in stock`}</p>

        <div class="qty-row">
          <div class="qty-stepper">
            <button type="button" id="qty-minus">−</button>
            <input type="number" id="qty-input" value="1" min="1" max="${p.stock}">
            <button type="button" id="qty-plus">+</button>
          </div>
        </div>

        <div class="action-row">
          <button class="btn btn-primary" id="add-to-cart-btn" ${outOfStock ? 'disabled' : ''}>
            ${outOfStock ? 'Out of stock' : 'Add to cart'}
          </button>
          <a class="btn btn-outline" href="cart.html">View cart</a>
        </div>
        <p id="add-feedback" class="alert alert-success" style="margin-top:16px"></p>
      </div>
    `;

    document.getElementById('qty-minus').addEventListener('click', () => stepQty(-1));
    document.getElementById('qty-plus').addEventListener('click', () => stepQty(1));
    document.getElementById('add-to-cart-btn').addEventListener('click', handleAddToCart);
  } catch (err) {
    wrap.innerHTML = `<p style="color:var(--danger)">Could not load product: ${escapeHtml(err.message)}</p>`;
  }
}

function stepQty(delta) {
  const input = document.getElementById('qty-input');
  let val = parseInt(input.value, 10) || 1;
  val = Math.min(Math.max(val + delta, 1), parseInt(input.max, 10) || 999);
  input.value = val;
}

function handleAddToCart() {
  const qty = parseInt(document.getElementById('qty-input').value, 10) || 1;
  addToCart(currentProduct, qty);

  const feedback = document.getElementById('add-feedback');
  feedback.textContent = `Added ${qty} × ${currentProduct.name} to your cart.`;
  feedback.classList.add('show');
  setTimeout(() => feedback.classList.remove('show'), 2500);
}

document.addEventListener('DOMContentLoaded', loadProduct);
