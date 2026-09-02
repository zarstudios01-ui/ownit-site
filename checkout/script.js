const TAX_RATE = 0.0;
  let shippingCost = 0;

  function money(n){ return window.OwnItCart.pkr(n); }

  function renderSummary(){
    const cart = window.OwnItCart.getCart();
    const itemsEl = document.getElementById('summaryItems');
    const coGrid = document.getElementById('coGrid');
    const emptyEl = document.getElementById('emptyCart');

    if (cart.length === 0){
      coGrid.style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }
    coGrid.style.display = 'grid';
    emptyEl.style.display = 'none';

    itemsEl.innerHTML = cart.map(item => `
      <div class="sum-item">
        <img src="${item.image}" alt="${item.name}">
        <div>
          <div class="sum-item-name">${item.name}</div>
          <div class="sum-item-variant">${item.variant || ''}</div>
          <div class="sum-item-qty">Qty ${item.qty}</div>
        </div>
        <div class="sum-item-price">${money(item.price * item.qty)}</div>
      </div>`).join('');

    const subtotal = window.OwnItCart.cartTotal();
    const tax = subtotal * TAX_RATE;
    const total = subtotal + shippingCost + tax;
    document.getElementById('sumSubtotal').textContent = money(subtotal);
    document.getElementById('sumShipping').textContent = shippingCost === 0 ? 'Free' : money(shippingCost);
    document.getElementById('sumTax').textContent = money(tax);
    document.getElementById('sumTotal').textContent = money(total);
  }

  // Shipping method selection
  document.querySelectorAll('.ship-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.ship-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      opt.querySelector('input').checked = true;
      shippingCost = parseFloat(opt.querySelector('input').value);
      renderSummary();
    });
  });

  document.getElementById('promoBtn').addEventListener('click', () => {
    const btn = document.getElementById('promoBtn');
    const original = btn.textContent;
    btn.textContent = 'No active codes';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1800);
  });

  document.getElementById('checkoutForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const orderId = 'OWNIT-' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('orderIdLine').textContent = 'Order #' + orderId;
    document.getElementById('coContent').classList.add('hidden');
    document.getElementById('confirmPanel').classList.add('show');
    window.OwnItCart.clearCart();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  renderSummary();
