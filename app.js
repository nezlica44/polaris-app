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
  scale: svg('<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>'),
  cup: svg('<path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"/><path d="M5 8h14"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/><path d="m12 8 1-6h2"/>'),
  spray: svg('<path d="M3 3h.01"/><path d="M7 5h.01"/><path d="M11 7h.01"/><path d="M3 7h.01"/><path d="M7 9h.01"/><path d="M3 11h.01"/><rect width="4" height="4" x="15" y="5"/><path d="m19 9 2 2v10c0 .6-.4 1-1 1h-6c-.6 0-1-.4-1-1V11l2-2"/><path d="m13 14 8-2"/><path d="m13 19 8-2"/>'),
  note: svg('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'),
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
          ${menuBtn('/restoran', 'utensils', 'gold', 'Restoran', 'Jelovnik, normativ, nabavka')}
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
// Paketi i pravila kalkulatora (Nevio, 11.10.2026.). "Pretpostavka" = Nevio još treba potvrditi.
const MEAT = {
  becki: { name: 'Pileći bečki mini', piece: 50, from: 'pilećeg filea' },
  raznjici: { name: 'Pileći ražnjići', piece: 50 },
  vrat: { name: 'Svinjski vrat' },
  cevapi: { name: 'Ćevapi', piece: 20 },
  batak: { name: 'Otkošteni batak' },
  pljeskavice: { name: 'Mini pljeskavice' },
};
const MEAT_12 = ['becki', 'raznjici', 'vrat', 'cevapi'];
const MEAT_34 = [...MEAT_12, 'batak', 'pljeskavice'];
const SIDES_12 = ['Pekarski krumpir', 'Kroketi', 'Riža'];
const SIDES_34 = [...SIDES_12, 'Chili cheese nuggets', 'Mozzarella sticks'];
const PACKAGES = {
  1: { price: 13, meat: MEAT_12, meatPer3: 1, side: 300, sides: SIDES_12, laz: [], salads: ['Miješana'], saladRate: [2, 10], breads: ['Obične'] },
  2: { price: 16, meat: MEAT_12, meatPer3: 1, side: 300, sides: SIDES_12, laz: ['Njoki 4 vrste sira', 'Rižoto chili'], salads: ['Miješana', 'Šopska'], saladRate: [2, 10], breads: ['Obične', 'Sa sirom'] },
  // paket 3: 1,2 kg mesa na 3 osobe (pretpostavka, u poruci piše "po osobi")
  3: { price: 20, meat: MEAT_34, meatPer3: 1.2, side: 400, sides: SIDES_34, laz: ['Njoki 4 vrste sira', 'Rižoto chili'], salads: ['Miješana', 'Šopska', 'Rukola cherry'], saladRate: [3, 12], breads: ['Obične', 'Sa sirom'] },
  // paket 4: meso, prilozi i salate računaju se kao paket 3 (pretpostavka)
  4: {
    price: 30, meat: MEAT_34, meatPer3: 1.2, side: 400, sides: [...SIDES_34, 'Pohani karfiol'], laz: ['Njoki 4 vrste sira', 'Rižoto chili', 'Rižoto curry'],
    salads: ['Miješana', 'Šopska', 'Rukola cherry', 'Šareni kupus-mrkva'], saladRate: [3, 12], breads: ['Obične', 'Sa sirom', 'S češnjakom'], soup: 'Juha (3 vrste)', dessert: 'Domaći kolači',
  },
};
const EXTRA = { cutlery: 2.5, table: 25, barTable: 15 };
const LAZ_G = 300; // jedna lazanjera = porcija od oko 300 g
const LAZ_PER = 30; // g po osobi od svakog priloga iz lazanjere
const BREAD_PER_10 = 2; // krugova lepinjica na 10 ljudi
const BREAD_PCS = 8; // lepinjica u krugu (2 kruga = 16 lepinjica)
const BANJICA_PEOPLE = 15; // pretpostavka: 1 banjica na 15 ljudi
const SOUP_DL = 2.5; // pretpostavka: dl juhe po osobi
const CAKES = 2; // pretpostavka: kolača po osobi

const split = (total, k) => Array.from({ length: k }, (_, i) => Math.floor(total / k) + (i < total % k ? 1 : 0));
const ceil = (x) => Math.ceil(x - 1e-9);
const up50 = (g) => ceil(g / 50) * 50;
const kgTxt = (g) => (g >= 1000 ? `${num(g / 1000, 2)} kg` : `${Math.round(g)} g`);
const krug = (n) => `${n} ${plural(n, 'krug', 'kruga', 'krugova')}`;

