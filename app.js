/* Polaris — interna aplikacija (PWA + Supabase) */
const SUPABASE_URL = 'https://tjeizjiupegqvpdbybxl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ilxzzOjhcclPA3xfUv2Bhg_284t--1Z';
const EMAIL_DOMAIN = '@polaris.local';
const PIN_SUFFIX = '#polaris';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'polaris-auth' },
});

let me = null; // { id, username, full_name, role }
const app = document.getElementById('app');

/* ---------- pomoćne funkcije ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isAdmin = () => me && (me.role === 'admin' || me.role === 'super_admin');
const isSuper = () => me && me.role === 'super_admin';
const go = (path) => { location.hash = '#' + path; };
const MONTHS = ['SIJEČANJ', 'VELJAČA', 'OŽUJAK', 'TRAVANJ', 'SVIBANJ', 'LIPANJ', 'SRPANJ', 'KOLOVOZ', 'RUJAN', 'LISTOPAD', 'STUDENI', 'PROSINAC'];
const DAYS = ['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub'];
const DAYS_FULL = ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'];
const parseDate = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
const todayStr = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const fmtDateShort = (d) => { const x = parseDate(d); return `${x.getDate()}.${x.getMonth() + 1}.${x.getFullYear()}.`; };
const fmtTime = (t) => (t ? t.slice(0, 5) + 'h' : '');
const eur = (n) => (n == null || isNaN(n) ? '—' : new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(n));
const num = (n, d = 2) => new Intl.NumberFormat('hr-HR', { maximumFractionDigits: d }).format(n);
const fmtStamp = (ts) => { const x = new Date(ts); return `${x.getDate()}.${x.getMonth() + 1}. u ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };
const val = (f, name) => { const v = f.elements[name]?.value?.trim(); return v === '' || v == null ? null : v; };
const numVal = (f, name) => { const v = val(f, name); return v == null ? null : Number(v.replace(',', '.')); };

const ICON = {
  people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>',
};

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
function errText(e) {
  const m = e?.message || String(e);
  if (/Invalid login credentials/i.test(m)) return 'Pogrešno korisničko ime ili PIN.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Nema veze s internetom.';
  if (/duplicate key/i.test(m)) return 'Taj naziv već postoji.';
  return m;
}
async function q(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

function screen({ title, back, action, body }) {
  app.innerHTML = `
    <header class="top">
      ${back ? `<button class="iconbtn" data-back="${esc(back)}" aria-label="Natrag">‹</button>` : ''}
      <h1>${esc(title)}</h1>
      ${action ? `<button class="iconbtn primary" data-go="${esc(action)}" aria-label="Dodaj">+</button>` : ''}
    </header>
    <main>${body}</main>`;
  window.scrollTo(0, 0);
}
function loading(title, back) { screen({ title, back, body: '<p class="muted center">Učitavam…</p>' }); }

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-back]');
  if (b) { go(b.dataset.back); return; }
  const g = e.target.closest('[data-go]');
  if (g) go(g.dataset.go);
});

/* ---------- prijava ---------- */
function renderLogin() {
  app.innerHTML = `
    <div class="login">
      <div class="brand">POLARIS</div>
      <div class="brand-sub">Interna aplikacija</div>
      <form id="f" autocomplete="on">
        <label>Korisničko ime<input name="u" autocapitalize="none" autocorrect="off" autocomplete="username" required></label>
        <label>PIN<input name="p" class="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="current-password" required></label>
        <div class="err" id="err"></div>
        <button class="btn" type="submit">Prijava</button>
      </form>
    </div>`;
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button'); btn.disabled = true;
    const email = f.u.value.trim().toLowerCase() + EMAIL_DOMAIN;
    const { error } = await sb.auth.signInWithPassword({ email, password: f.p.value.trim() + PIN_SUFFIX });
    if (error) { document.getElementById('err').textContent = errText(error); btn.disabled = false; return; }
    await loadMe();
    if (!me) { document.getElementById('err').textContent = 'Račun nije aktivan.'; await sb.auth.signOut(); btn.disabled = false; return; }
    location.hash = '#/'; route();
  };
}

async function loadMe() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { me = null; return; }
  const { data } = await sb.from('profiles').select('id, username, full_name, role, active').eq('id', session.user.id).maybeSingle();
  me = data && data.active ? data : null;
}

async function logout() { await sb.auth.signOut(); me = null; location.hash = '#/'; renderLogin(); }

/* ---------- glavni izbornik ---------- */
function renderHome() {
  if (!isAdmin()) return renderTodo();
  screen({
    title: 'Polaris',
    body: `
      <p class="muted" style="margin-top:0">Bok, ${esc(me.full_name)}</p>
      <div class="menu">
        <button data-go="/catering">Catering</button>
        <button data-go="/nabavka">Nabavka</button>
        <button data-go="/restoran">Restoran</button>
        <button data-go="/todo">To-do</button>
        <button data-go="/korisnici">Korisnici</button>
      </div>
      <div class="footer-links">
        <button class="link" data-go="/pin">Promijeni PIN</button>
        <button class="link" id="logout">Odjava</button>
      </div>`,
  });
  document.getElementById('logout').onclick = logout;
}

