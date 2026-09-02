// ============================================
// Order history page
// ============================================

async function loadOrders() {
  const wrap = document.getElementById('orders-wrap');

  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=orders.html';
    return;
  }

  try {
    const orders = await apiRequest('/orders', { auth: true });

    if (orders.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><div class="big">No orders yet</div><p>Items you buy will show up here.</p><br><a class="btn btn-dark" href="index.html">Browse products</a></div>`;
      return;
    }

    // Fetch line items for each order
    const detailed = await Promise.all(
      orders.map(o => apiRequest(`/orders/${o.id}`, { auth: true }))
    );

    wrap.innerHTML = detailed.map(renderOrderCard).join('');
  } catch (err) {
    wrap.innerHTML = `<p style="color:var(--danger)">Could not load orders: ${escapeHtml(err.message)}</p>`;
  }
}

function renderOrderCard(order) {
  const date = new Date(order.created_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const itemRows = order.items.map(item => `
    <div class="order-item-row">
      <span>${item.quantity} × ${escapeHtml(item.product_name)}</span>
      <span>${money(item.price * item.quantity)}</span>
    </div>
  `).join('');

  return `
    <div class="order-card">
      <div class="order-head">
        <span>Order #${order.id} · ${date}</span>
        <span class="status-pill">${escapeHtml(order.status)}</span>
      </div>
      ${itemRows}
      <div class="order-total">Total: ${money(order.total)}</div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', loadOrders);