function cateringCalc(c) {
  const n = Math.max(0, Number(c.people) || 0);
  const P = PACKAGES[c.package];
  const k = { n, P, pkg: c.package, lines: [], tables: Number(c.tables) || 0, barTables: Number(c.bar_tables) || 0, cutlery: !!c.cutlery && n > 0 };
  if (P && n) k.lines.push([`Paket ${c.package}`, `${n} × ${eur(P.price)}`, P.price * n]);
  if (k.cutlery) k.lines.push(['Beštek', `${n} × ${eur(EXTRA.cutlery)}`, EXTRA.cutlery * n]);
  if (k.tables) k.lines.push(['Stol + stolnjak', `${k.tables} × ${eur(EXTRA.table)}`, EXTRA.table * k.tables]);
  if (k.barTables) k.lines.push(['Barski stol + presvlaka', `${k.barTables} × ${eur(EXTRA.barTable)}`, EXTRA.barTable * k.barTables]);
  k.total = k.lines.reduce((s, l) => s + l[2], 0);
  if (!P || !n) return k;
  // meso: kg na 3 osobe, jednako po vrstama; komadi se zaokružuju na više
  const share = (n * P.meatPer3 * 1000) / 3 / P.meat.length;
  k.meat = P.meat.map((key) => {
    const m = MEAT[key];
    if (!m.piece) return { ...m, g: up50(share) };
    const pcs = ceil(share / m.piece);
    return { ...m, pcs, g: pcs * m.piece };
  });
  k.meatG = k.meat.reduce((s, m) => s + m.g, 0);
  // prilozi: njoki i rižoto idu u lazanjere (30 g po osobi od svakog), ostalo u banjicu
  k.lazanjere = P.laz.length ? Math.max(P.laz.length, ceil((n * LAZ_PER * P.laz.length) / LAZ_G)) : 0;
  k.laz = split(k.lazanjere, P.laz.length).map((cnt, i) => ({ name: P.laz[i], cnt, g: cnt * LAZ_G }));
  const sideG = (n * (P.side - LAZ_PER * P.laz.length)) / P.sides.length;
  k.sides = P.sides.map((name) => ({ name, g: up50(sideG) }));
  k.sideG = [...k.sides, ...k.laz].reduce((s, x) => s + x.g, 0);
  // salate i lepinjice: barem jedna od svake vrste
  k.saladN = Math.max(P.salads.length, ceil((n * P.saladRate[0]) / P.saladRate[1]));
  k.salads = split(k.saladN, P.salads.length).map((cnt, i) => ({ name: P.salads[i], cnt }));
  k.breadN = Math.max(P.breads.length, ceil((n * BREAD_PER_10) / 10));
  k.breads = split(k.breadN, P.breads.length).map((cnt, i) => ({ name: P.breads[i], cnt }));
  k.banjice = ceil(n / BANJICA_PEOPLE);
  if (P.soup) k.soupL = (n * SOUP_DL) / 10;
  if (P.dessert) k.cakes = n * CAKES;
  return k;
}

// Cijene iz Nabavke: stavka kalkulatora traži Food artikl po riječima iz naziva (bez kvačica, "!" = ne smije sadržavati).
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const MATCH = {
  'Pileći bečki mini': [['beck'], ['pileci', 'file']],
  'Pileći ražnjići': [['raznj'], ['pileci', 'file']],
  'Svinjski vrat': [['vrat']],
  'Ćevapi': [['cevap']],
  'Otkošteni batak': [['batak'], ['bataci']],
  'Mini pljeskavice': [['pljeskav']],
  'Pekarski krumpir': [['krumpir'], ['krompir']],
  'Kroketi': [['kroket']],
  'Riža': [['riza']],
  'Chili cheese nuggets': [['nugget']],
  'Mozzarella sticks': [['mozzarella', 'stick'], ['mozarela', 'stick']],
  'Pohani karfiol': [['karfiol'], ['cvjetac']],
  'Njoki 4 vrste sira': [['njok']],
  'Rižoto chili': [['rizoto', 'chili'], ['rizoto', 'cili']],
  'Rižoto curry': [['rizoto', 'curry'], ['rizoto', 'kari']],
  'Miješana': [['mijesana', 'salat']],
  'Šopska': [['sopsk']],
  'Rukola cherry': [['rukola', 'salat']],
  'Šareni kupus-mrkva': [['kupus', 'salat']],
  'Obične': [['lepinj', '!sir', '!cesnj']],
  'Sa sirom': [['lepinj', 'sir']],
  'S češnjakom': [['lepinj', 'cesnj']],
};
function findItem(items, name) {
  for (const alt of MATCH[name] || []) {
    const hit = items.filter((i) => alt.every((t) => (t[0] === '!' ? !i.n.includes(t.slice(1)) : i.n.includes(t))));
    if (hit.length) return hit.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0];
  }
  return null;
}
// trošak stavke: po težini (g) ako je artikl u kg/g, po komadu ako je artikl u kom
function itemCost(it, g, pieces) {
  if (!it || !(Number(it.price_net) > 0)) return null;
  const b = BASE[it.unit];
  if (b?.[0] === 'kg' && g) return (g / 1000 / b[1]) * Number(it.price_net);
  if (b?.[0] === 'kom' && pieces) return pieces * Number(it.price_net);
  return null;
}
// medijan cijene mesa iz Nabavke (€/kg bez PDV-a), za meso koje nema svoj artikl
const MEAT_RE = /ćevap|cevap|vrat|batak|file|piletin|pileć|pilec|bečk|beck|ražnj|raznj|pljeskav|svinj|junet|teleć|telec|janje|kobasic|meso|mesa\b/i;
function meatMedian(items) {
  const p = (items || [])
    .filter((i) => MEAT_RE.test(i.name) && Number(i.price_net) > 0 && BASE[i.unit]?.[0] === 'kg')
    .map((i) => Number(i.price_net) / BASE[i.unit][1])
    .sort((a, b) => a - b);
  if (!p.length) return null;
  const m = p.length >> 1;
  return { price: p.length % 2 ? p[m] : (p[m - 1] + p[m]) / 2, count: p.length };
}
function costCalc(k, items) {
  if (!k.meat || !items) return k;
  const food = items.filter((i) => (i.category || 'food') === 'food').map((i) => ({ ...i, n: norm(i.name) }));
  k.med = meatMedian(food);
  k.meat.forEach((m) => {
    m.cost = itemCost(findItem(food, m.name), m.g, m.pcs);
    if (m.cost == null && k.med) { m.cost = (m.g / 1000) * k.med.price; m.median = true; }
  });
  [...k.sides, ...k.laz].forEach((s) => { s.cost = itemCost(findItem(food, s.name), s.g); });
  k.salads.forEach((s) => { s.cost = itemCost(findItem(food, s.name), 0, s.cnt); });
  k.breads.forEach((s) => { s.cost = itemCost(findItem(food, s.name), 0, s.cnt * BREAD_PCS); });
  k.priced = true;
  return k;
}

