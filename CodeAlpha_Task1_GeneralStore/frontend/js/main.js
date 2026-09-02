// ============================================
// Homepage: product listing with search
// ============================================

async function loadProducts(search = '') {
  const grid = document.getElementById('product-grid');
  const count = document.getElementById('result-count');
  grid.innerHTML = `<p style="color:var(--muted)">Loading products…</p>`;

  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const products = await apiRequest(`/products${query}`);

    if (products.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="big">No products found</div><p>Try a different search term.</p></div>`;
      count.textContent = '0 items';
      return;
    }

    count.textContent = `${products.length} item${products.length === 1 ? '' : 's'}`;
    grid.innerHTML = products.map(renderProductCard).join('');
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--danger)">Could not load products: ${escapeHtml(err.message)}</p>`;
  }
}

function renderProductCard(p) {
  const outOfStock = p.stock <= 0;
  return `
    <a class="product-card" href="product.html?id=${p.id}">
      <div class="thumb"><img src="${p.image_url}" alt="${escapeHtml(p.name)}" loading="lazy"></div>
      <div class="info">
        <div class="category">${escapeHtml(p.category || 'General')}</div>
        <h3>${escapeHtml(p.name)}</h3>
        <div class="price">${money(p.price)}</div>
        <div class="stock-note">${outOfStock ? 'Out of stock' : `${p.stock} in stock`}</div>
      </div>
    </a>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  const form = document.getElementById('search-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = document.getElementById('search-input').value.trim();
      loadProducts(value);
    });
  }
});
