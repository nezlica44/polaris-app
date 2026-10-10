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
const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);

const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  people: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  pin: svg('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
  phone: svg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>'),
  chev: svg('<path d="m9 18 6-6-6-6"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  gear: svg('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
  calendar: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  utensils: svg('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>'),
  todo: svg('<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
  book: svg('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'),
  bike: svg('<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>'),
  cart: svg('<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>'),
  users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  activity: svg('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
};
const LOGO = '<img src="polaris-logo.png" alt="Polaris" class="logo" onerror="this.remove()">';

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

function screen({ title, back, action, right = '', body, hideTitle }) {
  app.innerHTML = `
    <header class="top">
      ${back ? `<button class="backbtn" data-back="${esc(back)}">${ICON.back}Natrag</button>` : ''}
      <span class="spacer"></span>
      ${right}
      ${action ? `<button class="roundbtn tap" data-go="${esc(action)}" aria-label="Dodaj">${ICON.plus}</button>` : ''}
    </header>
    ${hideTitle ? '' : `<h1 class="large">${esc(title)}</h1>`}
    <main>${body}</main>`;
  document.title = title ? `${title} · Polaris` : 'Polaris';
  window.scrollTo(0, 0);
}
function loading(title, back) { screen({ title, back, body: '<p class="muted center">Učitavam…</p>' }); }
function failed(title, back, e) { screen({ title, back, body: `<p class="err">${esc(errText(e))}</p>` }); }

const menuBtn = (path, icon, color, name, sub) => `
  <button class="tap" data-go="${path}">
    <span class="ico ${color}">${ICON[icon]}</span>
    <span class="txt"><span class="name">${esc(name)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span>
    <span class="chev">${ICON.chev}</span>
  </button>`;

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-back]');
  if (b) { go(b.dataset.back); return; }
  const g = e.target.closest('[data-go]');
  if (g) go(g.dataset.go);
});