const sumCost = (rows) => rows.reduce((s, x) => s + (x.cost || 0), 0);
function calcView(k) {
  const money = (x) => (x.cost != null ? `<span class="cost">${x.median ? '≈ ' : ''}${eur(x.cost)}</span>` : '');
  const krow = (name, v, sub, cost = '', cls = '') => `<div class="krow ${cls}"><span>${esc(name)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span><span class="v">${esc(v)}${cost}</span></div>`;
  const group = (title, right, rows) => `<div class="kgroup"><div class="khead"><span>${esc(title)}</span><span>${esc(right)}</span></div>${rows}</div>`;
  const right = (qty, rows) => { const c = sumCost(rows); return c ? `${qty} · ${eur(c)}` : qty; };
  const lower = (rows) => rows.filter((x) => x.cnt).map((x) => `${x.name.replace(' 4 vrste sira', '').toLowerCase()} ${x.cnt}`).join(' · ');
  // 1. Za ponijeti
  const tiles = [];
  if (k.meat) {
    tiles.push([k.banjice, plural(k.banjice, 'banjica', 'banjice', 'banjica'), 'meso i prilozi']);
    if (k.lazanjere) tiles.push([k.lazanjere, plural(k.lazanjere, 'lazanjera', 'lazanjere', 'lazanjera'), lower(k.laz)]);
    tiles.push([k.saladN, plural(k.saladN, 'salata', 'salate', 'salata'), lower(k.salads)]);
    tiles.push([k.breadN, `${plural(k.breadN, 'krug', 'kruga', 'krugova')} lepinjica`, lower(k.breads)]);
    if (k.soupL) tiles.push([`${num(k.soupL, 1)} l`, 'juhe', '3 vrste']);
    if (k.cakes) tiles.push([k.cakes, plural(k.cakes, 'kolač', 'kolača', 'kolača'), 'domaći']);
  }
  const takeRows = [];
  if (k.cutlery) takeRows.push(group('Beštek', `${k.n} ${plural(k.n, 'osoba', 'osobe', 'osoba')}`, ['Tanjuri', 'Vilice', 'Noževi', 'Čaše', 'Salvete'].map((t) => krow(t, String(k.n))).join('')));
  if (k.tables || k.barTables) takeRows.push(group('Stolovi', '', (k.tables ? krow('Stol + stolnjak', String(k.tables)) : '') + (k.barTables ? krow('Barski stol + presvlaka', String(k.barTables)) : '')));
  const take = tiles.length || takeRows.length ? `
    <div class="section-title">Za ponijeti</div>
    <div class="kcard take">
      ${tiles.length ? `<div class="tiles">${tiles.map(([n, label, sub]) => `<div class="tile"><b>${esc(n)}</b><span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`).join('')}</div>` : ''}
      ${takeRows.join('')}
    </div>` : '';
  // 2. Naplatiti: samo ukupno, stavke na dodir
  const pay = k.lines.length ? `
    <div class="section-title">Naplatiti</div>
    <details class="kcard pay">
      <summary><span class="big">${eur(k.total)}</span><span class="more">Stavke${ICON.chev}</span></summary>
      ${k.lines.map(([t, sub, v]) => krow(t, eur(v), sub)).join('')}
    </details>` : '';
  // 3. Za kupiti, s cijenama iz Nabavke
  let buy = '';
  if (k.meat) {
    const all = [...k.meat, ...k.sides, ...k.laz, ...k.salads, ...k.breads];
    const missing = all.filter((x) => x.cost == null).length + (k.soupL ? 1 : 0) + (k.cakes ? 1 : 0);
    const total = sumCost(all);
    let note = 'Cijene iz Nabavke (Food), bez PDV-a.';
    if (!k.priced) note = 'Učitavam cijene iz Nabavke…';
    else if (!total) note = 'Cijene će se pokazati kad artikle s cijenom dodaš u Nabavku (Food).';
    else {
      if (missing) note += ` ${missing} ${plural(missing, 'stavka nema', 'stavke nemaju', 'stavki nema')} cijenu.`;
      if (k.meat.some((m) => m.median)) note += ` ≈ meso bez svog artikla, po medijanu mesa ${eur(k.med.price)}/kg.`;
    }
    buy = `<div class="section-title">Za kupiti</div><div class="kcard">
      ${group('Meso', right(kgTxt(k.meatG), k.meat), k.meat.map((m) => (m.pcs ? krow(m.name, `${m.pcs} kom`, `${m.pcs} × ${m.piece} g = ${kgTxt(m.g)}${m.from ? ` ${m.from}` : ''}`, money(m)) : krow(m.name, kgTxt(m.g), '', money(m)))).join(''))}
      ${group('Prilozi', right(kgTxt(k.sideG), [...k.sides, ...k.laz]), [...k.sides.map((s) => krow(s.name, kgTxt(s.g), '', money(s))), ...k.laz.map((s) => krow(s.name, kgTxt(s.g), `${s.cnt} ${plural(s.cnt, 'lazanjera', 'lazanjere', 'lazanjera')}`, money(s)))].join(''))}
      ${group('Salate', right(`${k.saladN} ${plural(k.saladN, 'salata', 'salate', 'salata')}`, k.salads), k.salads.map((s) => krow(s.name, `× ${s.cnt}`, '', money(s))).join(''))}
      ${group('Lepinjice', right(krug(k.breadN), k.breads), k.breads.map((s) => krow(s.name, krug(s.cnt), `${s.cnt * BREAD_PCS} kom`, money(s))).join(''))}
      ${k.soupL ? group('Predjelo', '', krow(k.P.soup, `${num(k.soupL, 1)} l`, `${num(SOUP_DL, 1)} dl po osobi`)) : ''}
      ${k.cakes ? group('Desert', '', krow(k.P.dessert, `${k.cakes} kom`, `${CAKES} po osobi`)) : ''}
      ${krow('Ukupno za kupiti', total ? eur(total) : '—', '', '', 'total')}
      <div class="knote">${esc(note)}</div>
    </div>`;
  }
  return take + pay + buy;
}

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
              <span>${ICON.people}${c.people ?? '–'}</span>
              <span class="${c.event_time ? '' : 'unset'}">${ICON.clock}${c.event_time ? fmtTime(c.event_time) : '--:--'}</span>
              ${c.package ? `<span class="ptag">${n >= 3 ? 'P' : 'Paket '}${c.package}</span>` : ''}
            </span>
            ${c.location ? `<span class="loc">${ICON.pin}<span class="one">${esc(c.location)}</span></span>` : ''}
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

