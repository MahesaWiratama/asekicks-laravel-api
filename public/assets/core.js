/* Fungsi bersama untuk toko dan dashboard admin: API, sesi login, tema, modal, toast. */
(function () {
  'use strict';
  const AK = (window.AK = {});

  /* ---------- penyimpanan lokal (aman bila diblokir browser) ---------- */
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  AK.ls = ls;

  /* ---------- format ---------- */
  AK.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  AK.rupiah = (n) => 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(n) || 0);
  AK.date = (s) => {
    try { return new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch (e) { return s || ''; }
  };
  AK.STATUS = { pending: 'Menunggu', paid: 'Dibayar', shipped: 'Dikirim', done: 'Selesai', cancelled: 'Dibatalkan' };
  AK.PAY = { transfer: 'Transfer Bank', qris: 'QRIS', cod: 'Bayar di Tempat (COD)' };

  /* ---------- sesi login ---------- */
  let token = ls.get('ak_token');
  let user = null;
  try { user = JSON.parse(ls.get('ak_user') || 'null'); } catch (e) { user = null; }

  AK.token = () => token;
  AK.user = () => user;
  AK.isAdmin = () => !!user && user.role === 'admin';
  AK.setSession = (t, u) => { token = t; user = u; ls.set('ak_token', t); ls.set('ak_user', JSON.stringify(u)); };
  AK.clearSession = () => { token = null; user = null; ls.del('ak_token'); ls.del('ak_user'); };

  /* ---------- panggilan API ---------- */
  AK.api = async function (path, opts) {
    opts = opts || {};
    const headers = { Accept: 'application/json' };
    let body = opts.body || null;
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch('/api' + path, { method: opts.method || 'GET', headers, body });
    } catch (e) {
      return { ok: false, status: 0, data: { message: 'Tidak bisa terhubung ke server. Pastikan php artisan serve menyala.' } };
    }
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && token) {
      AK.clearSession();
      document.dispatchEvent(new CustomEvent('ak:session-expired'));
    }
    return { ok: res.ok, status: res.status, data };
  };

  // Pesan error pertama dari respons API
  AK.errMsg = (r) => {
    const d = r && r.data ? r.data : {};
    if (d.errors) {
      const k = Object.keys(d.errors)[0];
      const v = d.errors[k];
      return Array.isArray(v) ? v[0] : v;
    }
    return d.message || 'Terjadi kesalahan.';
  };

  /* ---------- toast ---------- */
  let toastTimer;
  AK.toast = (msg, type) => {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'toast show ' + (type || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
  };

  /* ---------- tema terang/gelap ---------- */
  function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelectorAll('[data-theme-btn]').forEach((b) => { b.textContent = dark ? '☀️' : '🌙'; });
  }
  // dipanggil setelah menambah tombol tema baru ke halaman (mis. setelah login admin)
  AK.syncTheme = () => applyTheme(document.documentElement.classList.contains('dark'));
  AK.initTheme = () => {
    const saved = ls.get('ak_theme');
    const dark = saved ? saved === 'dark'
      : !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(dark);
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-theme-btn]')) {
        const next = !document.documentElement.classList.contains('dark');
        ls.set('ak_theme', next ? 'dark' : 'light');
        applyTheme(next);
      }
    });
  };

  /* ---------- modal / drawer ---------- */
  AK.layer = function (html, opts) {
    opts = opts || {};
    const o = document.createElement('div');
    o.className = 'overlay' + (opts.panel ? ' overlay-right' : '');
    o.innerHTML = opts.panel
      ? '<aside class="panel" role="dialog" aria-modal="true">' + html + '</aside>'
      : '<div class="modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    function close() {
      o.remove();
      document.removeEventListener('keydown', onKey);
      if (opts.onClose) opts.onClose();
    }
    o.addEventListener('mousedown', (e) => { if (e.target === o) close(); });
    o.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(o);
    return { el: o, close, $: (s) => o.querySelector(s) };
  };

  // Tampilkan error validasi 422 di bawah tiap kolom form
  AK.showErrors = (form, r) => {
    form.querySelectorAll('[data-err]').forEach((el) => { el.textContent = ''; });
    if (r.status === 422 && r.data && r.data.errors) {
      let shown = false;
      Object.keys(r.data.errors).forEach((k) => {
        const el = form.querySelector('[data-err="' + k + '"]');
        const v = r.data.errors[k];
        if (el) { el.textContent = Array.isArray(v) ? v[0] : v; shown = true; }
      });
      if (!shown) AK.toast(AK.errMsg(r), 'err');
    } else {
      AK.toast(AK.errMsg(r), 'err');
    }
  };

  /* ---------- dialog login / daftar (dipakai toko dan admin) ---------- */
  AK.openAuth = function (opts) {
    opts = opts || {};
    let mode = 'login';
    const E = AK.esc;
    const L = AK.layer(
      '<button class="x" data-close aria-label="Tutup">✕</button>' +
      '<div class="modal-body">' +
        '<h2 data-title>' + (opts.adminOnly ? 'Masuk Admin' : 'Masuk') + '</h2>' +
        (opts.message ? '<p class="hint">' + E(opts.message) + '</p>' : '') +
        (opts.adminOnly ? '' :
          '<div class="seg"><button type="button" class="active" data-mode="login">Masuk</button>' +
          '<button type="button" data-mode="register">Daftar</button></div>') +
        '<form class="stack" novalidate>' +
          '<label data-name hidden>Nama<input name="name" autocomplete="name"><span class="err" data-err="name"></span></label>' +
          '<label>Email<input name="email" type="email" autocomplete="email"><span class="err" data-err="email"></span></label>' +
          '<label>Password<input name="password" type="password" autocomplete="current-password"><span class="err" data-err="password"></span></label>' +
          '<button class="btn primary block" type="submit" data-submit>Masuk</button>' +
        '</form>' +
        '<p class="hint">Demo — Admin: <b>test@example.com</b> · User: <b>user@example.com</b> · password: <b>password</b></p>' +
      '</div>'
    );
    const form = L.$('form');

    L.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      mode = b.dataset.mode;
      L.el.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('active', x === b));
      L.$('[data-name]').hidden = mode !== 'register';
      L.$('[data-title]').textContent = mode === 'login' ? 'Masuk' : 'Daftar Akun';
      L.$('[data-submit]').textContent = mode === 'login' ? 'Masuk' : 'Daftar';
      form.querySelectorAll('[data-err]').forEach((el) => { el.textContent = ''; });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = L.$('[data-submit]');
      const email = form.elements.email.value.trim();
      const password = form.elements.password.value;
      btn.disabled = true;
      let r;
      if (mode === 'register') {
        r = await AK.api('/register', { method: 'POST', body: { name: form.elements.name.value.trim(), email, password } });
        if (!r.ok) { btn.disabled = false; return AK.showErrors(form, r); }
      }
      r = await AK.api('/login', { method: 'POST', body: { email, password } });
      btn.disabled = false;
      if (!r.ok) return AK.showErrors(form, r);

      if (opts.adminOnly && !(r.data.user && r.data.user.role === 'admin')) {
        // token user biasa tidak dipakai untuk dashboard admin
        await AK.api('/logout', { method: 'POST' }).catch(() => {});
        AK.clearSession();
        form.querySelector('[data-err="email"]').textContent = 'Akun ini bukan admin.';
        return;
      }
      AK.setSession(r.data.token, r.data.user);
      L.close();
      AK.toast('Halo, ' + r.data.user.name + '!');
      if (opts.onSuccess) opts.onSuccess(r.data.user);
    });

    setTimeout(() => { const f = form.elements.email; if (f) f.focus(); }, 50);
    return L;
  };

  // pagination ringkas: 1 … 4 5 6 … 9
  AK.pagerHtml = (meta) => {
    if (!meta || meta.last_page <= 1) return '';
    const cur = meta.current_page, last = meta.last_page, pages = [];
    for (let i = 1; i <= last; i++) {
      if (i === 1 || i === last || Math.abs(i - cur) <= 1) pages.push(i);
      else if (pages[pages.length - 1] !== '…') pages.push('…');
    }
    return '<button data-page="' + (cur - 1) + '"' + (cur === 1 ? ' disabled' : '') + '>‹</button>' +
      pages.map((p) => p === '…' ? '<span class="dots">…</span>'
        : '<button data-page="' + p + '" class="' + (p === cur ? 'active' : '') + '">' + p + '</button>').join('') +
      '<button data-page="' + (cur + 1) + '"' + (cur === last ? ' disabled' : '') + '>›</button>';
  };
})();