/* ---------- CATERING ---------- */
function eventCard(c, past) {
  const d = parseDate(c.event_date);
  return `
    <button class="card event ${past ? 'past' : ''}" data-go="/catering/${c.id}">
      <div class="date"><div class="d">${d.getDate()}.</div><div class="m">${MONTHS[d.getMonth()]}</div><div class="w">${DAYS[d.getDay()]}</div></div>
      <div class="body">
        ${c.title ? `<div class="title">${esc(c.title)}</div>` : ''}
        <div class="row">
          ${c.people ? `<span>${ICON.people}${c.people}</span>` : ''}
          ${c.event_time ? `<span>${ICON.clock}${fmtTime(c.event_time)}</span>` : ''}
        </div>
        ${c.location ? `<div class="loc">${ICON.pin}<span>${esc(c.location)}</span></div>` : ''}
      </div>
    </button>`;
}

async function renderCateringList() {
  loading('Catering', '/');
  try {
    const rows = await q(sb.from('caterings').select('id, event_date, event_time, people, title, location').order('event_date').order('event_time'));
    const t = todayStr();
    const upcoming = rows.filter((r) => r.event_date >= t);
    const past = rows.filter((r) => r.event_date < t).reverse().slice(0, 20);
    let body = '';
    if (!rows.length) body = '<div class="empty">Još nema cateringa.<br>Dodaj prvi na +</div>';
    else {
      body += '<div class="section-title">Nadolazeći</div>';
      body += upcoming.length ? `<div class="list">${upcoming.map((c) => eventCard(c)).join('')}</div>` : '<div class="empty">Nema nadolazećih cateringa.</div>';
      if (past.length) body += `<div class="section-title">Prošli</div><div class="list">${past.map((c) => eventCard(c, true)).join('')}</div>`;
    }
    screen({ title: 'Catering', back: '/', action: '/catering/new', body });
  } catch (e) { screen({ title: 'Catering', back: '/', body: `<p class="err">${esc(errText(e))}</p>` }); }
}

async function renderCateringDetail(id) {
  loading('Catering', '/catering');
  try {
    const c = await q(sb.from('caterings').select('*').eq('id', id).single());
    const d = parseDate(c.event_date);
    const item = (label, v) => (v ? `<div class="item"><div class="label">${label}</div><div class="value">${esc(v)}</div></div>` : '');
    screen({
      title: c.title || 'Catering', back: '/catering',
      body: `
        <div class="detail">
          <div class="item">
            <div class="bigdate">${d.getDate()}. ${MONTHS[d.getMonth()]}</div>
            <div class="muted">${DAYS_FULL[d.getDay()]}, ${fmtDateShort(c.event_date)}</div>
            <div class="card static" style="border:0;padding:0;margin-top:8px"><div class="row" style="font-size:17px;color:var(--ink)">
              ${c.people ? `<span>${ICON.people}${c.people} osoba</span>` : ''}
              ${c.event_time ? `<span>${ICON.clock}${fmtTime(c.event_time)}</span>` : ''}
            </div></div>
          </div>
          ${item('Lokacija', c.location)}
          ${item('Kontakt', c.contact)}
          ${item('Banjice', c.platters)}
          ${item('Dodatno', c.extras)}
          ${item('Opis i napomene', c.description)}
        </div>
        <div class="actions">
          <button class="btn secondary" data-go="/catering/${c.id}/edit">Uredi</button>
          <button class="btn danger" id="del">Obriši catering</button>
        </div>`,
    });
    document.getElementById('del').onclick = async () => {
      if (!confirm('Obrisati ovaj catering?')) return;
      try { await q(sb.from('caterings').delete().eq('id', id)); toast('Obrisano'); go('/catering'); } catch (e) { toast(errText(e)); }
    };
  } catch (e) { screen({ title: 'Catering', back: '/catering', body: `<p class="err">${esc(errText(e))}</p>` }); }
}

async function renderCateringForm(id) {
  let c = { event_date: todayStr() };
  if (id) { loading('Uredi catering', `/catering/${id}`); try { c = await q(sb.from('caterings').select('*').eq('id', id).single()); } catch (e) { toast(errText(e)); } }
  const back = id ? `/catering/${id}` : '/catering';
  screen({
    title: id ? 'Uredi catering' : 'Novi catering', back,
    body: `
      <form id="f">
        <label>Naziv / klijent<input name="title" value="${esc(c.title)}" placeholder="npr. Rođendan Horvat, Bowling"></label>
        <div class="grid2">
          <label>Datum<input name="event_date" type="date" value="${esc(c.event_date)}" required></label>
          <label>Vrijeme<input name="event_time" type="time" value="${esc(c.event_time?.slice(0, 5))}"></label>
        </div>
        <label>Broj ljudi<input name="people" type="number" inputmode="numeric" min="0" value="${esc(c.people)}"></label>
        <label>Lokacija<input name="location" value="${esc(c.location)}" placeholder="npr. Sala Luma, J.J. Strossmayera 271"></label>
        <label>Kontakt<input name="contact" value="${esc(c.contact)}" placeholder="ime i broj mobitela"></label>
        <label>Banjice<textarea name="platters" placeholder="npr. 2x svinjski vrat + riža, 1x ćevapi, 1x pohano">${esc(c.platters)}</textarea></label>
        <label>Dodatno<textarea name="extras" placeholder="npr. 20 pizza, lepinje, salata, pribor">${esc(c.extras)}</textarea></label>
        <label>Opis i napomene<textarea name="description" style="min-height:130px">${esc(c.description)}</textarea></label>
        <div class="err" id="err"></div>
        <button class="btn" type="submit">Spremi</button>
      </form>`,
  });
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const row = {
      title: val(f, 'title'), event_date: val(f, 'event_date'), event_time: val(f, 'event_time'),
      people: numVal(f, 'people'), location: val(f, 'location'), contact: val(f, 'contact'),
      platters: val(f, 'platters'), extras: val(f, 'extras'), description: val(f, 'description'),
    };
    try {
      if (id) { await q(sb.from('caterings').update(row).eq('id', id)); go(`/catering/${id}`); }
      else { const r = await q(sb.from('caterings').insert(row).select('id').single()); go(`/catering/${r.id}`); }
      toast('Spremljeno');
    } catch (err) { document.getElementById('err').textContent = errText(err); btn.disabled = false; }
  };
}

