// ============================================
// Cart page: view items, update quantities, checkout
// ============================================

function renderCart() {
  const cart = getCart();
  const layout = document.getElementById('cart-layout');
  const itemsWrap = document.getElementById('cart-items');
  const emptyState = document.getElementById('cart-empty');

  if (cart.length === 0) {
    layout.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  layout.style.display = 'grid';
  emptyState.style.display = 'none';

  itemsWrap.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="thumb"><img src="${item.image_url}" alt="${escapeHtml(item.name)}"></div>
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <div class="unit-price">${money(item.price)} each</div>
      </div>
      <div class="qty-stepper">
        <button type="button" class="qty-minus">−</button>
        <input type="number" class="qty-input" value="${item.qty}" min="1">
        <button type="button" class="qty-plus">+</button>
      </div>
      <div style="text-align:right">
        <div class="line-total">${money(item.price * item.qty)}</div>
        <button type="button" class="remove-link">Remove</button>
      </div>
    </div>
  `).join('');

  renderSummary();
  attachCartItemListeners();
}

function renderSummary() {
  const total = cartTotal();
  document.getElementById('summary-subtotal').textContent = money(total);
  document.getElementById('summary-total').textContent = money(total);
}

function attachCartItemListeners() {
  document.querySelectorAll('.cart-item').forEach(row => {
    const id = parseInt(row.dataset.id, 10);
    const input = row.querySelector('.qty-input');

    row.querySelector('.qty-minus').addEventListener('click', () => {
      const val = Math.max(1, parseInt(input.value, 10) - 1);
      input.value = val;
      updateCartQty(id, val);
      renderCart();
    });
    row.querySelector('.qty-plus').addEventListener('click', () => {
      const val = parseInt(input.value, 10) + 1;
      input.value = val;
      updateCartQty(id, val);
      renderCart();
    });
    input.addEventListener('change', () => {
      const val = Math.max(1, parseInt(input.value, 10) || 1);
      updateCartQty(id, val);
      renderCart();
    });
    row.querySelector('.remove-link').addEventListener('click', () => {
      removeFromCart(id);
      renderCart();
    });
  });
}

async function handleCheckout() {
  const feedback = document.getElementById('checkout-feedback');
  feedback.className = 'alert';
  feedback.textContent = '';

  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=cart.html';
    return;
  }

  const cart = getCart();
  if (cart.length === 0) return;

  const shippingAddress = document.getElementById('shipping-address').value.trim();
  const btn = document.getElementById('checkout-btn');
  btn.disabled = true;
  btn.textContent = 'Placing order…';

  try {
    const items = cart.map(item => ({ product_id: item.id, quantity: item.qty }));
    const result = await apiRequest('/orders', {
      method: 'POST',
      auth: true,
      body: { items, shipping_address: shippingAddress }
    });

    clearCart();
    feedback.textContent = `Order #${result.order_id} placed successfully! Redirecting to your orders…`;
    feedback.classList.add('alert-success', 'show');
    setTimeout(() => { window.location.href = 'orders.html'; }, 1500);
  } catch (err) {
    feedback.textContent = err.message;
    feedback.classList.add('alert-error', 'show');
    btn.disabled = false;
    btn.textContent = 'Place order';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);
});
