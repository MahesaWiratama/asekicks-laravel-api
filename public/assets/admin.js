/* Dashboard admin Asekicks: ringkasan, kelola produk (CRUD + gambar), kelola pesanan. */
(function () {
  'use strict';
  const { esc, rupiah, api, toast } = AK;
  const app = document.getElementById('app');
  const $ = (s, r) => (r || document).querySelector(s);
  const state = { tab: 'overview', q: '', page: 1, categories: [], items: [], orders: [] };

  const grad = (p) => {
    const c = (p && p.colors) || [];
    return 'linear-gradient(135deg,' + esc(c[0] || '#6366f1') + ',' + esc(c[1] || '#ec4899') + ')';
  };
  const thumb = (p) => '<div class="thumb" style="background:' + grad(p) + '"><span>👟</span>' +
    (p.img_url ? '<img src="' + esc(p.img_url) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</div>';

  /* ---------- gerbang login admin ---------- */
  function gate(msg) {
    app.innerHTML =
      '<div class="container"><div class="gate"><div style="font-size:2.4rem">🔐</div><h1>Dashboard Admin</h1>' +
      '<p class="muted">' + esc(msg) + '</p>' +
      '<button class="btn primary" id="gLogin">Masuk sebagai admin</button>' +
      '<a class="btn ghost" href="/">← Kembali ke toko</a></div></div>';
    $('#gLogin').onclick = () => AK.openAuth({ adminOnly: true, onSuccess: start });
  }

  async function start() {
    if (!AK.token()) return gate('Silakan masuk dengan akun admin untuk mengelola toko.');
    const r = await api('/profile');
    if (!r.ok) return gate('Sesi tidak valid, silakan masuk lagi.');
    AK.setSession(AK.token(), r.data);
    if (!AK.isAdmin()) return gate('Akun ini bukan admin. Halaman ini khusus admin.');
    const c = await api('/categories');
    state.categories = c.ok && Array.isArray(c.data) ? c.data : [];
    shell();
    show(state.tab);
  }

  function shell() {
    app.innerHTML =
      '<nav class="navbar"><div class="container">' +
        '<a class="brand" href="/admin">Asekicks<small>Admin</small></a>' +
        '<div class="nav-actions">' +
          '<button class="btn ghost" data-theme-btn aria-label="Ganti tema">🌙</button>' +
          '<a class="btn ghost" href="/">🛍️ <span class="lbl">Lihat toko</span></a>' +
          '<button class="btn ghost" id="aLogout">Keluar</button>' +
        '</div></div></nav>' +
      '<main class="container admin-main">' +
        '<div class="tabs">' +
          '<button data-tab="overview">📊 Ringkasan</button>' +
          '<button data-tab="products">👟 Produk</button>' +
          '<button data-tab="orders">📦 Pesanan</button>' +
        '</div><div id="view"></div></main>';
    AK.syncTheme();
  }

  function show(tab) {
    state.tab = tab;
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'overview') overview();
    else if (tab === 'products') products();
    else orders();
  }

  const view = () => $('#view');
  const failBox = (r) => '<div class="section-card">' + esc(AK.errMsg(r)) + '</div>';

  /* ---------- ringkasan ---------- */
  function stat(label, value, cls) {
    return '<div class="stat ' + (cls || '') + '"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
  }

  async function overview() {
    view().innerHTML = '<p class="muted">Memuat...</p>';
    const r = await api('/admin/stats');
    if (!r.ok) { view().innerHTML = failBox(r); return; }
    const s = r.data;
    view().innerHTML =
      '<div class="stats">' +
        stat('Total produk', s.products) + stat('Pelanggan', s.customers) + stat('Pesanan', s.orders) +
        stat('Pendapatan', rupiah(s.revenue)) + stat('Stok menipis (≤ 5)', s.low_stock, 'warn') +
      '</div>' +
      '<div class="section-card"><h3>Pesanan terbaru</h3>' + ordersTable(s.recent_orders, false) + '</div>';
    state.orders = s.recent_orders;
  }

  /* ---------- produk ---------- */
  async function products() {
    view().innerHTML =
      '<div class="toolbar"><input type="search" id="pq" placeholder="Cari nama atau brand..." value="' + esc(state.q) + '">' +
      '<button class="btn primary" id="pAdd">+ Tambah Produk</button></div>' +
      '<div class="section-card"><div class="table-wrap" id="pTable">Memuat...</div></div>' +
      '<nav class="pager" id="pPager" style="padding:16px 0 0"></nav>';
    await loadProducts();
  }

  async function loadProducts() {
    const q = new URLSearchParams({ page: state.page, per_page: 10 });
    if (state.q) q.set('search', state.q);
    const r = await api('/products?' + q.toString());
    const box = $('#pTable');
    if (!box) return;
    if (!r.ok) { box.textContent = AK.errMsg(r); return; }
    state.items = r.data.data || [];
    box.innerHTML = state.items.length
      ? '<table><thead><tr><th></th><th>Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Ukuran</th><th>Aksi</th></tr></thead><tbody>' +
        state.items.map((p) =>
          '<tr><td>' + thumb(p) + '</td>' +
          '<td class="cell-name"><b>' + esc(p.name) + '</b><small>' + esc(p.brand) + ' · ⭐ ' + p.rating + '</small></td>' +
          '<td>' + esc(p.category && p.category.name) + '</td>' +
          '<td>' + rupiah(p.price) + '</td>' +
          '<td' + (p.stock <= 5 ? ' style="color:var(--danger);font-weight:700"' : '') + '>' + p.stock + '</td>' +
          '<td>' + p.size_min + '–' + p.size_max + '</td>' +
          '<td><div class="actions"><button class="btn small" data-edit="' + p.id + '">Ubah</button>' +
          '<button class="btn small danger" data-del="' + p.id + '">Hapus</button></div></td></tr>').join('') +
        '</tbody></table>'
      : '<p class="muted" style="text-align:center;padding:24px">Tidak ada produk.</p>';
    $('#pPager').innerHTML = AK.pagerHtml(r.data.meta);
  }

  function productForm(p) {
    const cats = state.categories.map((c) => '<option value="' + c.category_id + '">' + esc(c.category) + '</option>').join('');
    const L = AK.layer(
      '<button class="x" data-close aria-label="Tutup">✕</button><div class="modal-body">' +
      '<h2>' + (p ? 'Ubah Produk' : 'Tambah Produk') + '</h2>' +
      '<form class="stack" novalidate>' +
        '<label>Nama produk<input name="name" maxlength="150"><span class="err" data-err="name"></span></label>' +
        '<div class="two">' +
          '<label>Brand<input name="brand" maxlength="80"><span class="err" data-err="brand"></span></label>' +
          '<label>Kategori<select name="category_id">' + cats + '</select><span class="err" data-err="category_id"></span></label>' +
        '</div>' +
        '<div class="two">' +
          '<label>Harga (Rp)<input name="price" type="number" min="0" step="any"><span class="err" data-err="price"></span></label>' +
          '<label>Stok<input name="stock" type="number" min="0" step="1"><span class="err" data-err="stock"></span></label>' +
        '</div>' +
        '<div class="two">' +
          '<label>Ukuran terkecil<input name="size_min" type="number" min="20" max="60"><span class="err" data-err="size_min"></span></label>' +
          '<label>Ukuran terbesar<input name="size_max" type="number" min="20" max="60"><span class="err" data-err="size_max"></span></label>' +
        '</div>' +
        '<div class="two">' +
          '<label>Warna 1<input name="color1" type="color"><span class="err" data-err="color1"></span></label>' +
          '<label>Warna 2<input name="color2" type="color"><span class="err" data-err="color2"></span></label>' +
        '</div>' +
        '<div class="two">' +
          '<label>Rating (0–5)<input name="rating" type="number" min="0" max="5" step="0.1"><span class="err" data-err="rating"></span></label>' +
          '<label>Gambar<input name="img" type="file" accept="image/png,image/jpeg,image/webp"><span class="err" data-err="img"></span></label>' +
        '</div>' +
        '<p class="hint">' + (p ? 'Kosongkan gambar jika tidak ingin menggantinya.' : 'Gambar jpg/png/webp, maks 2 MB. Tanpa gambar, kartu memakai gradasi warna.') + '</p>' +
        '<label>Deskripsi<textarea name="description" rows="3"></textarea><span class="err" data-err="description"></span></label>' +
        '<div class="two"><button type="button" class="btn" data-close>Batal</button><button class="btn primary" type="submit">Simpan</button></div>' +
      '</form></div>', { wide: true });

    const f = L.$('form');
    const v = p || { name: '', brand: '', category_id: '', price: '', stock: '', size_min: 38, size_max: 43, colors: ['#6366f1', '#ec4899'], rating: 4.5, description: '' };
    f.elements.name.value = v.name;
    f.elements.brand.value = v.brand || '';
    f.elements.category_id.value = p ? (p.category && p.category.id) : (state.categories[0] ? state.categories[0].category_id : '');
    f.elements.price.value = v.price;
    f.elements.stock.value = v.stock;
    f.elements.size_min.value = v.size_min;
    f.elements.size_max.value = v.size_max;
    f.elements.color1.value = (v.colors && v.colors[0]) || '#6366f1';
    f.elements.color2.value = (v.colors && v.colors[1]) || '#ec4899';
    f.elements.rating.value = v.rating;
    f.elements.description.value = v.description || '';

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const file = fd.get('img');
      if (!file || !file.size) fd.delete('img');
      if (p) fd.append('_method', 'PUT');
      const btn = f.querySelector('[type=submit]');
      btn.disabled = true;
      const r = await api(p ? '/products/' + p.id : '/products', { method: 'POST', body: fd });
      btn.disabled = false;
      if (r.ok) {
        L.close();
        toast(p ? 'Produk diperbarui' : 'Produk ditambahkan');
        loadProducts();
      } else if (r.status === 403) {
        toast('Akses ditolak: khusus admin', 'err');
      } else {
        AK.showErrors(f, r);
      }
    });
  }

  async function removeProduct(id) {
    const p = state.items.find((x) => String(x.id) === String(id));
    if (!confirm('Hapus produk "' + (p ? p.name : id) + '"?')) return;
    const r = await api('/products/' + id, { method: 'DELETE' });
    if (r.ok) { toast('Produk dihapus'); loadProducts(); } else toast(AK.errMsg(r), 'err');
  }

  /* ---------- pesanan ---------- */
  function ordersTable(list, editable) {
    if (!list || !list.length) return '<p class="muted" style="text-align:center;padding:24px">Belum ada pesanan.</p>';
    return '<div class="table-wrap"><table><thead><tr><th>Kode</th><th>Pelanggan</th><th>Total</th><th>Tanggal</th><th>Status</th><th></th></tr></thead><tbody>' +
      list.map((o) =>
        '<tr><td><b>' + esc(o.code) + '</b></td>' +
        '<td class="cell-name"><b>' + esc(o.customer ? o.customer.name : '-') + '</b><small>' + esc(o.customer ? o.customer.email : '') + '</small></td>' +
        '<td>' + rupiah(o.total) + '</td>' +
        '<td>' + esc(AK.date(o.created_at)) + '</td>' +
        '<td>' + (editable
          ? '<select data-status="' + o.id + '"' + (o.status === 'cancelled' ? ' disabled' : '') + '>' +
            Object.keys(AK.STATUS).map((k) => '<option value="' + k + '"' + (k === o.status ? ' selected' : '') + '>' + AK.STATUS[k] + '</option>').join('') + '</select>'
          : '<span class="pill s-' + esc(o.status) + '">' + esc(AK.STATUS[o.status] || o.status) + '</span>') + '</td>' +
        '<td><button class="btn small" data-order="' + o.id + '">Detail</button></td></tr>').join('') +
      '</tbody></table></div>';
  }

  async function orders() {
    view().innerHTML = '<div class="section-card"><h3>Semua pesanan</h3><div id="oBox">Memuat...</div></div>';
    const r = await api('/admin/orders');
    if (!r.ok) { $('#oBox').textContent = AK.errMsg(r); return; }
    state.orders = r.data.data || [];
    $('#oBox').innerHTML = ordersTable(state.orders, true);
  }

  function orderDetail(id) {
    const o = state.orders.find((x) => String(x.id) === String(id));
    if (!o) return;
    AK.layer(
      '<button class="x" data-close aria-label="Tutup">✕</button><div class="modal-body">' +
      '<h2>' + esc(o.code) + ' <span class="pill s-' + esc(o.status) + '">' + esc(AK.STATUS[o.status] || o.status) + '</span></h2>' +
      '<div style="font-size:.9rem"><b>' + esc(o.recipient_name) + '</b> · ' + esc(o.phone) + '<br>' + esc(o.address) +
      '<br><span class="muted">' + esc(AK.PAY[o.payment_method] || o.payment_method) + ' · ' + esc(AK.date(o.created_at)) + '</span></div>' +
      '<div>' + o.items.map((i) => '<div class="sum"><span>' + esc(i.name) + ' (ukuran ' + i.size + ') × ' + i.qty + '</span><span>' + rupiah(i.price * i.qty) + '</span></div>').join('') + '</div>' +
      '<div class="sum"><span>Ongkir</span><span>' + (o.shipping ? rupiah(o.shipping) : 'Gratis') + '</span></div>' +
      '<div class="sum total"><span>Total</span><span>' + rupiah(o.total) + '</span></div></div>', { wide: true });
  }

  /* ---------- event ---------- */
  app.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-tab],[data-edit],[data-del],[data-order],[data-page],#pAdd,#aLogout');
    if (!t) return;
    if (t.dataset.tab) show(t.dataset.tab);
    else if (t.id === 'pAdd') productForm(null);
    else if (t.dataset.edit) productForm(state.items.find((x) => String(x.id) === t.dataset.edit));
    else if (t.dataset.del) removeProduct(t.dataset.del);
    else if (t.dataset.order) orderDetail(t.dataset.order);
    else if (t.dataset.page) {
      const pg = parseInt(t.dataset.page, 10);
      if (pg >= 1) { state.page = pg; loadProducts(); }
    } else if (t.id === 'aLogout') {
      await api('/logout', { method: 'POST' });
      AK.clearSession();
      gate('Kamu sudah keluar.');
    }
  });

  app.addEventListener('change', async (e) => {
    const s = e.target.closest('[data-status]');
    if (!s) return;
    const r = await api('/admin/orders/' + s.dataset.status, { method: 'PATCH', body: { status: s.value } });
    if (r.ok) toast('Status pesanan diperbarui'); else toast(AK.errMsg(r), 'err');
    orders();
  });

  let deb;
  app.addEventListener('input', (e) => {
    if (e.target.id !== 'pq') return;
    clearTimeout(deb);
    deb = setTimeout(() => { state.q = e.target.value.trim(); state.page = 1; loadProducts(); }, 350);
  });

  document.addEventListener('ak:session-expired', () => gate('Sesi berakhir, silakan masuk lagi.'));

  AK.initTheme();
  start();
})();