/* ---------- NABAVKA ---------- */
async function renderSuppliers() {
  loading('Nabavka', '/');
  try {
    const rows = await q(sb.from('suppliers').select('id, name, items(count)').order('name'));
    screen({
      title: 'Nabavka', back: '/', action: '/dobavljac/new',
      body: `
        <div class="section-title">Dobavljači</div>
        ${rows.length ? `<div class="list">${rows.map((s) => `
          <button class="card" data-go="/nabavka/${s.id}">
            <div class="price-row"><span class="title">${esc(s.name)}</span><span class="muted">${s.items[0]?.count || 0} artikala</span></div>
          </button>`).join('')}</div>` : '<div class="empty">Nema dobavljača. Dodaj na +</div>'}
        <div class="actions"><button class="btn secondary" data-go="/artikli">Svi artikli i cijene</button></div>`,
    });
  } catch (e) { screen({ title: 'Nabavka', back: '/', body: `<p class="err">${esc(errText(e))}</p>` }); }
}

function itemCard(i, showSupplier) {
  const gross = i.price_net != null ? i.price_net * (1 + (i.vat_rate || 0) / 100) : null;
  return `
    <button class="card" data-go="/artikl/${i.id}">
      <div class="price-row"><span class="title">${esc(i.name)}</span><span class="p">${eur(i.price_net)} / ${esc(i.unit)}</span></div>
      <div class="row small"><span>${showSupplier ? esc(i.suppliers?.name) + ' · ' : ''}s PDV-om ${eur(gross)} (${num(i.vat_rate ?? 0, 1)}%)</span><span>ažurirano ${fmtStamp(i.updated_at)}</span></div>
    </button>`;
}

async function renderSupplier(id) {
  loading('Dobavljač', '/nabavka');
  try {
    const s = await q(sb.from('suppliers').select('*, items(*)').eq('id', id).single());
    const items = (s.items || []).sort((a, b) => a.name.localeCompare(b.name, 'hr'));
    screen({
      title: s.name, back: '/nabavka', action: `/artikl/new?s=${s.id}`,
      body: `
        ${s.contact || s.note ? `<div class="detail" style="margin-bottom:14px">
          ${s.contact ? `<div class="item"><div class="label">Kontakt</div><div class="value">${esc(s.contact)}</div></div>` : ''}
          ${s.note ? `<div class="item"><div class="label">Napomena</div><div class="value">${esc(s.note)}</div></div>` : ''}
        </div>` : ''}
        <div class="section-title">Artikli · cijene bez PDV-a</div>
        ${items.length ? `<div class="list">${items.map((i) => itemCard(i)).join('')}</div>` : '<div class="empty">Nema artikala. Dodaj na +</div>'}
        <div class="actions"><button class="btn secondary" data-go="/dobavljac/${s.id}/edit">Uredi dobavljača</button></div>`,
    });
  } catch (e) { screen({ title: 'Dobavljač', back: '/nabavka', body: `<p class="err">${esc(errText(e))}</p>` }); }
}

async function renderAllItems() {
  loading('Svi artikli', '/nabavka');
  try {
    const rows = await q(sb.from('items').select('*, suppliers(name)').order('name'));
    screen({
      title: 'Svi artikli', back: '/nabavka',
      body: `
        <input id="s" placeholder="Traži artikl…" style="margin-bottom:12px">
        <div class="list" id="l"></div>`,
    });
    const l = document.getElementById('l');
    const draw = (t) => {
      const f = rows.filter((r) => r.name.toLowerCase().includes(t.toLowerCase()));
      l.innerHTML = f.length ? f.map((i) => itemCard(i, true)).join('') : '<div class="empty">Nema artikala.</div>';
    };
    document.getElementById('s').oninput = (e) => draw(e.target.value);
    draw('');
  } catch (e) { screen({ title: 'Svi artikli', back: '/nabavka', body: `<p class="err">${esc(errText(e))}</p>` }); }
}

async function renderSupplierForm(id) {
  let s = {};
  if (id) { try { s = await q(sb.from('suppliers').select('*').eq('id', id).single()); } catch (e) { toast(errText(e)); } }
  const back = id ? `/nabavka/${id}` : '/nabavka';
  screen({
    title: id ? 'Uredi dobavljača' : 'Novi dobavljač', back,
    body: `
      <form id="f">
        <label>Naziv<input name="name" value="${esc(s.name)}" required></label>
        <label>Kontakt<input name="contact" value="${esc(s.contact)}" placeholder="osoba, mobitel, e-mail"></label>
        <label>Napomena<textarea name="note">${esc(s.note)}</textarea></label>
        <div class="err" id="err"></div>
        <button class="btn" type="submit">Spremi</button>
        ${id && isSuper() ? '<button class="btn danger" type="button" id="del">Obriši dobavljača i njegove artikle</button>' : ''}
      </form>`,
  });
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const row = { name: val(f, 'name'), contact: val(f, 'contact'), note: val(f, 'note') };
    try {
      if (id) { await q(sb.from('suppliers').update(row).eq('id', id)); go(`/nabavka/${id}`); }
      else { const r = await q(sb.from('suppliers').insert(row).select('id').single()); go(`/nabavka/${r.id}`); }
      toast('Spremljeno');
    } catch (err) { document.getElementById('err').textContent = errText(err); }
  };
  const del = document.getElementById('del');
  if (del) del.onclick = async () => {
    if (!confirm('Obrisati dobavljača i sve njegove artikle?')) return;
    try { await q(sb.from('suppliers').delete().eq('id', id)); toast('Obrisano'); go('/nabavka'); } catch (err) { toast(errText(err)); }
  };
}

