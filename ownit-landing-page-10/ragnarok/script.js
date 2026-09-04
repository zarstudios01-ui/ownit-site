const state = { model: 'PS5 Disc', coverage: 'Console Only', price: 1500, qty: 1, cart: 0 };

  const priceDisplay = document.getElementById('priceDisplay');
  const stickyPrice = document.getElementById('stickyPrice');
  const mainImage = document.getElementById('mainImage');
  const coverageSelected = document.getElementById('coverageSelected');
  const modelSelected = document.getElementById('modelSelected');

  function formatPrice(p){ return window.OwnItCart.pkr(p); }
  function refreshPrice(){
    const total = state.price * state.qty;
    priceDisplay.textContent = window.OwnItCart.pkr(state.price);
    stickyPrice.textContent = formatPrice(total);
  }

  // Model pills
  document.querySelectorAll('#modelPills .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#modelPills .pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.model = btn.dataset.model;
      modelSelected.textContent = state.model;
    });
  });

  // Coverage cards (also drives price + main image)
  document.querySelectorAll('#coveragePills .coverage-card').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#coveragePills .coverage-card').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.coverage = btn.dataset.coverage;
      state.price = parseFloat(btn.dataset.price);
      coverageSelected.textContent = state.coverage;
      mainImage.src = btn.dataset.img;
      document.querySelectorAll('.gallery-thumb').forEach(t => {
        t.classList.toggle('active', t.dataset.img === btn.dataset.img);
        t.setAttribute('aria-selected', t.dataset.img === btn.dataset.img ? 'true' : 'false');
      });
      refreshPrice();
    });
  });

  // Gallery thumbnails
  document.querySelectorAll('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      mainImage.src = thumb.dataset.img;
      document.querySelectorAll('.gallery-thumb').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      thumb.classList.add('active');
      thumb.setAttribute('aria-selected','true');
    });
  });

  // Quantity stepper
  const qtyValue = document.getElementById('qtyValue');
  document.getElementById('qtyMinus').addEventListener('click', () => {
    state.qty = Math.max(1, state.qty - 1);
    qtyValue.textContent = state.qty;
    refreshPrice();
  });
  document.getElementById('qtyPlus').addEventListener('click', () => {
    state.qty = Math.min(9, state.qty + 1);
    qtyValue.textContent = state.qty;
    refreshPrice();
  });

  // Add to cart — routes through the shared OwnItCart engine (js/cart.js)
  function addMainToCart(){
    window.OwnItCart.addToCart({
      id: 'ragnarok',
      name: 'Ragnarok',
      variant: state.model + ' · ' + state.coverage,
      price: state.price,
      image: mainImage.src,
      qty: state.qty
    });
  }
  document.getElementById('addToCartBtn').addEventListener('click', addMainToCart);
  document.getElementById('stickyAddBtn').addEventListener('click', addMainToCart);
  document.getElementById('bundleAddBtn').addEventListener('click', () => {
    window.OwnItCart.addToCart({ id:'ragnarok-controller', name:'Ragnarok Controller Skin', variant:'Controller Only', price:500, image:'images/product-ragnarok-controller.jpg', qty:1 });
  });

  // Sticky bar visibility
  const stickyBar = document.getElementById('stickyBar');
  const addBtnRef = document.getElementById('addToCartBtn');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => stickyBar.classList.toggle('show', !entry.isIntersecting));
  }, { threshold: 0 });
  observer.observe(addBtnRef);

  refreshPrice();