let cateringTab = 'next'; // 'next' | 'past', pamti se dok je aplikacija otvorena
async function renderCateringList() {
  loading('Catering', '/');
  try {
    const rows = await q(sb.from('caterings').select('id, event_date, event_time, people, title, location, package').order('event_date').order('event_time', { nullsFirst: false }));
    const t = todayStr();
    const tabs = { next: groupByDate(rows.filter((r) => r.event_date >= t)), past: groupByDate(rows.filter((r) => r.event_date < t)).reverse() };
    const count = (days) => days.reduce((s, [, ev]) => s + ev.length, 0);
    const list = () => {
      const days = tabs[cateringTab];
      if (!days.length) return `<div class="empty">${cateringTab === 'past' ? 'Nema prošlih cateringa.' : 'Nema nadolazećih cateringa.<br>Dodaj novi na +'}</div>`;
      return `<div class="list">${days.map(([d, ev]) => dayCard(d, ev, cateringTab === 'past')).join('')}</div>`;
    };
    screen({
      title: 'Catering', back: '/', action: '/catering/new',
      body: `
        <div class="seg ${cateringTab === 'past' ? 'right' : ''}">
          <button type="button" data-tab="next" class="${cateringTab === 'next' ? 'on' : ''}">Nadolazeći<span class="c">${count(tabs.next)}</span></button>
          <button type="button" data-tab="past" class="${cateringTab === 'past' ? 'on' : ''}">Prošli<span class="c">${count(tabs.past)}</span></button>
        </div>
        <div id="clist">${list()}</div>`,
    });
    const seg = app.querySelector('.seg');
    seg.onclick = (e) => {
      const b = e.target.closest('[data-tab]');
      if (!b || b.dataset.tab === cateringTab) return;
      cateringTab = b.dataset.tab;
      seg.classList.toggle('right', cateringTab === 'past');
      seg.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === b));
      document.getElementById('clist').innerHTML = list();
    };
  } catch (e) { failed('Catering', '/', e); }
}