/* ---------- prijava ---------- */
function renderLogin() {
  document.title = 'Polaris';
  app.innerHTML = `
    <div class="login">
      <div class="login-hero">${LOGO}<div class="brand-sub">Interna aplikacija</div></div>
      <form id="f" autocomplete="on">
        <label>Korisničko ime<input name="u" autocapitalize="none" autocorrect="off" autocomplete="username" required></label>
        <label>PIN<input name="p" class="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="current-password" required></label>
        <div class="err" id="err"></div>
        <button class="btn tap" type="submit">Prijava</button>
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
async function renderHome() {
  if (!isAdmin()) return renderTodo();
  const draw = (cat = '', todo = '') => {
    screen({
      title: '', hideTitle: true,
      right: isSuper() ? `<button class="roundbtn plain tap" data-go="/admin" aria-label="Admin">${ICON.gear}</button>` : '',
      body: `
        <div class="home-hero">${LOGO}<div class="hello">Bok, ${esc(me.full_name)}</div></div>
        <div class="menu">
          ${menuBtn('/catering', 'calendar', 'green', 'Catering', cat)}
          ${menuBtn('/restoran', 'utensils', 'gold', 'Restoran', 'Jelovnik, dostava, nabavka')}
          ${menuBtn('/todo', 'todo', 'green', 'To-do', todo)}
        </div>
        <div class="footer-links">
          <button class="link" data-go="/pin">Promijeni PIN</button>
          <button class="link" id="logout">Odjava</button>
        </div>`,
    });
    document.getElementById('logout').onclick = logout;
  };
  draw();
  try {
    const t = todayStr();
    const [{ count: c }, { count: o }] = await Promise.all([
      sb.from('caterings').select('id', { count: 'exact', head: true }).gte('event_date', t),
      sb.from('tasks').select('id', { count: 'exact', head: true }).eq('done', false),
    ]);
    if (location.hash.replace('#', '') in { '': 1, '/': 1 }) {
      draw(c ? `${c} ${plural(c, 'nadolazeći', 'nadolazeća', 'nadolazećih')}` : 'Nema nadolazećih', o ? `${o} ${plural(o, 'otvoren zadatak', 'otvorena zadatka', 'otvorenih zadataka')}` : 'Sve je gotovo');
    }
  } catch { /* brojevi nisu nužni */ }
}

/* ---------- CATERING ---------- */
function dayCard(date, events, past) {
  const d = parseDate(date);
  const n = events.length;
  return `
    <div class="day ${n >= 3 ? 'compact' : ''} ${past ? 'past' : ''}">
      <div class="date">
        <div class="d">${d.getDate()}.</div><div class="m">${MONTHS[d.getMonth()]}</div><div class="w">${DAYS[d.getDay()]}</div>
        ${n > 1 ? `<div class="cnt">${n}×</div>` : ''}
      </div>
      <div class="events">${events.map((c, i) => `
        <button class="ev" data-go="/catering/${c.id}">
          ${n > 1 ? `<span class="num">${i + 1}</span>` : ''}
          <span class="body">
            <span class="title one" style="display:block">${esc(c.title || 'Catering')}</span>
            <span class="meta">
              ${c.event_time ? `<span>${ICON.clock}${fmtTime(c.event_time)}</span>` : ''}
              ${c.people ? `<span>${ICON.people}${c.people}</span>` : ''}
              ${n >= 3 && c.location ? `<span class="one" style="display:block">${esc(c.location)}</span>` : ''}
            </span>
            ${n < 3 && c.location ? `<span class="loc">${ICON.pin}<span class="one">${esc(c.location)}</span></span>` : ''}
          </span>
          <span class="chev">${ICON.chev}</span>
        </button>`).join('')}
      </div>
    </div>`;
}
function groupByDate(rows) {
  const m = new Map();
  rows.forEach((r) => { if (!m.has(r.event_date)) m.set(r.event_date, []); m.get(r.event_date).push(r); });
  return [...m.entries()].sort((x, y) => x[0].localeCompare(y[0]));
}

async function renderCateringList() {
  loading('Catering', '/');
  try {
    const rows = await q(sb.from('caterings').select('id, event_date, event_time, people, title, location').order('event_date').order('event_time', { nullsFirst: false }));
    const t = todayStr();
    const upcoming = groupByDate(rows.filter((r) => r.event_date >= t));
    const past = groupByDate(rows.filter((r) => r.event_date < t)).reverse().slice(0, 15);
    let body = '';
    if (!rows.length) body = '<div class="empty">Još nema cateringa.<br>Dodaj prvi na +</div>';
    else {
      body += upcoming.length ? `<div class="list">${upcoming.map(([d, ev]) => dayCard(d, ev)).join('')}</div>` : '<div class="empty">Nema nadolazećih cateringa.</div>';
      if (past.length) body += `<div class="section-title">Prošli</div><div class="list">${past.map(([d, ev]) => dayCard(d, ev, true)).join('')}</div>`;
    }
    screen({ title: 'Catering', back: '/', action: '/catering/new', body });
  } catch (e) { failed('Catering', '/', e); }
}

async function renderCateringDetail(id) {
  loading('Catering', '/catering');
  try {
    const c = await q(sb.from('caterings').select('*').eq('id', id).single());
    const d = parseDate(c.event_date);
    const item = (label, v) => (v ? `<div class="item"><div class="label">${label}</div><div class="value">${esc(v)}</div></div>` : '');
    const hasDetails = c.location || c.contact || c.description || c.platters || c.extras;
    screen({
      title: c.title || 'Catering', back: '/catering',
      body: `
        <div class="hero">
          <div class="bigdate">${d.getDate()}. ${MONTHS[d.getMonth()]}</div>
          <div class="muted">${DAYS_FULL[d.getDay()]}, ${fmtDateShort(c.event_date)}</div>
          <div class="chips">
            ${c.event_time ? `<span class="chip">${ICON.clock}${fmtTime(c.event_time)}</span>` : ''}
            ${c.people ? `<span class="chip">${ICON.people}${c.people} ${plural(c.people, 'osoba', 'osobe', 'osoba')}</span>` : ''}
          </div>
        </div>
        ${hasDetails ? `<div class="detail">
          ${item('Lokacija', c.location)}
          ${item('Kontakt', c.contact)}
          ${item('Opis i napomene', c.description)}
          ${item('Banjice', c.platters)}
          ${item('Dodatno', c.extras)}
        </div>` : ''}
        <div class="actions">
          <button class="btn secondary tap" data-go="/catering/${c.id}/edit">Uredi</button>
          <button class="btn danger" id="del">Obriši catering</button>
        </div>`,
    });
    document.getElementById('del').onclick = async () => {
      if (!confirm('Obrisati ovaj catering?')) return;
      try { await q(sb.from('caterings').delete().eq('id', id)); toast('Obrisano'); go('/catering'); } catch (e) { toast(errText(e)); }
    };
  } catch (e) { failed('Catering', '/catering', e); }
}

async function renderCateringForm(id) {
  let c = { event_date: todayStr() };
  if (id) { loading('Uredi catering', `/catering/${id}`); try { c = await q(sb.from('caterings').select('*').eq('id', id).single()); } catch (e) { toast(errText(e)); } }
  // stari zapisi: banjice i dodatno spajamo u opis
  const desc = [c.description, c.platters && `Banjice: ${c.platters}`, c.extras && `Dodatno: ${c.extras}`].filter(Boolean).join('\n');
  const back = id ? `/catering/${id}` : '/catering';
  screen({
    title: id ? 'Uredi catering' : 'Novi catering', back,
    body: `
      <form id="f">
        <label>Naziv<input name="title" value="${esc(c.title)}" placeholder="npr. Rođendan Horvat, Bowling"></label>
        <div class="grid2">
          <label>Datum<input name="event_date" type="date" value="${esc(c.event_date)}" required></label>
          <label>Vrijeme<input name="event_time" type="time" value="${esc(c.event_time?.slice(0, 5))}"></label>
        </div>
        <label>Broj ljudi<input name="people" type="number" inputmode="numeric" min="0" value="${esc(c.people)}"></label>
        <label>Lokacija<input name="location" value="${esc(c.location)}" placeholder="npr. Sala Luma, J.J. Strossmayera 271"></label>
        <label>Kontakt<input name="contact" value="${esc(c.contact)}" placeholder="ime i broj mobitela"></label>
        <label>Opis i napomene<textarea name="description" style="min-height:200px" placeholder="hrana, banjice, pizze, napomene…">${esc(desc)}</textarea></label>
        <div class="err" id="err"></div>
        <button class="btn tap" type="submit">Spremi</button>
      </form>`,
  });
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const row = {
      title: val(f, 'title'), event_date: val(f, 'event_date'), event_time: val(f, 'event_time'),
      people: numVal(f, 'people'), location: val(f, 'location'), contact: val(f, 'contact'),
      description: val(f, 'description'), platters: null, extras: null,
    };
    try {
      if (id) { await q(sb.from('caterings').update(row).eq('id', id)); go(`/catering/${id}`); }
      else { const r = await q(sb.from('caterings').insert(row).select('id').single()); go(`/catering/${r.id}`); }
      toast('Spremljeno');
    } catch (err) { document.getElementById('err').textContent = errText(err); btn.disabled = false; }
  };
}

/* ---------- RESTORAN ---------- */
function renderRestoranMenu() {
  screen({
    title: 'Restoran', back: '/',
    body: `<div class="menu">
      ${menuBtn('/jelovnik', 'book', 'green', 'Jelovnik', 'Normativi, recepti, food cost')}
      ${menuBtn('/dostava', 'bike', 'gold', 'Jelovnik - Dostava', 'Cijene za Wolt i sl.')}
      ${menuBtn('/nabavka', 'cart', 'green', 'Nabavka', 'Dobavljači, artikli, cijene')}
    </div>`,
  });
}

/* ---------- NABAVKA ---------- */
async function renderSuppliers() {
  loading('Nabavka', '/restoran');
  try {
    const rows = await q(sb.from('suppliers').select('id, name, items(count)').order('name'));
    screen({
      title: 'Nabavka', back: '/restoran', action: '/dobavljac/new',
      body: `
        <div class="section-title">Dobavljači</div>
        ${rows.length ? `<div class="group">${rows.map((s) => {
          const n = s.items[0]?.count || 0;
          return `<button class="cell" data-go="/nabavka/${s.id}">
            <span class="main"><span class="title one" style="display:block">${esc(s.name)}</span></span>
            <span class="muted nowrap">${n} ${plural(n, 'artikl', 'artikla', 'artikala')}</span>
            <span class="chev">${ICON.chev}</span>
          </button>`;
        }).join('')}</div>` : '<div class="empty">Nema dobavljača. Dodaj na +</div>'}
        <div class="actions"><button class="btn secondary tap" data-go="/artikli">Svi artikli i cijene</button></div>`,
    });
  } catch (e) { failed('Nabavka', '/restoran', e); }
}

function itemCell(i, showSupplier) {
  const gross = i.price_net != null ? i.price_net * (1 + (i.vat_rate || 0) / 100) : null;
  return `
    <button class="cell" data-go="/artikl/${i.id}">
      <span class="main">
        <span class="price-row"><span class="title one">${esc(i.name)}</span><span class="p">${eur(i.price_net)}<span class="muted" style="font-weight:400">/${esc(i.unit)}</span></span></span>
        <span class="meta price-row"><span class="one">${showSupplier ? esc(i.suppliers?.name) + ' · ' : ''}s PDV-om ${eur(gross)}</span><span class="nowrap">${fmtStamp(i.updated_at)}</span></span>
      </span>
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
        ${s.contact || s.note ? `<div class="detail" style="margin-bottom:6px">
          ${s.contact ? `<div class="item"><div class="label">Kontakt</div><div class="value">${esc(s.contact)}</div></div>` : ''}
          ${s.note ? `<div class="item"><div class="label">Napomena</div><div class="value">${esc(s.note)}</div></div>` : ''}
        </div>` : ''}
        <div class="section-title">Artikli · cijene bez PDV-a</div>
        ${items.length ? `<div class="group">${items.map((i) => itemCell(i)).join('')}</div>` : '<div class="empty">Nema artikala. Dodaj na +</div>'}
        <div class="actions"><button class="btn secondary tap" data-go="/dobavljac/${s.id}/edit">Uredi dobavljača</button></div>`,
    });
  } catch (e) { failed('Dobavljač', '/nabavka', e); }
}

async function renderAllItems() {
  loading('Svi artikli', '/nabavka');
  try {
    const rows = await q(sb.from('items').select('*, suppliers(name)').order('name'));
    screen({ title: 'Svi artikli', back: '/nabavka', body: '<input id="s" type="search" placeholder="Traži artikl…" style="margin-bottom:14px"><div id="l"></div>' });
    const l = document.getElementById('l');
    const draw = (t) => {
      const f = rows.filter((r) => r.name.toLowerCase().includes(t.toLowerCase()));
      l.innerHTML = f.length ? `<div class="group">${f.map((i) => itemCell(i, true)).join('')}</div>` : '<div class="empty">Nema artikala.</div>';
    };
    document.getElementById('s').oninput = (e) => draw(e.target.value);
    draw('');
  } catch (e) { failed('Svi artikli', '/nabavka', e); }
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
        <button class="btn tap" type="submit">Spremi</button>
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
        <label>PDV<select name="vat_rate">${[25, 13, 5, 0].map((v) => `<option value="${v}" ${Number(i.vat_rate) === v ? 'selected' : ''}>${v}%</option>`).join('')}</select></label>
        ${id ? `<p class="muted small" style="margin:0 4px">Zadnja promjena: ${fmtStamp(i.updated_at)}</p>` : ''}
        <div class="err" id="err"></div>
        <button class="btn tap" type="submit">Spremi</button>
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

/* ---------- JELOVNIK: normativ, recept, food cost ---------- */
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

async function renderMenuList(delivery) {
  const title = delivery ? 'Dostava' : 'Jelovnik';
  loading(title, '/restoran');
  try {
    const rows = await q(sb.from('dishes').select('*, dish_ingredients(qty, unit, items(price_net, unit))').order('sort').order('name'));
    const list = delivery ? rows.filter((d) => d.on_delivery) : rows;
    const groups = {};
    list.forEach((d) => { (groups[d.category || 'Ostalo'] ||= []).push(d); });
    const body = `
      ${list.length ? Object.entries(groups).map(([cat, ds]) => `
        <div class="section-title">${esc(cat)}</div>
        <div class="group">${ds.map((d) => {
          const { cost, missing } = dishCost(d);
          const price = delivery ? d.delivery_price : d.price;
          return `
          <button class="cell" data-go="/jelo/${d.id}">
            <span class="main">
              <span class="price-row"><span class="title one">${esc(d.name)}</span><span class="p">${eur(price)}</span></span>
              <span class="meta price-row"><span class="one">Food cost ${cost != null ? eur(cost) : '—'}${missing ? ` · ${missing} bez cijene` : ''}</span>${factorBadge(price, d.vat_rate, cost)}</span>
            </span>
          </button>`;
        }).join('')}</div>`).join('') : `<div class="empty">${delivery ? 'Nijedno jelo nije na dostavi.<br>Otvori jelo i uključi „Na dostavi”.' : 'Jelovnik je prazan.'}</div>${delivery ? '' : `<div class="actions"><button class="btn tap" data-go="/jelovnik/skeniraj">Učitaj jelovnik iz PDF-a</button><p class="muted small center" style="margin:4px 0 0">Aplikacija sama upiše jela, kategorije i cijene iz PDF-a. Ili dodaj jelo ručno na +.</p></div>`}`}
      ${list.length ? '<p class="muted small" style="margin:16px 4px">Faktor = prodajna cijena bez PDV-a / nabavna cijena sastojaka. Cilj je iznad 3x.</p>' : ''}`;
    screen({ title: delivery ? 'Jelovnik - Dostava' : 'Jelovnik', back: '/restoran', action: '/jelo/new', body });
  } catch (e) { failed(title, '/restoran', e); }
}

async function renderDish(id) {
  loading('Jelo', '/jelovnik');
  try {
    const d = await q(sb.from('dishes').select('*, dish_ingredients(*, items(name, price_net, unit, suppliers(name)))').eq('id', id).single());
    const ings = (d.dish_ingredients || []).sort((a, b) => a.sort - b.sort);
    const { cost, missing } = dishCost(d);
    const priceLine = (label, p) => `<div class="price-row" style="margin-top:6px"><span>${label}</span><span class="p">${eur(p)} ${factorBadge(p, d.vat_rate, cost)}</span></div>`;
    screen({
      title: d.name, back: '/jelovnik',
      body: `
        <div class="hero">
          <div class="muted small">${esc(d.category || 'Bez kategorije')} · PDV ${num(d.vat_rate ?? 0, 1)}%</div>
          ${priceLine('Restoran', d.price)}
          ${d.on_delivery ? priceLine('Dostava', d.delivery_price) : ''}
          ${d.description ? `<div class="muted small" style="margin-top:10px;white-space:pre-wrap">${esc(d.description)}</div>` : ''}
        </div>
        <div class="section-title">Normativ za 1 porciju</div>
        <div class="group">
          ${ings.length ? ings.map((g) => {
            const c = lineCost(g);
            return `<div class="cell static"><span class="main price-row"><span class="one">${esc(g.name)} <span class="muted">· ${num(g.qty, 3)} ${esc(g.unit)}</span></span><span class="nowrap ${c == null ? 'muted' : ''}">${c == null ? 'nema cijene' : eur(c)}</span></span></div>`;
          }).join('') + `<div class="cell static"><span class="main price-row"><strong>Food cost</strong><strong>${eur(cost)}</strong></span></div>` : '<div class="cell static muted">Normativ nije upisan.</div>'}
        </div>
        ${missing ? `<p class="muted small" style="margin:8px 4px 0">${missing} ${plural(missing, 'sastojak nije povezan', 'sastojka nisu povezana', 'sastojaka nije povezano')} s artiklom iz Nabavke ili nema cijenu.</p>` : ''}
        <div class="section-title">Recept</div>
        <div class="detail"><div class="item"><div class="value">${d.recipe ? esc(d.recipe) : '<span class="muted">Recept nije upisan.</span>'}</div></div></div>
        <div class="actions"><button class="btn secondary tap" data-go="/jelo/${d.id}/edit">Uredi jelo, normativ i recept</button></div>`,
    });
  } catch (e) { failed('Jelo', '/jelovnik', e); }
}

async function renderDishForm(id) {
  let d = { vat_rate: 13, dish_ingredients: [] };
  let items = [], cats = [];
  try {
    items = await q(sb.from('items').select('id, name, unit, suppliers(name)').order('name'));
    cats = await q(sb.from('dishes').select('category, sort').order('sort'));
    if (id) d = await q(sb.from('dishes').select('*, dish_ingredients(*)').eq('id', id).single());
  } catch (e) { toast(errText(e)); }
  const label = (i) => `${i.name} (${i.suppliers?.name || ''})`;
  const byLabel = new Map(items.map((i) => [label(i), i]));
  const byId = new Map(items.map((i) => [i.id, i]));
  const ings = (d.dish_ingredients || []).sort((a, b) => a.sort - b.sort);
  const back = id ? `/jelo/${id}` : '/jelovnik';
  // kategorije redom kao na jelovniku, s najvećim sort brojem u svakoj
  const catMax = new Map();
  cats.forEach((c) => { if (c.category) catMax.set(c.category, Math.max(catMax.get(c.category) ?? -1, c.sort)); });
  const maxSort = cats.reduce((m, c) => Math.max(m, c.sort), 0);
  const catNames = [...catMax.keys()];
  const ingRow = (g = {}) => {
    const it = g.item_id && byId.get(g.item_id);
    return `<div class="ing">
      <input name="ing_name" list="itemlist" value="${esc(it ? label(it) : g.name)}" placeholder="Sastojak">
      <input name="ing_qty" inputmode="decimal" value="${esc(g.qty != null ? String(g.qty).replace('.', ',') : '')}" placeholder="Kol.">
      <select name="ing_unit">${unitOptions(g.unit || 'g')}</select>
      <button type="button" class="x" aria-label="Makni">×</button>
    </div>`;
  };
  screen({
    title: id ? 'Uredi jelo' : 'Novo jelo', back,
    body: `
      <form id="f">
        <label>Naziv jela<input name="name" value="${esc(d.name)}" required></label>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--muted);padding-left:4px;margin-bottom:8px">U koju kategoriju ide?</div>
          <div class="catpick">
            ${catNames.map((c) => `<label class="catchip"><input type="radio" name="cat" value="${esc(c)}" ${c === d.category ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}
            <label class="catchip"><input type="radio" name="cat" value="__new" ${!catNames.length || (d.category && !catNames.includes(d.category)) ? 'checked' : ''}><span>+ Nova kategorija</span></label>
          </div>
          <input name="category_new" id="catnew" value="${esc(d.category && !catNames.includes(d.category) ? d.category : '')}" placeholder="npr. Jela s roštilja, Pizze, Salate" style="margin-top:10px" ${!catNames.length || (d.category && !catNames.includes(d.category)) ? '' : 'hidden'}>
        </div>
        <label>Opis na jelovniku<input name="description" value="${esc(d.description)}" placeholder="npr. 10 kom, lepinja, luk, kajmak"></label>
        <div class="grid2">
          <label>Cijena s PDV-om (€)<input name="price" inputmode="decimal" value="${esc(d.price)}"></label>
          <label>PDV<select name="vat_rate">${[13, 25, 5, 0].map((v) => `<option value="${v}" ${Number(d.vat_rate) === v ? 'selected' : ''}>${v}%</option>`).join('')}</select></label>
        </div>
        <label class="switch-row"><input type="checkbox" name="on_delivery" ${d.on_delivery ? 'checked' : ''}> Na dostavi (Wolt i sl.)</label>
        <label id="dp" ${d.on_delivery ? '' : 'hidden'}>Cijena na dostavi s PDV-om (€)<input name="delivery_price" inputmode="decimal" value="${esc(d.delivery_price)}"></label>
        <div>
          <div class="section-title" style="margin-top:8px">Normativ za 1 porciju</div>
          <p class="muted small" style="margin:0 4px 10px">Odaberi artikl iz Nabavke da se izračuna cijena.</p>
          <datalist id="itemlist">${items.map((i) => `<option value="${esc(label(i))}">`).join('')}</datalist>
          <div id="ings" style="display:grid;gap:8px">${ings.map(ingRow).join('')}</div>
          <button type="button" class="btn secondary tap" id="add" style="margin-top:10px">+ Dodaj sastojak</button>
        </div>
        <label>Recept (priprema)<textarea name="recipe" style="min-height:180px">${esc(d.recipe)}</textarea></label>
        <div class="err" id="err"></div>
        <button class="btn tap" type="submit">Spremi</button>
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
    if (it && it.unit === 'kg') unitSel.value = 'g';
    else if (it && it.unit === 'l') unitSel.value = 'ml';
    else if (it) unitSel.value = it.unit;
  };
  f.querySelectorAll('[name=cat]').forEach((r) => (r.onchange = () => {
    const n = document.getElementById('catnew');
    n.hidden = f.cat.value !== '__new';
    if (!n.hidden) n.focus();
  }));
  f.on_delivery.onchange = () => { document.getElementById('dp').hidden = !f.on_delivery.checked; };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById('err');
    const row = {
      name: val(f, 'name'), category: f.cat.value === '__new' ? val(f, 'category_new') : f.cat.value || null, description: val(f, 'description'), price: numVal(f, 'price'), vat_rate: numVal(f, 'vat_rate'),
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
    if (!row.category) { err.textContent = 'Odaberi kategoriju ili upiši novu.'; return; }
    if (bad) { err.textContent = 'Svaki sastojak treba naziv i količinu (broj).'; return; }
    if (!id || row.category !== d.category) row.sort = catMax.has(row.category) ? catMax.get(row.category) + 1 : maxSort + 10;
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
    try { await q(sb.from('dishes').delete().eq('id', id)); toast('Obrisano'); go('/jelovnik'); } catch (e2) { toast(errText(e2)); }
  };
}

/* ---------- JELOVNIK IZ PDF-a (čita se na uređaju, besplatno) ---------- */
const PRICE_RE = /(?:€\s*)?\d{1,4}[.,]\d{1,2}\s*(?:€|eur(?:a|o)?\b)?|(?:€\s*)\d{1,4}\b|\b\d{1,4}\s*(?:€|eur(?:a|o)?\b)/gi;

// cijene u retku; broj iza kojeg ide mjerna jedinica (0,5 l, 200 g) nije cijena
function findPrices(t) {
  const all = [...t.matchAll(PRICE_RE)].filter((m) => !/^\s*(l|ml|cl|dl|kg|g|dag|kom|x)\b/i.test(t.slice(m.index + m[0].length)));
  const withCur = all.filter((m) => /€|eur/i.test(m[0]));
  return withCur.length ? withCur : all;
}

async function pdfLines(file) {
  const pdfjs = await import('./vendor/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('vendor/pdf.worker.min.mjs', location.href).href;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const out = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const width = page.getViewport({ scale: 1 }).width;
    const tc = await page.getTextContent();
    const rows = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const x = it.transform[4], y = it.transform[5], h = Math.abs(it.transform[3]) || it.height || 10;
      let r = rows.find((r) => Math.abs(r.y - y) < Math.max(2, Math.min(r.h, h) * 0.5));
      if (!r) rows.push((r = { y, h, items: [] }));
      r.h = Math.max(r.h, h);
      r.items.push({ x, w: it.width, s: it.str, h });
    }
    // red -> segmenti; veliki razmak dijeli stupce, osim kad je desno samo cijena
    const rowSegs = [];
    for (const r of rows) {
      const segs = [];
      r.items.sort((a, b) => a.x - b.x);
      let cur = null;
      for (const it of r.items) {
        const gap = cur ? it.x - cur.end : 0;
        const isPrice = /^\s*[.\s_]*(€\s*)?\d{1,4}([.,]\d{1,2})?\s*(€|eur)?\s*$/i.test(it.s);
        if (cur && gap > r.h * 4 && !isPrice) { segs.push(cur); cur = null; }
        if (!cur) cur = { x: it.x, y: r.y, h: 0, text: '', end: it.x };
        else if (gap > r.h * 0.2 && !cur.text.endsWith(' ')) cur.text += ' ';
        cur.text += it.s;
        cur.h = Math.max(cur.h, it.h);
        cur.end = it.x + (it.w || 0);
      }
      if (cur) segs.push(cur);
      rowSegs.push(segs);
    }
    // dva stupca samo ako više redova ima po dvije stavke s cijenom
    const hasPrice = (t) => findPrices(t).length > 0;
    const twoCols = rowSegs.filter((sg) => sg.filter((x) => hasPrice(x.text)).length >= 2).length >= 2;
    const segs = twoCols ? rowSegs.flat() : rowSegs.map((sg) => sg.reduce((a, b) => ({ ...a, text: `${a.text} ${b.text}`, h: Math.max(a.h, b.h) })));
    segs.sort((a, b) => (twoCols ? (a.x > width * 0.45) - (b.x > width * 0.45) : 0) || b.y - a.y || a.x - b.x);
    segs.forEach((s) => out.push({ text: s.text.replace(/\s+/g, ' ').trim(), h: s.h }));
  }
  return out.filter((l) => l.text);
}

function parseMenuLines(lines) {
  const priced = lines.filter((l) => findPrices(l.text).length);
  const hs = priced.map((l) => l.h).sort((a, b) => a - b);
  const dishH = hs.length ? hs[Math.floor(hs.length / 2)] : 10;
  const toNum = (t) => Number(t.replace(/[^\d,.]/g, '').replace(',', '.'));
  const dishes = [];
  let cat = null, last = null;
  lines.forEach((l, i) => {
    const t = l.text;
    const found = findPrices(t);
    const prices = found.map((m) => m[0]);
    if (prices.length) {
      const first = found[0].index;
      let name = t.slice(0, first).replace(/[\s.…_–—-]+$/, '').trim();
      const rest = t.slice(first + prices[0].length).replace(/^[\s/|.…]+/, '').trim();
      if (!name && last && last.price == null) { last.price = toNum(prices[0]); return; } // cijena u svom redu
      if (!name) return;
      last = { category: cat || 'Ostalo', name, description: prices.length > 1 ? rest : '', price: toNum(prices[0]) };
      dishes.push(last);
      return;
    }
    const letters = t.replace(/[^A-Za-zČĆŽŠĐčćžšđ]/g, '');
    const caps = letters.length >= 3 && letters === letters.toUpperCase();
    const big = l.h > dishH * 1.2;
    const nextPriced = lines[i + 1] && findPrices(lines[i + 1].text).length;
    const looksTitle = t.length <= 30 && !t.includes(',') && /^[A-ZČĆŽŠĐ]/.test(t) && nextPriced && (!last || last.category !== cat || (last.description && true));
    if (big || caps || (!last && t.length <= 40) || looksTitle) {
      cat = t.replace(/\s*[:–-]\s*$/, '');
      last = null;
      return;
    }
    if (last) last.description = last.description ? `${last.description} ${t}` : t;
  });
  const nice = (c) => (c === c.toUpperCase() ? c.charAt(0) + c.slice(1).toLowerCase() : c);
  return dishes.map((d) => ({ ...d, category: nice(d.category) }));
}

function renderScanMenu() {
  screen({
    title: 'Jelovnik iz PDF-a', back: '/jelovnik',
    body: `
      <p class="muted" style="margin:0 4px 14px">Odaberi PDF jelovnika. Aplikacija iz njega izvuče kategorije, jela, opise i cijene, a ti prije spremanja sve pregledaš i ispraviš. Besplatno je i radi na mobitelu.</p>
      <label class="btn secondary tap center" style="display:block;color:var(--accent);font-size:17px">
        <span id="fname">Odaberi PDF jelovnika</span>
        <input id="file" type="file" accept="application/pdf,.pdf" hidden>
      </label>
      <div class="err" id="err" style="margin-top:10px"></div>`,
  });
  const input = document.getElementById('file');
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const err = document.getElementById('err');
    err.textContent = '';
    document.getElementById('fname').textContent = 'Čitam jelovnik…';
    try {
      const lines = await pdfLines(file);
      if (!lines.length) throw new Error('Ovaj PDF je slika (sken), pa iz njega nema teksta za pročitati. Treba PDF izvezen iz programa u kojem je jelovnik napravljen.');
      const dishes = parseMenuLines(lines);
      if (!dishes.length) throw new Error('U PDF-u nisam našao jela s cijenama. Jela možeš dodati ručno na +.');
      renderScanReview(dishes);
    } catch (e) {
      err.textContent = errText(e);
      document.getElementById('fname').textContent = 'Odaberi drugi PDF';
      input.value = '';
    }
  };
}

function renderScanReview(dishes) {
  const groups = [];
  dishes.forEach((d, i) => {
    const cat = (d.category || 'Ostalo').trim();
    let g = groups.find((x) => x.cat === cat);
    if (!g) groups.push((g = { cat, items: [] }));
    g.items.push({ ...d, i });
  });
  screen({
    title: 'Provjeri jela', back: '/jelovnik/skeniraj',
    body: `
      <p class="muted" style="margin:0 4px 6px">Pronađeno ${dishes.length} ${plural(dishes.length, 'jelo', 'jela', 'jela')}. Ispravi što treba, makni kvačicu s onoga što ne želiš, pa spremi.</p>
      <form id="f">
        ${groups.map((g, gi) => `
          <div>
            <div class="section-title" style="margin-top:14px">Kategorija</div>
            <input name="cat_${gi}" value="${esc(g.cat)}" style="font-weight:700">
            <div class="group" style="margin-top:8px">
              ${g.items.map((d) => `
                <div class="cell static" style="gap:10px;align-items:flex-start" data-row="${d.i}" data-g="${gi}">
                  <input type="checkbox" name="on_${d.i}" checked style="margin-top:10px">
                  <span class="main" style="display:grid;gap:6px">
                    <input name="name_${d.i}" value="${esc(d.name)}" style="box-shadow:none;background:var(--fill);padding:9px 10px;font-size:16px">
                    ${d.description ? `<input name="desc_${d.i}" value="${esc(d.description)}" style="box-shadow:none;background:var(--fill);padding:7px 10px;font-size:14px;color:var(--muted)">` : ''}
                  </span>
                  <input name="price_${d.i}" inputmode="decimal" value="${d.price != null ? String(d.price).replace('.', ',') : ''}" placeholder="€" style="width:78px;flex:none;box-shadow:none;background:var(--fill);padding:9px 8px;font-size:16px;text-align:right">
                </div>`).join('')}
            </div>
          </div>`).join('')}
        <div class="err" id="err"></div>
        <button class="btn tap" type="submit">Spremi u jelovnik</button>
      </form>`,
  });
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const { count } = await sb.from('dishes').select('id', { count: 'exact', head: true });
    const base = (count || 0) * 10;
    const rows = [];
    f.querySelectorAll('[data-row]').forEach((el, idx) => {
      const i = el.dataset.row;
      if (!f.elements[`on_${i}`].checked) return;
      const name = f.elements[`name_${i}`].value.trim();
      if (!name) return;
      const p = f.elements[`price_${i}`].value.trim().replace(',', '.');
      rows.push({
        name, category: f.elements[`cat_${el.dataset.g}`].value.trim() || null,
        description: f.elements[`desc_${i}`]?.value.trim() || null,
        price: p && !isNaN(Number(p)) ? Number(p) : null, vat_rate: 13, sort: base + idx,
      });
    });
    if (!rows.length) { document.getElementById('err').textContent = 'Nije odabrano nijedno jelo.'; btn.disabled = false; return; }
    try {
      await q(sb.from('dishes').insert(rows));
      toast(`Spremljeno ${rows.length} ${plural(rows.length, 'jelo', 'jela', 'jela')}`); go('/jelovnik');
    } catch (err) { document.getElementById('err').textContent = errText(err); btn.disabled = false; }
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
      <div class="task ${t.done ? 'done' : ''}">
        <button class="check ${t.done ? 'on' : ''}" data-done="${t.id}" data-v="${t.done ? 0 : 1}" aria-label="Gotovo">${t.done ? ICON.check : ''}</button>
        <div style="flex:1;min-width:0">
          <div class="title">${esc(t.title)}</div>
          ${t.description ? `<div class="small muted" style="white-space:pre-wrap;margin-top:2px">${esc(t.description)}</div>` : ''}
          ${(admin || t.due_date) ? `<div class="meta">
            ${admin ? `<span>${esc(t.assignee?.full_name || '')}</span>` : ''}
            ${t.due_date ? `<span class="nowrap ${!t.done && t.due_date < t0 ? 'overdue' : ''}">${fmtDateShort(t.due_date)}</span>` : ''}
          </div>` : ''}
          ${t.done ? `<div class="donemsg">${admin ? esc(t.assignee?.full_name || '') + ' označio kao gotovo' : 'Označeno kao gotovo'}</div><div class="small muted">${fmtStamp(t.done_at)}</div>` : ''}
          ${isSuper() ? `<button class="del" data-del="${t.id}">Obriši</button>` : ''}
        </div>
      </div>`;
    const groupOf = (arr) => `<div class="group">${arr.map(card).join('<div class="sep"></div>')}</div>`;
    screen({
      title, back, action: admin ? '/todo/new' : null,
      body: `
        ${admin ? `<select id="pf" style="margin-bottom:6px"><option value="">Svi zaposlenici</option>${people.map((p) => `<option value="${p.id}" ${p.id === todoFilter ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select>` : `<p class="muted" style="margin:-6px 4px 6px">Bok, ${esc(me.full_name)}</p>`}
        <div class="section-title">Za napraviti</div>
        ${open.length ? groupOf(open) : '<div class="empty">Nema otvorenih zadataka.</div>'}
        ${done.length ? `<div class="section-title">Gotovo</div>${groupOf(done)}` : ''}
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
  } catch (e) { failed(title, back, e); }
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
        <label>Datum<input name="due_date" type="date" value="${todayStr()}"></label>
        <div class="err" id="err"></div>
        <button class="btn tap" type="submit">Zadaj</button>
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

/* ---------- ADMIN (samo super admin) ---------- */
function renderAdmin() {
  screen({
    title: 'Admin', back: '/',
    body: `<div class="menu">
      ${menuBtn('/korisnici', 'users', 'green', 'Korisnici', 'Računi, uloge, PIN-ovi')}
      ${menuBtn('/radnje', 'activity', 'gold', 'Radnje', 'Što se zadnje mijenjalo')}
    </div>`,
  });
}

async function renderActivity() {
  loading('Radnje', '/admin');
  try {
    const [tasks, cats, items] = await Promise.all([
      q(sb.from('tasks').select('title, done, done_at, created_at, assignee:profiles!tasks_assigned_to_fkey(full_name), creator:profiles!tasks_created_by_fkey(full_name)').order('created_at', { ascending: false }).limit(40)),
      q(sb.from('caterings').select('title, event_date, created_at, creator:profiles(full_name)').order('created_at', { ascending: false }).limit(20)),
      q(sb.from('items').select('name, price_net, unit, updated_at, suppliers(name)').order('updated_at', { ascending: false }).limit(20)),
    ]);
    const ev = [];
    tasks.forEach((t) => {
      ev.push({ at: t.created_at, txt: `${t.creator?.full_name || 'Admin'} zadao: ${t.title} → ${t.assignee?.full_name || ''}` });
      if (t.done && t.done_at) ev.push({ at: t.done_at, txt: `${t.assignee?.full_name || ''} označio gotovo: ${t.title}`, good: true });
    });
    cats.forEach((c) => ev.push({ at: c.created_at, txt: `${c.creator?.full_name || 'Admin'} dodao catering: ${c.title || 'Catering'} (${fmtDateShort(c.event_date)})` }));
    items.forEach((i) => ev.push({ at: i.updated_at, txt: `Cijena: ${i.name} ${eur(i.price_net)}/${i.unit} (${i.suppliers?.name || ''})` }));
    ev.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    screen({
      title: 'Radnje', back: '/admin',
      body: ev.length ? `<div class="group">${ev.slice(0, 50).map((e) => `
        <div class="cell static"><span class="main"><span style="display:block;${e.good ? 'color:var(--done);font-weight:600' : ''}">${esc(e.txt)}</span><span class="meta">${fmtStamp(e.at)}</span></span></div>`).join('')}</div>` : '<div class="empty">Još nema radnji.</div>',
    });
  } catch (e) { failed('Radnje', '/admin', e); }
}

const ROLE = { super_admin: 'Super admin', admin: 'Admin', user: 'Zaposlenik' };
async function renderUsers() {
  loading('Korisnici', '/admin');
  try {
    const rows = await q(sb.from('profiles').select('*').order('full_name'));
    screen({
      title: 'Korisnici', back: '/admin', action: '/korisnici/new',
      body: `<div class="group">${rows.map((u) => `
        <button class="cell" data-go="/korisnici/${u.id}" style="${u.active ? '' : 'opacity:.5'}">
          <span class="main"><span class="title one" style="display:block">${esc(u.full_name)}</span><span class="meta">@${esc(u.username)}${u.active ? '' : ' · neaktivan'}</span></span>
          <span class="muted nowrap">${ROLE[u.role]}</span>
          <span class="chev">${ICON.chev}</span>
        </button>`).join('')}</div>`,
    });
  } catch (e) { failed('Korisnici', '/admin', e); }
}

function renderUserNew() {
  screen({
    title: 'Novi korisnik', back: '/korisnici',
    body: `
      <form id="f">
        <label>Ime i prezime<input name="full_name" required placeholder="npr. Antonio"></label>
        <label>Korisničko ime<input name="username" required autocapitalize="none" autocorrect="off" placeholder="npr. antonio"></label>
        <label>PIN (4 do 8 brojeva)<input name="pin" class="pin" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required></label>
        <label>Uloga<select name="role"><option value="user">Zaposlenik (vidi samo svoje zadatke)</option><option value="admin">Admin (vidi sve osim Admin dijela)</option></select></label>
        <div class="err" id="err"></div>
        <button class="btn tap" type="submit">Napravi račun</button>
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
  screen({
    title: u.full_name, back: '/korisnici',
    body: `
      <div class="detail" style="margin-bottom:18px">
        <div class="item"><div class="label">Korisničko ime</div><div class="value">${esc(u.username)}</div></div>
        <div class="item"><div class="label">Uloga</div><div class="value">${ROLE[u.role]}</div></div>
      </div>
      <form id="f">
        <label>Ime i prezime<input name="full_name" value="${esc(u.full_name)}" required></label>
        ${u.role !== 'super_admin' ? `<label>Uloga<select name="role"><option value="user" ${u.role === 'user' ? 'selected' : ''}>Zaposlenik</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option></select></label>
        <label class="switch-row"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}> Račun aktivan</label>` : ''}
        <button class="btn tap" type="submit">Spremi</button>
      </form>
      <form id="p" style="margin-top:24px">
        <label>Novi PIN<input name="pin" class="pin" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required></label>
        <button class="btn secondary tap" type="submit">Postavi novi PIN</button>
      </form>
      <div class="err" id="err"></div>`,
  });
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
        <button class="btn tap" type="submit">Spremi</button>
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
  if (!isSuper() && ['admin', 'radnje', 'korisnici'].includes(p[0])) return renderHome();
  switch (p[0]) {
    case undefined: return renderHome();
    case 'pin': return renderMyPin();
    case 'catering':
      if (!p[1]) return renderCateringList();
      if (p[1] === 'new') return renderCateringForm();
      if (p[2] === 'edit') return renderCateringForm(p[1]);
      return renderCateringDetail(p[1]);
    case 'restoran': return renderRestoranMenu();
    case 'jelovnik': return p[1] === 'skeniraj' ? renderScanMenu() : renderMenuList(false);
    case 'dostava': return renderMenuList(true);
    case 'nabavka': return p[1] ? renderSupplier(p[1]) : renderSuppliers();
    case 'artikli': return renderAllItems();
    case 'dobavljac': return p[1] === 'new' ? renderSupplierForm() : renderSupplierForm(p[1]);
    case 'artikl': return p[1] === 'new' ? renderItemForm(null, params.get('s')) : renderItemForm(p[1]);
    case 'jelo':
      if (p[1] === 'new') return renderDishForm();
      if (p[2] === 'edit') return renderDishForm(p[1]);
      return renderDish(p[1]);
    case 'todo': return p[1] === 'new' ? renderTaskForm() : renderTodo();
    case 'admin': return renderAdmin();
    case 'radnje': return renderActivity();
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