const UNITS = ['kg', 'g', 'l', 'ml', 'kom', 'pak'];
const unitOptions = (sel) => UNITS.map((u) => `<option ${u === sel ? 'selected' : ''}>${u}</option>`).join('');

async function renderItemForm(id, supplierId) {
  let i = { unit: 'kg', vat_rate: 25, supplier_id: supplierId };
  let suppliers = [];
  try {
    suppliers = await q(sb.from('suppliers').select('id, name').order('name'));
    if (id) i = await q(sb.from('items').select('*').eq('id', id).single());
  } catch (e) { toast(errText(e)); }
  const back = i.supplier_id ? `/nabavka/${i.supplier_id}` : '/nabavka';
  screen({
    title: id ? 'Uredi artikl' : 'Novi artikl', back,
    body: `
      <form id="f">
        <label>Naziv artikla<input name="name" value="${esc(i.name)}" required placeholder="npr. Svinjski vrat"></label>
        <label>Dobavljač<select name="supplier_id" required>${suppliers.map((s) => `<option value="${s.id}" ${s.id === i.supplier_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <div class="grid2">
          <label>Cijena bez PDV-a (€)<input name="price_net" inputmode="decimal" value="${esc(i.price_net)}" placeholder="0,00"></label>
          <label>Po jedinici<select name="unit">${unitOptions(i.unit)}</select></label>
        </div>
        <label>PDV %<select name="vat_rate">${[25, 13, 5, 0].map((v) => `<option value="${v}" ${Number(i.vat_rate) === v ? 'selected' : ''}>${v}%</option>`).join('')}</select></label>
        ${id ? `<p class="muted small" style="margin:0">Zadnja promjena: ${fmtStamp(i.updated_at)}</p>` : ''}
        <div class="err" id="err"></div>
        <button class="btn" type="submit">Spremi</button>
        ${id ? '<button class="btn danger" type="button" id="del">Obriši artikl</button>' : ''}
      </form>`,
  });
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const row = { name: val(f, 'name'), supplier_id: val(f, 'supplier_id'), price_net: numVal(f, 'price_net'), unit: val(f, 'unit'), vat_rate: numVal(f, 'vat_rate') };
    if (row.price_net != null && isNaN(row.price_net)) { document.getElementById('err').textContent = 'Cijena nije broj.'; return; }
    try {
      if (id) await q(sb.from('items').update(row).eq('id', id));
      else await q(sb.from('items').insert(row));
      toast('Spremljeno'); go(`/nabavka/${row.supplier_id}`);
    } catch (err) { document.getElementById('err').textContent = errText(err); }
  };
  const del = document.getElementById('del');
  if (del) del.onclick = async () => {
    if (!confirm('Obrisati artikl?')) return;
    try { await q(sb.from('items').delete().eq('id', id)); toast('Obrisano'); go(back); } catch (err) { toast(errText(err)); }
  };
}

/* ---------- RESTORAN: jelovnik, normativ, recept ---------- */
const BASE = { kg: ['kg', 1], g: ['kg', 0.001], l: ['l', 1], ml: ['l', 0.001], kom: ['kom', 1], pak: ['pak', 1] };
function lineCost(ing) {
  const it = ing.items;
  if (!it || it.price_net == null) return null;
  const a = BASE[ing.unit], b = BASE[it.unit];
  if (!a || !b || a[0] !== b[0]) return null;
  return ((Number(ing.qty) * a[1]) / b[1]) * Number(it.price_net);
}
function dishCost(d) {
  const ings = d.dish_ingredients || [];
  if (!ings.length) return { cost: null, missing: 0 };
  let cost = 0, missing = 0;
  for (const g of ings) { const c = lineCost(g); if (c == null) missing++; else cost += c; }
  return { cost, missing };
}
function factorBadge(priceGross, vat, cost) {
  if (!priceGross || !cost) return '';
  const net = priceGross / (1 + (Number(vat) || 0) / 100);
  const f = net / cost;
  return `<span class="badge ${f >= 3 ? 'good' : 'bad'}">${num(f, 2)}x</span>`;
}

let restoranTab = 'jelovnik';
async function renderRestoran() {
  loading('Restoran', '/');
  try {
    const rows = await q(sb.from('dishes').select('*, dish_ingredients(qty, unit, items(price_net, unit))').order('category', { nullsFirst: false }).order('name'));
    const delivery = restoranTab === 'dostava';
    const list = delivery ? rows.filter((d) => d.on_delivery) : rows;
    const groups = {};
    list.forEach((d) => { (groups[d.category || 'Ostalo'] ||= []).push(d); });
    const body = `
      <div class="tabs">
        <button data-tab="jelovnik" class="${!delivery ? 'on' : ''}">Jelovnik</button>
        <button data-tab="dostava" class="${delivery ? 'on' : ''}">Jelovnik - Dostava</button>
      </div>
      ${list.length ? Object.entries(groups).map(([cat, ds]) => `
        <div class="section-title">${esc(cat)}</div>
        <div class="list">${ds.map((d) => {
          const { cost, missing } = dishCost(d);
          const price = delivery ? d.delivery_price : d.price;
          return `
          <button class="card" data-go="/jelo/${d.id}">
            <div class="price-row"><span class="title">${esc(d.name)}</span><span class="p">${eur(price)}</span></div>
            <div class="row small">
              <span>Food cost ${cost != null ? eur(cost) : '—'}${missing ? ` (${missing} bez cijene)` : ''}</span>
              ${factorBadge(price, d.vat_rate, cost)}
            </div>
          </button>`;
        }).join('')}</div>`).join('') : `<div class="empty">${delivery ? 'Nijedno jelo nije označeno za dostavu.<br>Otvori jelo i uključi „Na dostavi”.' : 'Jelovnik je prazan. Dodaj jelo na +'}</div>`}
      <p class="muted small">Faktor = prodajna cijena bez PDV-a / nabavna cijena sastojaka. Cilj je iznad 3x.</p>`;
    screen({ title: 'Restoran', back: '/', action: '/jelo/new', body });
    app.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { restoranTab = b.dataset.tab; renderRestoran(); }));
  } catch (e) { screen({ title: 'Restoran', back: '/', body: `<p class="err">${esc(errText(e))}</p>` }); }
}

async function renderDish(id) {
  loading('Jelo', '/restoran');
  try {
    const d = await q(sb.from('dishes').select('*, dish_ingredients(*, items(name, price_net, unit, suppliers(name)))').eq('id', id).single());
    const ings = (d.dish_ingredients || []).sort((a, b) => a.sort - b.sort);
    const { cost, missing } = dishCost(d);
    const priceLine = (label, p) => `<div class="price-row"><span>${label}</span><span class="p">${eur(p)} ${factorBadge(p, d.vat_rate, cost)}</span></div>`;
    screen({
      title: d.name, back: '/restoran',
      body: `
        <div class="detail">
          <div class="item">
            ${priceLine('Cijena u restoranu', d.price)}
            ${d.on_delivery ? priceLine('Cijena na dostavi', d.delivery_price) : ''}
            <div class="muted small" style="margin-top:6px">${esc(d.category || '')} · PDV ${num(d.vat_rate ?? 0, 1)}%</div>
          </div>
          <div class="item">
            <div class="label">Normativ (1 porcija)</div>
            ${ings.length ? ings.map((g) => {
              const c = lineCost(g);
              return `<div class="price-row" style="margin-top:6px"><span>${esc(g.name)} · ${num(g.qty, 3)} ${esc(g.unit)}</span><span class="${c == null ? 'muted' : ''}">${c == null ? 'nema cijene' : eur(c)}</span></div>`;
            }).join('') : '<div class="value muted">Normativ nije upisan.</div>'}
            ${ings.length ? `<div class="price-row" style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px"><strong>Food cost</strong><strong>${eur(cost)}</strong></div>` : ''}
            ${missing ? `<div class="muted small">${missing} sastojaka nije povezano s artiklom iz Nabavke ili mu nedostaje cijena.</div>` : ''}
          </div>
          <div class="item"><div class="label">Recept</div><div class="value">${d.recipe ? esc(d.recipe) : '<span class="muted">Recept nije upisan.</span>'}</div></div>
        </div>
        <div class="actions"><button class="btn secondary" data-go="/jelo/${d.id}/edit">Uredi jelo, normativ i recept</button></div>`,
    });
  } catch (e) { screen({ title: 'Jelo', back: '/restoran', body: `<p class="err">${esc(errText(e))}</p>` }); }
}

async function renderDishForm(id) {
  let d = { vat_rate: 13, dish_ingredients: [] };
  let items = [];
  try {
    items = await q(sb.from('items').select('id, name, unit, suppliers(name)').order('name'));
    if (id) d = await q(sb.from('dishes').select('*, dish_ingredients(*)').eq('id', id).single());
  } catch (e) { toast(errText(e)); }
  const label = (i) => `${i.name} (${i.suppliers?.name || ''})`;
  const byLabel = new Map(items.map((i) => [label(i), i]));
  const byId = new Map(items.map((i) => [i.id, i]));
  const ings = (d.dish_ingredients || []).sort((a, b) => a.sort - b.sort);
  const back = id ? `/jelo/${id}` : '/restoran';
  const ingRow = (g = {}) => {
    const it = g.item_id && byId.get(g.item_id);
    return `<div class="ing">
      <input name="ing_name" list="itemlist" value="${esc(it ? label(it) : g.name)}" placeholder="Sastojak">
      <input name="ing_qty" inputmode="decimal" value="${esc(g.qty != null ? String(g.qty).replace('.', ',') : '')}" placeholder="Količina">
      <select name="ing_unit">${unitOptions(g.unit || 'g')}</select>
      <button type="button" class="x" aria-label="Makni">×</button>
    </div>`;
  };
  screen({
    title: id ? 'Uredi jelo' : 'Novo jelo', back,
    body: `
      <form id="f">
        <label>Naziv jela<input name="name" value="${esc(d.name)}" required></label>
        <label>Kategorija<input name="category" value="${esc(d.category)}" placeholder="npr. Roštilj, Pizze, Salate"></label>
        <div class="grid2">
          <label>Cijena (€, s PDV-om)<input name="price" inputmode="decimal" value="${esc(d.price)}"></label>
          <label>PDV %<select name="vat_rate">${[13, 25, 5, 0].map((v) => `<option value="${v}" ${Number(d.vat_rate) === v ? 'selected' : ''}>${v}%</option>`).join('')}</select></label>
        </div>
        <label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:16px;color:var(--ink)"><input type="checkbox" name="on_delivery" style="width:22px;height:22px" ${d.on_delivery ? 'checked' : ''}> Na dostavi (Wolt i sl.)</label>
        <label id="dp" ${d.on_delivery ? '' : 'hidden'}>Cijena na dostavi (€, s PDV-om)<input name="delivery_price" inputmode="decimal" value="${esc(d.delivery_price)}"></label>
        <div>
          <div class="section-title" style="margin-top:6px">Normativ za 1 porciju</div>
          <p class="muted small" style="margin-top:0">Odaberi artikl iz Nabavke da se izračuna cijena.</p>
          <datalist id="itemlist">${items.map((i) => `<option value="${esc(label(i))}">`).join('')}</datalist>
          <div id="ings" style="display:grid;gap:8px">${ings.map(ingRow).join('')}</div>
          <button type="button" class="btn secondary" id="add" style="margin-top:8px">+ Dodaj sastojak</button>
        </div>
        <label>Recept (priprema)<textarea name="recipe" style="min-height:180px">${esc(d.recipe)}</textarea></label>
        <div class="err" id="err"></div>
        <button class="btn" type="submit">Spremi</button>
        ${id ? '<button class="btn danger" type="button" id="del">Obriši jelo</button>' : ''}
      </form>`,
  });
  const f = document.getElementById('f');
  const box = document.getElementById('ings');
  if (!ings.length) box.insertAdjacentHTML('beforeend', ingRow());
  document.getElementById('add').onclick = () => box.insertAdjacentHTML('beforeend', ingRow());
  box.onclick = (e) => { if (e.target.classList.contains('x')) e.target.closest('.ing').remove(); };
  box.onchange = (e) => {
    if (e.target.name !== 'ing_name') return;
    const it = byLabel.get(e.target.value);
    const unitSel = e.target.closest('.ing').querySelector('[name=ing_unit]');
    if (it && it.unit === 'kg' && unitSel.value !== 'kg') unitSel.value = 'g';
    else if (it && it.unit === 'l' && unitSel.value !== 'l') unitSel.value = 'ml';
    else if (it) unitSel.value = it.unit;
  };
  f.on_delivery.onchange = () => { document.getElementById('dp').hidden = !f.on_delivery.checked; };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById('err');
    const row = {
      name: val(f, 'name'), category: val(f, 'category'), price: numVal(f, 'price'), vat_rate: numVal(f, 'vat_rate'),
      on_delivery: f.on_delivery.checked, delivery_price: numVal(f, 'delivery_price'), recipe: val(f, 'recipe'),
    };
    const lines = [];
    let bad = false;
    box.querySelectorAll('.ing').forEach((el, idx) => {
      const name = el.querySelector('[name=ing_name]').value.trim();
      const qtyS = el.querySelector('[name=ing_qty]').value.trim();
      if (!name && !qtyS) return;
      const qty = Number(qtyS.replace(',', '.'));
      if (!name || !qtyS || isNaN(qty)) { bad = true; return; }
      const it = byLabel.get(name);
      lines.push({ item_id: it?.id || null, name: it ? it.name : name, qty, unit: el.querySelector('[name=ing_unit]').value, sort: idx });
    });
    if (bad) { err.textContent = 'Svaki sastojak treba naziv i količinu (broj).'; return; }
    try {
      let dishId = id;
      if (id) await q(sb.from('dishes').update(row).eq('id', id));
      else dishId = (await q(sb.from('dishes').insert(row).select('id').single())).id;
      await q(sb.from('dish_ingredients').delete().eq('dish_id', dishId));
      if (lines.length) await q(sb.from('dish_ingredients').insert(lines.map((l) => ({ ...l, dish_id: dishId }))));
      toast('Spremljeno'); go(`/jelo/${dishId}`);
    } catch (e2) { err.textContent = errText(e2); }
  };
  const del = document.getElementById('del');
  if (del) del.onclick = async () => {
    if (!confirm('Obrisati jelo?')) return;
    try { await q(sb.from('dishes').delete().eq('id', id)); toast('Obrisano'); go('/restoran'); } catch (e2) { toast(errText(e2)); }
  };
}

/* ---------- TO-DO ---------- */
let todoFilter = '';
async function renderTodo() {
  const admin = isAdmin();
  const title = admin ? 'To-do' : 'Moji zadaci';
  const back = admin ? '/' : null;
  loading(title, back);
  try {
    let people = [];
    let query = sb.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(full_name)').order('due_date', { nullsFirst: false }).order('created_at');
    if (admin) {
      people = await q(sb.from('profiles').select('id, full_name').eq('active', true).order('full_name'));
      if (todoFilter) query = query.eq('assigned_to', todoFilter);
    } else query = query.eq('assigned_to', me.id);
    const rows = await q(query);
    const open = rows.filter((t) => !t.done);
    const done = rows.filter((t) => t.done).sort((a, b) => b.done_at.localeCompare(a.done_at)).slice(0, 30);
    const t0 = todayStr();
    const card = (t) => `
      <div class="card static task ${t.done ? 'done' : ''}">
        <button class="check ${t.done ? 'on' : ''}" data-done="${t.id}" data-v="${t.done ? 0 : 1}" aria-label="Gotovo">${t.done ? '✓' : ''}</button>
        <div style="flex:1;min-width:0">
          <div class="title">${esc(t.title)}</div>
          ${t.description ? `<div class="small muted" style="white-space:pre-wrap;margin-top:2px">${esc(t.description)}</div>` : ''}
          <div class="row small">
            ${admin ? `<span>${esc(t.assignee?.full_name || '')}</span>` : ''}
            ${t.due_date ? `<span class="${!t.done && t.due_date < t0 ? 'overdue' : ''}">rok ${fmtDateShort(t.due_date)}</span>` : ''}
          </div>
          ${t.done ? `<div class="donemsg">${admin ? esc(t.assignee?.full_name || '') + ' označio kao gotovo' : 'Označeno kao gotovo'} · ${fmtStamp(t.done_at)}</div>` : ''}
          ${isSuper() ? `<button class="link small" data-del="${t.id}">Obriši</button>` : ''}
        </div>
      </div>`;
    screen({
      title, back, action: admin ? '/todo/new' : null,
      body: `
        ${admin ? `<select id="pf" style="margin-bottom:14px"><option value="">Svi zaposlenici</option>${people.map((p) => `<option value="${p.id}" ${p.id === todoFilter ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select>` : `<p class="muted" style="margin-top:0">Bok, ${esc(me.full_name)}</p>`}
        <div class="section-title">Za napraviti</div>
        ${open.length ? `<div class="list">${open.map(card).join('')}</div>` : '<div class="empty">Nema otvorenih zadataka.</div>'}
        ${done.length ? `<div class="section-title">Gotovo</div><div class="list">${done.map(card).join('')}</div>` : ''}
        ${admin ? '' : `<div class="footer-links"><button class="link" data-go="/pin">Promijeni PIN</button><button class="link" id="logout">Odjava</button></div>`}`,
    });
    const lo = document.getElementById('logout'); if (lo) lo.onclick = logout;
    const pf = document.getElementById('pf'); if (pf) pf.onchange = () => { todoFilter = pf.value; renderTodo(); };
    app.querySelectorAll('[data-done]').forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      try { await q(sb.rpc('set_task_done', { p_task: b.dataset.done, p_done: b.dataset.v === '1' })); renderTodo(); } catch (e) { toast(errText(e)); b.disabled = false; }
    }));
    app.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      if (!confirm('Obrisati zadatak?')) return;
      try { await q(sb.from('tasks').delete().eq('id', b.dataset.del)); renderTodo(); } catch (e) { toast(errText(e)); }
    }));
  } catch (e) { screen({ title, back, body: `<p class="err">${esc(errText(e))}</p>` }); }
}

