/* Halaman toko Asekicks: katalog, wishlist, keranjang (wajib login), checkout, pesanan. */
(function () {
  'use strict';
  const { esc, rupiah, api, toast, ls } = AK;
  const $ = (s, r) => (r || document).querySelector(s);

  const PRICE = [{}, { max: 500000 }, { min: 500000, max: 1000000 }, { min: 1000000 }];
  const EMPTY_CART = { items: [], count: 0, subtotal: 0, shipping: 0, total: 0 };
  const state = { q: '', cat: '', price: 0, stock: false, page: 1, items: [], cart: null, wish: {}, categories: [] };

  try { state.wish = JSON.parse(ls.get('ak_wish') || '{}') || {}; } catch (e) { state.wish = {}; }
  const saveWish = () => ls.set('ak_wish', JSON.stringify(state.wish));

  /* ---------- potongan HTML kecil ---------- */
  const grad = (p) => {
    const c = (p && p.colors) || [];
    return 'linear-gradient(135deg,' + esc(c[0] || '#6366f1') + ',' + esc(c[1] || '#ec4899') + ')';
  };
  const imgTag = (p) => p && p.img_url
    ? '<img src="' + esc(p.img_url) + '" alt="' + esc(p.name) + '" loading="lazy" onerror="this.remove()">' : '';

  /* ---------- lencana navbar ---------- */
  function updateBadges() {
    const n = state.cart ? state.cart.count : 0;
    const cb = $('#cartBadge'); cb.textContent = n; cb.hidden = n < 1;
    const w = Object.keys(state.wish).length;
    const wb = $('#wishBadge'); wb.textContent = w; wb.hidden = w < 1;
  }
  function updateAcct() {
    const u = AK.user();
    $('#acctLbl').textContent = u && AK.token() ? u.name.split(' ')[0] : 'Masuk';
  }
  async function fetchCart() {
    if (!AK.token()) { state.cart = null; updateBadges(); return; }
    const r = await api('/cart');
    if (r.ok) { state.cart = r.data; updateBadges(); }
  }
  function afterLogin() { updateAcct(); fetchCart(); }

  /* ---------- katalog ---------- */
  function card(p) {
    const out = p.stock < 1, low = p.stock >= 1 && p.stock <= 5, wished = !!state.wish[p.id];
    return '<article class="card">' +
      '<div class="cover" data-detail="' + p.id + '" style="background:' + grad(p) + '"><span class="emoji">👟</span>' + imgTag(p) +
        (out ? '<span class="ribbon">Habis</span>' : low ? '<span class="ribbon warn">Stok menipis</span>' : '') + '</div>' +
      '<div class="card-body">' +
        '<span class="tag">' + esc(p.category && p.category.name) + '</span>' +
        '<h3 class="title">' + esc(p.name) + '</h3>' +
        '<p class="author">' + esc(p.brand) + '</p>' +
        '<div class="meta"><b class="price">' + rupiah(p.price) + '</b><span>⭐ ' + p.rating + '</span></div>' +
        '<div class="meta"><span class="stock ' + (out ? 'no' : 'ok') + '">' + (out ? 'Tidak tersedia' : 'Stok ' + p.stock) + '</span></div>' +
        '<div class="card-actions">' +
          '<button class="btn small ' + (wished ? 'liked' : 'outline') + '" data-wish="' + p.id + '">' + (wished ? '❤️ Tersimpan' : '🤍 Simpan') + '</button>' +
          '<button class="btn ghost small" data-detail="' + p.id + '">Detail</button>' +
        '</div></div></article>';
  }

  function renderGrid() {
    $('#grid').innerHTML = state.items.length
      ? state.items.map(card).join('')
      : '<div class="empty"><div class="big">🔍</div><h3>Sepatu tidak ditemukan</h3><p>Coba kata kunci lain atau ubah filter kategori dan harga.</p></div>';
  }

  async function loadProducts() {
    const q = new URLSearchParams({ page: state.page, per_page: 12 });
    if (state.q) q.set('search', state.q);
    if (state.cat) q.set('category_id', state.cat);
    const pr = PRICE[state.price];
    if (pr.min) q.set('min_price', pr.min);
    if (pr.max) q.set('max_price', pr.max);
    if (state.stock) q.set('in_stock', 1);

    $('#count').textContent = 'Memuat...';
    const r = await api('/products?' + q.toString());
    if (!r.ok) {
      state.items = [];
      $('#grid').innerHTML = '<div class="empty"><div class="big">⚠️</div><h3>Gagal memuat produk</h3><p>' + esc(AK.errMsg(r)) + '</p></div>';
      $('#count').textContent = '';
      $('#pager').innerHTML = '';
      return;
    }
    state.items = r.data.data || [];
    const meta = r.data.meta || {};
    renderGrid();
    $('#count').textContent = (meta.total || 0) + ' sepatu ditemukan';
    $('#pager').innerHTML = AK.pagerHtml(meta);
  }

  async function loadCategories() {
    const r = await api('/categories');
    const cats = r.ok && Array.isArray(r.data) ? r.data : [];
    state.categories = cats;
    const all = [{ category_id: '', category: 'Semua' }].concat(cats);
    $('#chips').innerHTML = all.map((c) =>
      '<button class="chip ' + (String(c.category_id) === String(state.cat) ? 'active' : '') + '" data-cat="' + c.category_id + '">' + esc(c.category) + '</button>').join('');
  }

  /* ---------- wishlist ---------- */
  function toggleWish(p) {
    if (state.wish[p.id]) delete state.wish[p.id];
    else state.wish[p.id] = { id: p.id, name: p.name, brand: p.brand, price: p.price, colors: p.colors, img_url: p.img_url };
    saveWish(); updateBadges(); renderGrid();
  }

  function openWish() {
    const L = AK.layer('<div class="panel-head"><h2></h2><button class="x" data-close aria-label="Tutup">✕</button></div><div class="panel-body"></div>', { panel: true });
    const body = L.$('.panel-body');
    function draw() {
      const list = Object.values(state.wish);
      L.$('h2').textContent = '❤️ Wishlist (' + list.length + ')';
      body.innerHTML = list.length ? list.map((w) =>
        '<div class="row-item"><div class="thumb" style="background:' + grad(w) + '"><span>👟</span>' + imgTag(w) + '</div>' +
        '<div><b>' + esc(w.name) + '</b><small>' + esc(w.brand) + ' · ' + rupiah(w.price) + '</small>' +
        '<div class="qty"><button class="btn small outline" data-wdetail="' + w.id + '" style="width:auto">Detail</button></div></div>' +
        '<button class="btn ghost small" data-wremove="' + w.id + '">Hapus</button></div>').join('')
        : '<div class="empty-box"><div class="big">🤍</div><p>Wishlist masih kosong.<br>Tekan "Simpan" pada sepatu yang kamu suka.</p></div>';
    }
    L.el.addEventListener('click', async (e) => {
      const rm = e.target.closest('[data-wremove]');
      const dt = e.target.closest('[data-wdetail]');
      if (rm) { delete state.wish[rm.dataset.wremove]; saveWish(); updateBadges(); renderGrid(); draw(); }
      if (dt) {
        const r = await api('/products/' + dt.dataset.wdetail);
        if (r.ok) openDetail(r.data.data); else toast('Produk tidak ditemukan', 'err');
      }
    });
    draw();
  }

  /* ---------- detail produk ---------- */
  function openDetail(p) {
    let size = null, added = false;
    const L = AK.layer('<button class="x" data-close aria-label="Tutup">✕</button><div data-d></div>');
    const box = L.$('[data-d]');

    function draw() {
      const out = p.stock < 1, wished = !!state.wish[p.id];
      box.innerHTML =
        '<div class="cover" style="background:' + grad(p) + '"><span class="emoji">👟</span>' + imgTag(p) + (out ? '<span class="ribbon">Habis</span>' : '') + '</div>' +
        '<div class="modal-body">' +
          '<span class="tag" style="justify-self:start">' + esc(p.category && p.category.name) + '</span>' +
          '<h2>' + esc(p.name) + '</h2>' +
          '<p class="author">' + esc(p.brand) + ' · ⭐ ' + p.rating + '</p>' +
          '<b class="price" style="font-size:1.3rem">' + rupiah(p.price) + '</b>' +
          '<p class="muted" style="margin:0">' + esc(p.description || '') + '</p>' +
          '<b>Pilih ukuran</b>' +
          '<div class="sizes">' + p.sizes.map((s) =>
            '<button class="size ' + (s === size ? 'active' : '') + '" data-size="' + s + '"' + (out ? ' disabled' : '') + '>' + s + '</button>').join('') + '</div>' +
          '<p class="hint">' + (out ? 'Stok habis, simpan ke wishlist untuk dipantau.'
            : size ? 'Ukuran ' + size + ' dipilih. Stok tersisa ' + p.stock + ' pasang.'
            : 'Pilih ukuran untuk menambah ke keranjang.') + '</p>' +
          '<button class="btn primary block" data-add' + (out || !size ? ' disabled' : '') + '>' + (added ? '✓ Ditambahkan ke keranjang' : '🛒 Tambah ke keranjang') + '</button>' +
          (added ? '<p class="ok-msg">Berhasil! Buka keranjang untuk checkout.</p>' : '') +
          '<button class="btn block ' + (wished ? 'liked' : 'outline') + '" data-wish-d>' + (wished ? '❤️ Hapus dari wishlist' : '🤍 Tambah ke wishlist') + '</button>' +
        '</div>';
    }

    async function add() {
      if (!AK.token()) {
        AK.openAuth({ message: 'Masuk dulu untuk menambahkan sepatu ke keranjang.', onSuccess: () => { afterLogin(); add(); } });
        return;
      }
      const r = await api('/cart', { method: 'POST', body: { product_id: p.id, size } });
      if (r.ok) { state.cart = r.data; updateBadges(); added = true; draw(); toast('Ditambahkan ke keranjang'); }
      else toast(AK.errMsg(r), 'err');
    }

    L.el.addEventListener('click', (e) => {
      const s = e.target.closest('[data-size]');
      if (s) { size = parseInt(s.dataset.size, 10); added = false; draw(); return; }
      if (e.target.closest('[data-add]')) { add(); return; }
      if (e.target.closest('[data-wish-d]')) { toggleWish(p); draw(); }
    });
    draw();
  }

  /* ---------- keranjang (wajib login) ---------- */
  function cartRow(i) {
    return '<div class="row-item"><div class="thumb" style="background:' + grad(i) + '"><span>👟</span>' + imgTag(i) + '</div>' +
      '<div><b>' + esc(i.name) + '</b><small>Ukuran ' + i.size + ' · ' + rupiah(i.price) + '</small>' +
      '<div class="qty"><button data-minus="' + i.id + '"' + (i.qty <= 1 ? ' disabled' : '') + ' aria-label="Kurangi">−</button><span>' + i.qty +
      '</span><button data-plus="' + i.id + '"' + (i.qty >= i.stock ? ' disabled' : '') + ' aria-label="Tambah">+</button></div></div>' +
      '<button class="btn ghost small" data-remove="' + i.id + '">Hapus</button></div>';
  }

  async function openCart() {
    if (!AK.token()) {
      AK.openAuth({ message: 'Masuk dulu untuk membuka keranjangmu.', onSuccess: () => { afterLogin(); openCart(); } });
      return;
    }
    const L = AK.layer('<div class="panel-head"><h2>🛒 Keranjang</h2><button class="x" data-close aria-label="Tutup">✕</button></div><div class="panel-body"></div><div class="panel-foot"></div>', { panel: true });
    const body = L.$('.panel-body'), foot = L.$('.panel-foot');

    function draw() {
      const c = state.cart || EMPTY_CART;
      L.$('h2').textContent = '🛒 Keranjang (' + c.items.length + ')';
      if (!c.items.length) {
        body.innerHTML = '<div class="empty-box"><div class="big">🛒</div><p>Keranjang masih kosong.<br>Pilih sepatu dan ukuran, lalu tambahkan ke keranjang.</p></div>';
        foot.innerHTML = '';
        return;
      }
      body.innerHTML = c.items.map(cartRow).join('');
      foot.innerHTML =
        '<div class="sum"><span>Subtotal</span><span>' + rupiah(c.subtotal) + '</span></div>' +
        '<div class="sum"><span>Ongkir</span><span>' + (c.shipping ? rupiah(c.shipping) : 'Gratis') + '</span></div>' +
        '<div class="sum total"><span>Total</span><span>' + rupiah(c.total) + '</span></div>' +
        '<button class="btn primary block" data-checkout>Checkout</button>' +
        '<button class="btn ghost block" data-clear>Kosongkan keranjang</button>';
    }
    async function act(promise) {
      const r = await promise;
      if (r.ok) { state.cart = r.data; updateBadges(); draw(); } else toast(AK.errMsg(r), 'err');
    }

    L.el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-minus],[data-plus],[data-remove],[data-checkout],[data-clear]');
      if (!t || !state.cart) return;
      const find = (id) => state.cart.items.find((x) => String(x.id) === String(id));
      if (t.dataset.minus) { const it = find(t.dataset.minus); act(api('/cart/' + it.id, { method: 'PATCH', body: { qty: it.qty - 1 } })); }
      else if (t.dataset.plus) { const it = find(t.dataset.plus); act(api('/cart/' + it.id, { method: 'PATCH', body: { qty: it.qty + 1 } })); }
      else if (t.dataset.remove) act(api('/cart/' + t.dataset.remove, { method: 'DELETE' }));
      else if ('clear' in t.dataset) act(api('/cart', { method: 'DELETE' }));
      else if ('checkout' in t.dataset) { L.close(); openCheckout(); }
    });

    body.innerHTML = '<div class="empty-box">Memuat...</div>';
    const r = await api('/cart');
    if (r.ok) { state.cart = r.data; updateBadges(); draw(); }
    else if (r.status === 401) { L.close(); openCart(); }
    else body.innerHTML = '<div class="empty-box">' + esc(AK.errMsg(r)) + '</div>';
  }

  /* ---------- checkout ---------- */
  function openCheckout() {
    const c = state.cart;
    if (!c || !c.items.length) return;
    const u = AK.user() || {};
    const L = AK.layer(
      '<button class="x" data-close aria-label="Tutup">✕</button><div class="modal-body"><h2>Checkout</h2>' +
      '<form class="stack" novalidate>' +
        '<label>Nama penerima<input name="recipient_name" value="' + esc(u.name || '') + '"><span class="err" data-err="recipient_name"></span></label>' +
        '<label>No. telepon<input name="phone" type="tel"><span class="err" data-err="phone"></span></label>' +
        '<label>Alamat lengkap<textarea name="address" rows="3"></textarea><span class="err" data-err="address"></span></label>' +
        '<label>Metode pembayaran<select name="payment_method">' +
          '<option value="transfer">Transfer Bank</option><option value="qris">QRIS</option><option value="cod">Bayar di Tempat (COD)</option>' +
        '</select><span class="err" data-err="payment_method"></span></label>' +
        '<div class="sum"><span>Subtotal</span><span>' + rupiah(c.subtotal) + '</span></div>' +
        '<div class="sum"><span>Ongkir</span><span>' + (c.shipping ? rupiah(c.shipping) : 'Gratis') + '</span></div>' +
        '<div class="sum total"><span>Total bayar</span><span>' + rupiah(c.total) + '</span></div>' +
        '<button class="btn primary block" type="submit">Buat pesanan</button>' +
      '</form></div>');
    const form = L.$('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      const r = await api('/checkout', { method: 'POST', body: Object.fromEntries(new FormData(form)) });
      btn.disabled = false;
      if (!r.ok) {
        if (r.status === 422 && !r.data.errors) { toast(AK.errMsg(r), 'err'); fetchCart(); }
        else AK.showErrors(form, r);
        return;
      }
      L.close();
      state.cart = EMPTY_CART; updateBadges();
      showSuccess(r.data.order);
      loadProducts(); // stok berubah
    });
  }

  function showSuccess(o) {
    const info = { transfer: 'Silakan transfer ke rekening toko dan konfirmasikan ke admin.', qris: 'Silakan lakukan pembayaran QRIS sesuai total.', cod: 'Siapkan uang pas saat pesanan tiba.' }[o.payment_method] || '';
    const L = AK.layer(
      '<button class="x" data-close aria-label="Tutup">✕</button><div class="modal-body" style="text-align:center">' +
      '<div style="font-size:2.6rem">🎉</div><h2>Pesanan berhasil dibuat!</h2>' +
      '<p style="margin:0">Kode pesanan <b>' + esc(o.code) + '</b></p>' +
      '<p class="muted" style="margin:0">Total ' + rupiah(o.total) + ' · ' + esc(AK.PAY[o.payment_method] || o.payment_method) + '</p>' +
      '<p class="hint">' + esc(info) + '</p>' +
      '<button class="btn primary block" data-orders>Lihat pesanan saya</button>' +
      '<button class="btn ghost block" data-close>Lanjut belanja</button></div>');
    L.el.addEventListener('click', (e) => { if (e.target.closest('[data-orders]')) { L.close(); openOrders(); } });
  }

  /* ---------- pesanan saya ---------- */
  async function openOrders() {
    const L = AK.layer('<button class="x" data-close aria-label="Tutup">✕</button><div class="modal-body"><h2>Pesanan saya</h2><div data-list>Memuat...</div></div>', { wide: true });
    const r = await api('/orders');
    const list = L.$('[data-list]');
    if (!r.ok) { list.textContent = AK.errMsg(r); return; }
    const orders = r.data.data || [];
    list.innerHTML = orders.length ? '<div style="display:grid;gap:10px">' + orders.map((o) =>
      '<div class="order"><div class="order-head"><b>' + esc(o.code) + '</b><span class="pill s-' + esc(o.status) + '">' + esc(AK.STATUS[o.status] || o.status) + '</span></div>' +
      '<small class="muted">' + esc(AK.date(o.created_at)) + ' · ' + esc(AK.PAY[o.payment_method] || o.payment_method) + '</small>' +
      '<div style="font-size:.88rem">' + o.items.map((i) => esc(i.name) + ' (ukuran ' + i.size + ') × ' + i.qty).join('<br>') + '</div>' +
      '<div class="sum total"><span>Total</span><span>' + rupiah(o.total) + '</span></div></div>').join('') + '</div>'
      : '<div class="empty-box"><div class="big">📦</div><p>Belum ada pesanan.</p></div>';
  }

  /* ---------- akun ---------- */
  function openAccount() {
    const u = AK.user();
    if (!u || !AK.token()) { AK.openAuth({ onSuccess: afterLogin }); return; }
    const L = AK.layer(
      '<button class="x" data-close aria-label="Tutup">✕</button><div class="modal-body"><h2>Akun saya</h2>' +
      '<div><b>' + esc(u.name) + '</b><br><span class="muted">' + esc(u.email) + '</span><br>' +
      '<span class="pill" style="margin-top:6px">' + (u.role === 'admin' ? 'Admin' : 'Pelanggan') + '</span></div>' +
      '<button class="btn block" data-orders>📦 Pesanan saya</button>' +
      (u.role === 'admin' ? '<a class="btn primary block" href="/admin">⚙️ Dashboard Admin</a>' : '') +
      '<button class="btn block danger" data-logout>Keluar</button></div>');
    L.el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-orders]')) { L.close(); openOrders(); }
      if (e.target.closest('[data-logout]')) {
        await api('/logout', { method: 'POST' });
        AK.clearSession(); state.cart = null; updateBadges(); updateAcct(); L.close();
        toast('Berhasil keluar');
      }
    });
  }

  /* ---------- event ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-detail],[data-wish],[data-cat],[data-page]');
    if (!t) return;
    if (t.dataset.detail) {
      const p = state.items.find((x) => String(x.id) === t.dataset.detail);
      if (p) openDetail(p);
    } else if (t.dataset.wish) {
      const p = state.items.find((x) => String(x.id) === t.dataset.wish);
      if (p) toggleWish(p);
    } else if (t.dataset.cat !== undefined && t.classList.contains('chip')) {
      state.cat = t.dataset.cat; state.page = 1;
      document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === t));
      loadProducts();
    } else if (t.dataset.page) {
      const pg = parseInt(t.dataset.page, 10);
      if (pg >= 1) { state.page = pg; loadProducts(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    }
  });

  let deb;
  $('#fQ').addEventListener('input', (e) => {
    clearTimeout(deb);
    deb = setTimeout(() => { state.q = e.target.value.trim(); state.page = 1; loadProducts(); }, 350);
  });
  $('#fPrice').addEventListener('change', (e) => { state.price = parseInt(e.target.value, 10); state.page = 1; loadProducts(); });
  $('#fStock').addEventListener('change', (e) => { state.stock = e.target.checked; state.page = 1; loadProducts(); });
  $('#btnWish').addEventListener('click', openWish);
  $('#btnCart').addEventListener('click', openCart);
  $('#btnAccount').addEventListener('click', openAccount);

  document.addEventListener('ak:session-expired', () => {
    state.cart = null; updateBadges(); updateAcct();
    toast('Sesi berakhir, silakan masuk lagi', 'err');
  });

  /* ---------- mulai ---------- */
  AK.initTheme();
  updateBadges();
  updateAcct();
  loadCategories();
  loadProducts();
  if (AK.token()) {
    api('/profile').then((r) => {
      if (r.ok) { AK.setSession(AK.token(), r.data); updateAcct(); fetchCart(); }
    });
  }
})();