const loadItems = () => sb.from('items').select('name, unit, price_net, category, updated_at').then((r) => r.data || [], () => []);
// broj mobitela u kontaktu postaje poveznica za poziv
const telLink = (s) => esc(s).replace(/\+?\d[\d\s/-]{5,}\d/g, (m) => `<a href="tel:${m.replace(/[^\d+]/g, '')}">${m}</a>`);

async function renderCateringDetail(id) {
  loading('Catering', '/catering');
  try {
    const [c, items] = await Promise.all([q(sb.from('caterings').select('*').eq('id', id).single()), loadItems()]);
    const d = parseDate(c.event_date);
    const info = [
      c.location && [ICON.pin, 'Lokacija', esc(c.location)],
      c.contact && [ICON.phone, 'Kontakt', telLink(c.contact)],
      c.description && [ICON.note, 'Opis i napomene', esc(c.description)],
      c.platters && [ICON.note, 'Banjice', esc(c.platters)],
      c.extras && [ICON.note, 'Dodatno', esc(c.extras)],
    ].filter(Boolean);
    screen({
      title: c.title || 'Catering', back: '/catering',
      body: `
        <div class="hero">
          <div class="bigdate">${d.getDate()}. ${MONTHS[d.getMonth()]}</div>
          <div class="muted">${DAYS_FULL[d.getDay()]}, ${fmtDateShort(c.event_date)}</div>
          <div class="chips">
            ${c.package ? `<span class="chip gold">Paket ${c.package}</span>` : ''}
            ${c.event_time ? `<span class="chip">${ICON.clock}${fmtTime(c.event_time)}</span>` : ''}
            ${c.people ? `<span class="chip">${ICON.people}${c.people} ${plural(c.people, 'osoba', 'osobe', 'osoba')}</span>` : ''}
          </div>
          ${info.length ? `<div class="hinfo">${info.map(([ic, label, v]) => `<div class="hrow">${ic}<div class="hv"><div class="label">${label}</div><div class="value">${v}</div></div></div>`).join('')}</div>` : ''}
        </div>
        ${calcView(costCalc(cateringCalc(c), items))}
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

function pkgButton(p, selected) {
  const P = PACKAGES[p];
  const sides = P.sides.length + P.laz.length;
  return `
    <button type="button" class="pkg tap ${Number(selected) === p ? 'on' : ''}" data-pkg="${p}" aria-pressed="${Number(selected) === p}">
      <span class="pn">Paket ${p}</span>
      <span class="pp">${num(P.price)} €<small> / osoba</small></span>
      <span class="pd">${P.meat.length} ${plural(P.meat.length, 'vrsta', 'vrste', 'vrsta')} mesa · ${sides} ${plural(sides, 'prilog', 'priloga', 'priloga')}<br>${P.salads.length} ${plural(P.salads.length, 'salata', 'salate', 'salata')}${P.soup ? ' · juha · desert' : ''}</span>
    </button>`;
}
const stepper = (name, title, sub, v) => `
  <div class="xrow">
    <span class="xt">${title}<small>${sub}</small></span>
    <span class="stepper"><button type="button" class="tap" data-step="${name}" data-d="-1" aria-label="Manje">−</button><output id="o_${name}">${v || 0}</output><button type="button" class="tap" data-step="${name}" data-d="1" aria-label="Više">+</button></span>
    <input type="hidden" name="${name}" value="${v || 0}">
  </div>`;

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
        <label>Lokacija<input name="location" value="${esc(c.location)}" placeholder="npr. Sala Luma, J.J. Strossmayera 271"></label>
        <label>Kontakt<input name="contact" value="${esc(c.contact)}" placeholder="ime i broj mobitela"></label>
        <div class="ftitle">Paket</div>
        <div class="pkgs">${[1, 2, 3, 4].map((p) => pkgButton(p, c.package)).join('')}</div>
        <input type="hidden" name="package" value="${esc(c.package)}">
        <label>Broj ljudi<input name="people" type="number" inputmode="numeric" min="0" value="${esc(c.people)}" placeholder="npr. 15"></label>
        <div class="xopts">
          <label class="xrow"><span class="xt">Beštek<small>tanjur, pribor, čaša, salveta · ${eur(EXTRA.cutlery)} po osobi</small></span><input type="checkbox" class="sw" name="cutlery" ${c.cutlery ? 'checked' : ''}></label>
          ${stepper('tables', 'Stol + stolnjak', `${eur(EXTRA.table)} po stolu`, c.tables)}
          ${stepper('bar_tables', 'Barski stol + presvlaka', `${eur(EXTRA.barTable)} po stolu`, c.bar_tables)}
        </div>
        <div id="calc"></div>
        <label>Opis i napomene<textarea name="description" style="min-height:140px" placeholder="posebni zahtjevi, alergije, pizze, napomene…">${esc(desc)}</textarea></label>
        <div class="err" id="err"></div>
        <button class="btn tap" type="submit">Spremi</button>
      </form>`,
  });
  const f = document.getElementById('f');
  let items = null;
  const state = () => ({
    package: Number(f.elements.package.value) || null, people: numVal(f, 'people'), cutlery: f.elements.cutlery.checked,
    tables: Number(f.elements.tables.value) || 0, bar_tables: Number(f.elements.bar_tables.value) || 0,
  });
  const redraw = () => {
    const s = state();
    const box = document.getElementById('calc');
    if (s.package && !s.people) { box.innerHTML = '<p class="muted small center">Upiši broj ljudi i odmah vidiš što treba ponijeti i kupiti.</p>'; return; }
    box.innerHTML = calcView(costCalc(cateringCalc(s), items));
  };
  f.addEventListener('click', (e) => {
    const p = e.target.closest('[data-pkg]');
    if (p) {
      const on = !p.classList.contains('on'); // ponovni dodir na odabrani paket ga poništava
      f.querySelectorAll('[data-pkg]').forEach((b) => { b.classList.toggle('on', on && b === p); b.setAttribute('aria-pressed', String(on && b === p)); });
      f.elements.package.value = on ? p.dataset.pkg : '';
      redraw();
      return;
    }
    const s = e.target.closest('[data-step]');
    if (s) {
      const inp = f.elements[s.dataset.step];
      inp.value = Math.max(0, Math.min(99, (Number(inp.value) || 0) + Number(s.dataset.d)));
      document.getElementById(`o_${s.dataset.step}`).textContent = inp.value;
      redraw();
    }
  });
  f.people.addEventListener('input', redraw);
  f.cutlery.addEventListener('change', redraw);
  redraw();
  loadItems().then((r) => { items = r; if (document.getElementById('calc')) redraw(); });
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const s = state();
    const row = {
      title: val(f, 'title'), event_date: val(f, 'event_date'), event_time: val(f, 'event_time'),
      people: s.people, location: val(f, 'location'), contact: val(f, 'contact'),
      description: val(f, 'description'), platters: null, extras: null,
      package: s.package, cutlery: s.cutlery, tables: s.tables, bar_tables: s.bar_tables,
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
      ${menuBtn('/normativ', 'scale', 'green', 'Normativ', 'Sastojci i food cost svih jela')}
      ${menuBtn('/nabavka', 'cart', 'gold', 'Nabavka', 'Food, Drink, Chemical')}
    </div>`,
  });
}

/* ---------- NABAVKA: Food / Drink / Chemical, pa dobavljači i artikli ---------- */
const NCATS = {
  food: { name: 'Food', sub: 'Hrana', icon: 'utensils', color: 'green' },
  drink: { name: 'Drink', sub: 'Pića', icon: 'cup', color: 'gold' },
  chemical: { name: 'Chemical', sub: 'Kemija i potrošni', icon: 'spray', color: 'blue' },
};
const catChips = (type, name, selected) => Object.entries(NCATS).map(([k, c]) => `<label class="catchip"><input type="${type}" name="${name}" value="${k}" ${selected.includes(k) ? 'checked' : ''}><span>${c.name}</span></label>`).join('');
const pickLabel = (t) => `<div style="font-size:13px;font-weight:600;color:var(--muted);padding-left:4px;margin-bottom:8px">${t}</div>`;

async function renderNabavka() {
  loading('Nabavka', '/restoran');
  try {
    const [sups, items] = await Promise.all([q(sb.from('suppliers').select('id, categories')), q(sb.from('items').select('category'))]);
    const sub = (k) => {
      const s = sups.filter((x) => (x.categories || []).includes(k)).length;
      const i = items.filter((x) => x.category === k).length;
      return `${NCATS[k].sub} · ${s} ${plural(s, 'dobavljač', 'dobavljača', 'dobavljača')} · ${i} ${plural(i, 'artikl', 'artikla', 'artikala')}`;
    };
    screen({
      title: 'Nabavka', back: '/restoran', action: '/dobavljac/new',
      body: `
        <div class="menu">${Object.entries(NCATS).map(([k, c]) => menuBtn(`/nabavka/${k}`, c.icon, c.color, c.name, sub(k))).join('')}</div>
        <div class="actions"><button class="btn secondary tap" data-go="/artikli">Svi artikli i cijene</button></div>`,
    });
  } catch (e) { failed('Nabavka', '/restoran', e); }
}

async function renderNabCategory(cat) {
  const C = NCATS[cat];
  loading(C.name, '/nabavka');
  try {
    const rows = await q(sb.from('suppliers').select('id, name, items(category)').contains('categories', [cat]).order('name'));
    screen({
      title: C.name, back: '/nabavka', action: `/dobavljac/new?c=${cat}`,
      body: `
        <div class="section-title">Dobavljači</div>
        ${rows.length ? `<div class="group">${rows.map((s) => {
          const n = (s.items || []).filter((i) => i.category === cat).length;
          return `<button class="cell" data-go="/nabavka/${cat}/${s.id}">
            <span class="main"><span class="title one" style="display:block">${esc(s.name)}</span></span>
            <span class="muted nowrap">${n} ${plural(n, 'artikl', 'artikla', 'artikala')}</span>
            <span class="chev">${ICON.chev}</span>
          </button>`;
        }).join('')}</div>` : `<div class="empty">Nema dobavljača u ${C.name}.<br>Dodaj na + ili u dobavljaču označi ${C.name}.</div>`}`,
    });
  } catch (e) { failed(C.name, '/nabavka', e); }
}

function itemCell(i, showSupplier) {
  const gross = i.price_net != null ? i.price_net * (1 + (i.vat_rate || 0) / 100) : null;
  return `
    <button class="cell" data-go="/artikl/${i.id}">
      <span class="main">
        <span class="price-row"><span class="title one">${esc(i.name)}</span><span class="p">${eur(i.price_net)}<span class="muted" style="font-weight:400">/${esc(i.unit)}</span></span></span>
        <span class="meta price-row"><span class="one">${showSupplier ? `${NCATS[i.category]?.name || ''} · ${esc(i.suppliers?.name)} · ` : ''}s PDV-om ${eur(gross)}</span><span class="nowrap">${fmtStamp(i.updated_at)}</span></span>
      </span>
    </button>`;
}

async function renderSupplier(id, cat) {
  const back = cat ? `/nabavka/${cat}` : '/nabavka';
  loading('Dobavljač', back);
  try {
    const s = await q(sb.from('suppliers').select('*, items(*)').eq('id', id).single());
    const items = (s.items || []).filter((i) => !cat || i.category === cat).sort((a, b) => a.name.localeCompare(b.name, 'hr'));
    screen({
      title: s.name, back, action: `/artikl/new?s=${s.id}${cat ? `&c=${cat}` : ''}`,
      body: `
        ${s.contact || s.note ? `<div class="detail" style="margin-bottom:6px">
          ${s.contact ? `<div class="item"><div class="label">Kontakt</div><div class="value">${esc(s.contact)}</div></div>` : ''}
          ${s.note ? `<div class="item"><div class="label">Napomena</div><div class="value">${esc(s.note)}</div></div>` : ''}
        </div>` : ''}
        <div class="section-title">${cat ? `${NCATS[cat].name} · ` : ''}Artikli · cijene bez PDV-a</div>
        ${items.length ? `<div class="group">${items.map((i) => itemCell(i)).join('')}</div>` : '<div class="empty">Nema artikala. Dodaj na +</div>'}
        <div class="actions"><button class="btn secondary tap" data-go="/dobavljac/${s.id}/edit${cat ? `?c=${cat}` : ''}">Uredi dobavljača</button></div>`,
    });
  } catch (e) { failed('Dobavljač', back, e); }
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

async function renderSupplierForm(id, cat) {
  let s = { categories: [cat || 'food'] };
  if (id) { try { s = await q(sb.from('suppliers').select('*').eq('id', id).single()); } catch (e) { toast(errText(e)); } }
  const back = id ? (cat ? `/nabavka/${cat}/${id}` : `/nabavka/${id}`) : (cat ? `/nabavka/${cat}` : '/nabavka');
  screen({
    title: id ? 'Uredi dobavljača' : 'Novi dobavljač', back,
    body: `
      <form id="f">
        <label>Naziv<input name="name" value="${esc(s.name)}" required></label>
        <div>${pickLabel('Gdje se prikazuje (može više)')}<div class="catpick">${catChips('checkbox', 'categories', s.categories || [])}</div></div>
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
    const categories = [...f.querySelectorAll('input[name=categories]:checked')].map((x) => x.value);
    if (!categories.length) { document.getElementById('err').textContent = 'Označi barem jedno: Food, Drink ili Chemical.'; return; }
    const row = { name: val(f, 'name'), contact: val(f, 'contact'), note: val(f, 'note'), categories };
    const to = (sid) => `/nabavka/${categories.includes(cat) ? cat : categories[0]}/${sid}`;
    try {
      if (id) { await q(sb.from('suppliers').update(row).eq('id', id)); go(to(id)); }
      else { const r = await q(sb.from('suppliers').insert(row).select('id').single()); go(to(r.id)); }
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

async function renderItemForm(id, supplierId, cat) {
  let i = { unit: 'kg', vat_rate: 25, supplier_id: supplierId, category: cat };
  let suppliers = [];
  try {
    suppliers = await q(sb.from('suppliers').select('id, name, categories').order('name'));
    if (id) i = await q(sb.from('items').select('*').eq('id', id).single());
  } catch (e) { toast(errText(e)); }
  if (!NCATS[i.category]) i.category = suppliers.find((s) => s.id === i.supplier_id)?.categories?.[0] || 'food';
  const back = i.supplier_id ? `/nabavka/${i.category}/${i.supplier_id}` : '/nabavka';
  screen({
    title: id ? 'Uredi artikl' : 'Novi artikl', back,
    body: `
      <form id="f">
        <label>Naziv artikla<input name="name" value="${esc(i.name)}" required placeholder="npr. Svinjski vrat"></label>
        <label>Dobavljač<select name="supplier_id" required>${suppliers.map((s) => `<option value="${s.id}" ${s.id === i.supplier_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <div>${pickLabel('Kategorija')}<div class="catpick">${catChips('radio', 'category', [i.category])}</div></div>
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
    const row = { name: val(f, 'name'), supplier_id: val(f, 'supplier_id'), category: f.elements.category.value || 'food', price_net: numVal(f, 'price_net'), unit: val(f, 'unit'), vat_rate: numVal(f, 'vat_rate') };
    if (row.price_net != null && isNaN(row.price_net)) { document.getElementById('err').textContent = 'Cijena nije broj.'; return; }
    try {
      if (id) await q(sb.from('items').update(row).eq('id', id));
      else await q(sb.from('items').insert(row));
      // dobavljač se mora prikazivati u kategoriji svog artikla
      const sup = suppliers.find((s) => s.id === row.supplier_id);
      if (sup && !(sup.categories || []).includes(row.category)) await q(sb.from('suppliers').update({ categories: [...(sup.categories || []), row.category] }).eq('id', sup.id));
      toast('Spremljeno'); go(`/nabavka/${row.category}/${row.supplier_id}`);
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

async function renderDish(id, from) {
  const back = from === 'n' ? '/normativ' : '/jelovnik';
  loading('Jelo', back);
  try {
    const d = await q(sb.from('dishes').select('*, dish_ingredients(*, items(name, price_net, unit, suppliers(name)))').eq('id', id).single());
    const ings = (d.dish_ingredients || []).sort((a, b) => a.sort - b.sort);
    const { cost, missing } = dishCost(d);
    const priceLine = (label, p) => `<div class="price-row" style="margin-top:6px"><span>${label}</span><span class="p">${eur(p)} ${factorBadge(p, d.vat_rate, cost)}</span></div>`;
    screen({
      title: d.name, back,
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
  } catch (e) { failed('Jelo', back, e); }
}

async function renderNormativ() {
  loading('Normativ', '/restoran');
  try {
    const rows = await q(sb.from('dishes').select('id, name, category, dish_ingredients(name, qty, unit, sort, items(price_net, unit))').order('sort').order('name'));
    if (!rows.length) {
      screen({ title: 'Normativ', back: '/restoran', body: '<div class="empty">Još nema jela.<br>Normativ se upisuje uz svako jelo u Jelovniku.</div><div class="actions"><button class="btn secondary tap" data-go="/jelovnik">Otvori Jelovnik</button></div>' });
      return;
    }
    const without = rows.filter((d) => !(d.dish_ingredients || []).length).length;
    screen({
      title: 'Normativ', back: '/restoran',
      body: `
        <input id="s" type="search" placeholder="Traži jelo ili sastojak…" style="margin-bottom:8px">
        <p class="muted small" style="margin:0 4px 12px">${rows.length} jela · ${without ? `${without} bez normativa` : 'sva imaju normativ'} · food cost za 1 porciju</p>
        <div id="l"></div>`,
    });
    const l = document.getElementById('l');
    const draw = (t) => {
      const n = norm(t);
      const list = rows.filter((d) => !n || norm(d.name).includes(n) || (d.dish_ingredients || []).some((g) => norm(g.name).includes(n)));
      const groups = {};
      list.forEach((d) => { (groups[d.category || 'Ostalo'] ||= []).push(d); });
      l.innerHTML = list.length ? Object.entries(groups).map(([cat, ds]) => `
        <div class="section-title">${esc(cat)}</div>
        <div class="group">${ds.map((d) => {
          const ings = (d.dish_ingredients || []).sort((a, b) => a.sort - b.sort);
          const { cost, missing } = dishCost(d);
          return `
          <button class="cell" data-go="/jelo/${d.id}?b=n">
            <span class="main">
              <span class="price-row"><span class="title one">${esc(d.name)}</span><span class="p">${cost != null ? eur(cost) : ''}</span></span>
              <span class="meta">${ings.length ? ings.map((g) => `${esc(g.name)} ${num(g.qty, 3)} ${esc(g.unit)}`).join(' · ') + (missing ? ` · <span class="overdue">${missing} bez cijene</span>` : '') : '<span class="overdue">Normativ nije upisan</span>'}</span>
            </span>
            <span class="chev">${ICON.chev}</span>
          </button>`;
        }).join('')}</div>`).join('') : '<div class="empty" style="margin-top:14px">Ništa nije pronađeno.</div>';
    };
    document.getElementById('s').oninput = (e) => draw(e.target.value);
    draw('');
  } catch (e) { failed('Normativ', '/restoran', e); }
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
    case 'normativ': return renderNormativ();
    case 'nabavka':
      if (!p[1]) return renderNabavka();
      if (!NCATS[p[1]]) return renderSupplier(p[1]); // stara poveznica bez kategorije
      return p[2] ? renderSupplier(p[2], p[1]) : renderNabCategory(p[1]);
    case 'artikli': return renderAllItems();
    case 'dobavljac': return renderSupplierForm(p[1] === 'new' ? null : p[1], NCATS[params.get('c')] ? params.get('c') : null);
    case 'artikl': return p[1] === 'new' ? renderItemForm(null, params.get('s'), NCATS[params.get('c')] ? params.get('c') : null) : renderItemForm(p[1]);
    case 'jelo':
      if (p[1] === 'new') return renderDishForm();
      if (p[2] === 'edit') return renderDishForm(p[1]);
      return renderDish(p[1], params.get('b'));
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
