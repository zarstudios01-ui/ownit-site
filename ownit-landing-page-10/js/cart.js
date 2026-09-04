/* OwnIt — shared cart engine (front-end only, persisted via localStorage) */
(function () {
  const STORAGE_KEY = 'ownit_cart';
  // All prices are stored/entered in PKR (primary currency). This rate is only
  // used to compute the secondary USD reference shown alongside PKR — update
  // it here if the real rate needs adjusting; it is not wired to a live feed.
  const USD_RATE = 278;

  function pkr(n) {
    return 'Rs. ' + Math.round(n).toLocaleString('en-PK');
  }
  function usd(n) {
    return '$' + (n / USD_RATE).toFixed(2);
  }
  // Full price string: PKR primary, USD secondary — used everywhere a price is shown.
  function formatPrice(n) {
    return pkr(n) + ' <span class="usd-note">(~' + usd(n) + ' USD)</span>';
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    renderCart();
  }

  function addToCart(item) {
    const cart = getCart();
    const existing = cart.find((c) => c.id === item.id && c.variant === item.variant);
    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      cart.push(Object.assign({ qty: 1 }, item));
    }
    saveCart(cart);
    openCart();
  }

  function removeFromCart(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
  }

  function updateQty(index, qty) {
    const cart = getCart();
    if (!cart[index]) return;
    cart[index].qty = Math.max(1, qty);
    saveCart(cart);
  }

  function cartCount() {
    return getCart().reduce((sum, i) => sum + i.qty, 0);
  }

  function cartTotal() {
    return getCart().reduce((sum, i) => sum + i.qty * i.price, 0);
  }

  function money(n) {
    return pkr(n);
  }

  function renderCart() {
    const cart = getCart();
    document.querySelectorAll('.cart-count').forEach((el) => {
      el.textContent = cartCount();
    });
    document.querySelectorAll('[aria-label^="Cart"]').forEach((el) => {
      el.setAttribute('aria-label', 'Cart, ' + cartCount() + ' items');
    });

    const body = document.getElementById('cartDrawerBody');
    const footer = document.getElementById('cartDrawerFooter');
    if (!body) return;

    if (cart.length === 0) {
      body.innerHTML = '<p class="cart-empty">Your cart is empty. <a href="/#collection">Shop the collection →</a></p>';
      if (footer) footer.style.display = 'none';
      return;
    }
    if (footer) footer.style.display = 'block';

    body.innerHTML = cart
      .map(
        (item, i) => `
      <div class="cart-line">
        <img src="${item.image}" alt="${item.name}" width="64" height="64">
        <div class="cart-line-info">
          <p class="cart-line-name">${item.name}</p>
          <p class="cart-line-variant">${item.variant}</p>
          <div class="cart-line-qty">
            <button type="button" data-cart-dec="${i}" aria-label="Decrease quantity">−</button>
            <span>${item.qty}</span>
            <button type="button" data-cart-inc="${i}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="cart-line-right">
          <span class="cart-line-price">${formatPrice(item.price * item.qty)}</span>
          <button type="button" class="cart-line-remove" data-cart-remove="${i}" aria-label="Remove item">Remove</button>
        </div>
      </div>`
      )
      .join('');

    const subtotalEl = document.getElementById('cartSubtotal');
    if (subtotalEl) subtotalEl.innerHTML = formatPrice(cartTotal());
  }

  function openCart() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function clearCart() {
    saveCart([]);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderCart();

    document.querySelectorAll('[data-cart-open]').forEach((btn) =>
      btn.addEventListener('click', openCart)
    );
    document.querySelectorAll('[data-cart-close]').forEach((btn) =>
      btn.addEventListener('click', closeCart)
    );

    const body = document.getElementById('cartDrawerBody');
    if (body) {
      body.addEventListener('click', (e) => {
        const inc = e.target.getAttribute('data-cart-inc');
        const dec = e.target.getAttribute('data-cart-dec');
        const rem = e.target.getAttribute('data-cart-remove');
        const cart = getCart();
        if (inc !== null) updateQty(+inc, cart[+inc].qty + 1);
        if (dec !== null) updateQty(+dec, cart[+dec].qty - 1);
        if (rem !== null) removeFromCart(+rem);
      });
    }

    // Generic "Add to Cart" wiring for any button/link carrying data-add-to-cart
    document.querySelectorAll('[data-add-to-cart]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        addToCart({
          id: el.dataset.id,
          name: el.dataset.name,
          variant: el.dataset.variant || 'PS5 · Console + Controller',
          price: parseFloat(el.dataset.price),
          image: el.dataset.image,
          qty: 1,
        });
      });
    });

    initPriceReveal();
  });

  // Press-and-hold PKR -> USD reveal for coverage/price cards.
  // Default state shows PKR; holding a finger (or mouse button) down
  // swaps to the USD equivalent, releasing swaps it back.
  function injectPriceRevealStyles() {
    if (document.getElementById('oa-price-reveal-styles')) return;
    const style = document.createElement('style');
    style.id = 'oa-price-reveal-styles';
    style.textContent =
      '.price-reveal-fx{font-size:9px;color:var(--graphite);margin-left:4px;letter-spacing:.02em;}' +
      '.price-reveal-active{color:var(--blood);}';
    document.head.appendChild(style);
  }

  function initPriceReveal() {
    const cards = document.querySelectorAll('.coverage-card[data-price]');
    if (cards.length === 0) return;
    injectPriceRevealStyles();

    cards.forEach((card) => {
      const priceEl = card.querySelector('.cc-price');
      const pkrValue = parseFloat(card.dataset.price);
      if (!priceEl || isNaN(pkrValue)) return;

      const pkrText = pkr(pkrValue);
      const usdText = usd(pkrValue);
      let holdTimer;

      function toPkr() {
        priceEl.innerHTML = pkrText + ' <span class="price-reveal-fx">\u21c4</span>';
        priceEl.classList.remove('price-reveal-active');
      }
      function toUsd() {
        priceEl.innerHTML = usdText + ' <span class="price-reveal-fx price-reveal-active">\u21c4</span>';
        priceEl.classList.add('price-reveal-active');
      }
      toPkr();

      card.addEventListener('pointerdown', () => {
        holdTimer = setTimeout(toUsd, 160);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
        card.addEventListener(evt, () => {
          clearTimeout(holdTimer);
          toPkr();
        });
      });
    });
  }

  // Expose for page-specific Add to Cart buttons
  window.OwnItCart = { addToCart, getCart, cartTotal, cartCount, openCart, closeCart, money, pkr, usd, formatPrice, clearCart };
})();