async function renderTaskForm() {
  let people = [];
  try { people = await q(sb.from('profiles').select('id, full_name').eq('active', true).order('full_name')); } catch (e) { toast(errText(e)); }
  screen({
    title: 'Novi zadatak', back: '/todo',
    body: `
      <form id="f">
        <label>Zadatak<input name="title" required placeholder="npr. Nabavka u Metru"></label>
        <label>Opis<textarea name="description" placeholder="detalji, popis stvari…"></textarea></label>
        <label>Za koga<select name="assigned_to" required>${people.map((p) => `<option value="${p.id}" ${p.id === todoFilter ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select></label>
        <label>Rok<input name="due_date" type="date" value="${todayStr()}"></label>
        <div class="err" id="err"></div>
        <button class="btn" type="submit">Zadaj</button>
      </form>`,
  });
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await q(sb.from('tasks').insert({ title: val(f, 'title'), description: val(f, 'description'), assigned_to: val(f, 'assigned_to'), due_date: val(f, 'due_date') }));
      toast('Zadatak zadan'); go('/todo');
    } catch (err) { document.getElementById('err').textContent = errText(err); }
  };
}

/* ---------- KORISNICI ---------- */
const ROLE = { super_admin: 'Super admin', admin: 'Admin', user: 'Zaposlenik' };
async function renderUsers() {
  loading('Korisnici', '/');
  try {
    const rows = await q(sb.from('profiles').select('*').order('full_name'));
    screen({
      title: 'Korisnici', back: '/', action: '/korisnici/new',
      body: `<div class="list">${rows.map((u) => `
        <button class="card" data-go="/korisnici/${u.id}" style="${u.active ? '' : 'opacity:.5'}">
          <div class="price-row"><span class="title">${esc(u.full_name)}</span><span class="muted">${ROLE[u.role]}</span></div>
          <div class="row small"><span>@${esc(u.username)}</span>${u.active ? '' : '<span>neaktivan</span>'}</div>
        </button>`).join('')}</div>`,
    });
  } catch (e) { screen({ title: 'Korisnici', back: '/', body: `<p class="err">${esc(errText(e))}</p>` }); }
}

function renderUserNew() {
  screen({
    title: 'Novi korisnik', back: '/korisnici',
    body: `
      <form id="f">
        <label>Ime i prezime<input name="full_name" required placeholder="npr. Antonio"></label>
        <label>Korisničko ime<input name="username" required autocapitalize="none" autocorrect="off" placeholder="npr. antonio"></label>
        <label>PIN (4 do 8 brojeva)<input name="pin" class="pin" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required></label>
        <label>Uloga<select name="role"><option value="user">Zaposlenik (vidi samo svoje zadatke)</option><option value="admin">Admin (vidi sve)</option></select></label>
        <div class="err" id="err"></div>
        <button class="btn" type="submit">Napravi račun</button>
      </form>`,
  });
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await q(sb.rpc('admin_create_user', { p_username: val(f, 'username'), p_full_name: val(f, 'full_name'), p_pin: val(f, 'pin'), p_role: val(f, 'role') }));
      toast('Račun napravljen'); go('/korisnici');
    } catch (err) { document.getElementById('err').textContent = errText(err); }
  };
}

async function renderUserEdit(id) {
  let u;
  try { u = await q(sb.from('profiles').select('*').eq('id', id).single()); } catch (e) { toast(errText(e)); return go('/korisnici'); }
  const canEdit = u.role !== 'super_admin' || isSuper();
  screen({
    title: u.full_name, back: '/korisnici',
    body: `
      <div class="detail" style="margin-bottom:16px">
        <div class="item"><div class="label">Korisničko ime</div><div class="value">${esc(u.username)}</div></div>
        <div class="item"><div class="label">Uloga</div><div class="value">${ROLE[u.role]}</div></div>
      </div>
      ${canEdit ? `
      <form id="f">
        <label>Ime i prezime<input name="full_name" value="${esc(u.full_name)}" required></label>
        ${u.role !== 'super_admin' ? `<label>Uloga<select name="role"><option value="user" ${u.role === 'user' ? 'selected' : ''}>Zaposlenik</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option></select></label>
        <label style="display:flex;align-items:center;gap:10px;text-transform:none;font-size:16px;color:var(--ink)"><input type="checkbox" name="active" style="width:22px;height:22px" ${u.active ? 'checked' : ''}> Račun aktivan</label>` : ''}
        <button class="btn" type="submit">Spremi</button>
      </form>
      <form id="p" style="margin-top:22px">
        <label>Novi PIN<input name="pin" class="pin" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required></label>
        <button class="btn secondary" type="submit">Postavi novi PIN</button>
      </form>
      <div class="err" id="err"></div>` : ''}`,
  });
  if (!canEdit) return;
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const row = { full_name: val(f, 'full_name') };
    if (f.role) { row.role = f.role.value; row.active = f.active.checked; }
    try { await q(sb.from('profiles').update(row).eq('id', id)); toast('Spremljeno'); go('/korisnici'); } catch (err) { document.getElementById('err').textContent = errText(err); }
  };
  const p = document.getElementById('p');
  p.onsubmit = async (e) => {
    e.preventDefault();
    try { await q(sb.rpc('admin_set_pin', { p_user: id, p_pin: val(p, 'pin') })); toast('PIN promijenjen'); p.reset(); } catch (err) { document.getElementById('err').textContent = errText(err); }
  };
}

function renderMyPin() {
  screen({
    title: 'Promijeni PIN', back: '/',
    body: `
      <form id="f">
        <label>Novi PIN (4 do 8 brojeva)<input name="pin" class="pin" type="password" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required></label>
        <label>Ponovi PIN<input name="pin2" class="pin" type="password" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required></label>
        <div class="err" id="err"></div>
        <button class="btn" type="submit">Spremi</button>
      </form>`,
  });
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (f.pin.value !== f.pin2.value) { document.getElementById('err').textContent = 'PIN-ovi se ne podudaraju.'; return; }
    try { await q(sb.rpc('admin_set_pin', { p_user: me.id, p_pin: f.pin.value })); toast('PIN promijenjen'); go('/'); } catch (err) { document.getElementById('err').textContent = errText(err); }
  };
}

/* ---------- router ---------- */
async function route() {
  if (!me) return renderLogin();
  const [path, qs] = location.hash.slice(1).split('?');
  const params = new URLSearchParams(qs || '');
  const p = (path || '/').split('/').filter(Boolean);
  if (!isAdmin() && !['', 'pin'].includes(p[0] || '')) return renderTodo();
  switch (p[0]) {
    case undefined: return renderHome();
    case 'pin': return renderMyPin();
    case 'catering':
      if (!p[1]) return renderCateringList();
      if (p[1] === 'new') return renderCateringForm();
      if (p[2] === 'edit') return renderCateringForm(p[1]);
      return renderCateringDetail(p[1]);
    case 'nabavka': return p[1] ? renderSupplier(p[1]) : renderSuppliers();
    case 'artikli': return renderAllItems();
    case 'dobavljac': return p[1] === 'new' ? renderSupplierForm() : renderSupplierForm(p[1]);
    case 'artikl': return p[1] === 'new' ? renderItemForm(null, params.get('s')) : renderItemForm(p[1]);
    case 'restoran': return renderRestoran();
    case 'jelo':
      if (p[1] === 'new') return renderDishForm();
      if (p[2] === 'edit') return renderDishForm(p[1]);
      return renderDish(p[1]);
    case 'todo': return p[1] === 'new' ? renderTaskForm() : renderTodo();
    case 'korisnici':
      if (!p[1]) return renderUsers();
      if (p[1] === 'new') return renderUserNew();
      return renderUserEdit(p[1]);
    default: return renderHome();
  }
}

window.addEventListener('hashchange', route);
sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') { me = null; renderLogin(); } });
(async () => { await loadMe(); route(); })();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
