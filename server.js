// همسه: anonymous messages with reply threads. No dependencies. Node 18+.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data.json');
const PUB = require('fs').existsSync(path.join(__dirname, 'public')) ? path.join(__dirname, 'public') : __dirname;
let db = { users: {}, threads: {}, sessions: {}, outbox: [], resets: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch {}
db.outbox = db.outbox || []; db.resets = db.resets || {};
const SITE_NAME = process.env.SITE_NAME || 'همسه'; // change the site name here or via env
const BASE = process.env.BASE_URL || 'http://localhost:' + PORT;
const DEV_OUTBOX = process.env.DEV_OUTBOX !== '0'; // local testing mailbox; turn off in production
let saveTimer; const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => fs.writeFileSync(DB_FILE, JSON.stringify(db)), 50); };
const rid = n => crypto.randomBytes(n).toString('base64url');
const code = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (const b of crypto.randomBytes(10)) s += a[b % a.length]; return s.slice(0,5)+'-'+s.slice(5); };
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const hits = {}; // simple rate limit
const limited = (k, max, ms) => { const n = Date.now(); hits[k] = (hits[k] || []).filter(t => n - t < ms); if (hits[k].length >= max) return true; hits[k].push(n); return false; };
const send = (res, st, obj, hdr = {}) => { res.writeHead(st, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...hdr }); res.end(JSON.stringify(obj)); };
const body = req => new Promise((ok, no) => { let d = ''; req.on('data', c => { d += c; if (d.length > 600000) { no(); req.destroy(); } }); req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch { ok({}); } }); });
const cookie = req => Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map(c => c.split('=').map(decodeURIComponent)));
const me = req => { const s = db.sessions[cookie(req).sid]; return s && db.users[s.u] ? db.users[s.u] : null; };
const clean = (t, max) => String(t || '').replace(/\s+\n/g, '\n').trim().slice(0, max);
const img = v => typeof v === 'string' && v.length < 260000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(v);
const stats = un => { let got = 0, rep = 0, th = 0; for (const t of Object.values(db.threads)) if (t.to === un) { th++; got += t.msgs.filter(m => m.from === 'anon').length; rep += t.msgs.filter(m => m.from === 'owner').length; } return { received: got, replies: rep, threads: th }; };
const pub = u => ({ username: u.username, name: u.name, bio: u.bio, avatar: u.avatar || '', cover: u.cover || '', since: u.created || 0, views: u.views || 0, stats: stats(u.username) });
const ip = req => req.socket.remoteAddress;


// ---- Outgoing messages. Every message is saved to the local outbox. It is also really sent
// only when the matching secret is set in the environment (see README). Nothing is sent otherwise.
async function deliver(channel, to, subject, text) {
  const e = { id: rid(6), t: Date.now(), channel, to, subject, text, status: 'محفوظ محلياً (لم يُرسل فعلياً)' };
  try {
    if (channel === 'email' && process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text }) });
      e.status = r.ok ? 'أُرسل' : 'فشل الإرسال';
    } else if (channel === 'telegram' && process.env.TELEGRAM_BOT_TOKEN) {
      const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: to, text: subject + '\n' + text }) });
      e.status = r.ok ? 'أُرسل' : 'فشل الإرسال';
    } else if (channel === 'whatsapp' && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
      const r = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.WHATSAPP_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: subject + '\n' + text } }) });
      e.status = r.ok ? 'أُرسل' : 'فشل الإرسال';
    }
  } catch { e.status = 'فشل الإرسال'; }
  db.outbox.unshift(e); db.outbox = db.outbox.slice(0, 200); save(); return e;
}
function notify(u, kind, text) {
  const n = u.notify || {}; if (kind === 'new' && n.onMessage === false) return; if (kind === 'follow' && n.onFollowup === false) return;
  const subject = kind === 'new' ? 'وصلتك رسالة مجهولة جديدة' : 'وصلك رد جديد في محادثة مجهولة';
  const body = text + '\n' + BASE + '/#/inbox';   // message text is NOT included, only a link
  if (n.email && u.email) deliver('email', u.email, subject, body);
  if (n.telegram) deliver('telegram', n.telegram, subject, body);
  if (n.whatsapp) deliver('whatsapp', n.whatsapp, subject, body);
}
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

async function api(req, res, url) {
  const m = req.method, p = url.pathname, u = me(req);
  const b = m === 'POST' ? await body(req) : {};
  if (p === '/api/config') return send(res, 200, { name: SITE_NAME });
  if (p === '/api/signup' && m === 'POST') {
    const un = clean(b.username, 20).toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(un)) return send(res, 400, { error: 'اسم المستخدم لازم يكون ٣ إلى ٢٠ حرف إنجليزي أو أرقام أو _' });
    if (String(b.password || '').length < 6) return send(res, 400, { error: 'كلمة السر لازم تكون ٦ حروف على الأقل' });
    if (db.users[un]) return send(res, 409, { error: 'اسم المستخدم ده مستخدم قبل كده' });
    if (limited('su' + ip(req), 10, 3600e3)) return send(res, 429, { error: 'محاولات كتير، جرب بعد شوية' });
    const salt = rid(8);
    const em = clean(b.email, 100).toLowerCase(); if (em && !emailOk(em)) return send(res, 400, { error: 'الإيميل مش مظبوط' });
    if (em && Object.values(db.users).some(x => x.email === em)) return send(res, 409, { error: 'الإيميل ده مستخدم قبل كده' });
    db.users[un] = { username: un, name: clean(b.name, 40) || un, bio: '', salt, pw: hash(b.password, salt), blocked: [], open: true, created: Date.now(), email: em, notify: { email: !!em, onMessage: true, onFollowup: true } };
    return login(res, un);
  }
  if (p === '/api/login' && m === 'POST') {
    const un = clean(b.username, 20).toLowerCase(), x = db.users[un];
    if (limited('li' + ip(req) + un, 8, 600e3)) return send(res, 429, { error: 'محاولات كتير، جرب بعد شوية' });
    if (!x || hash(String(b.password || ''), x.salt) !== x.pw) return send(res, 401, { error: 'اسم المستخدم أو كلمة السر غلط' });
    return login(res, un);
  }
  if (p === '/api/logout' && m === 'POST') { delete db.sessions[cookie(req).sid]; save(); return send(res, 200, { ok: 1 }, { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' }); }
  if (p === '/api/me') return u ? send(res, 200, { ...pub(u), open: u.open, email: u.email || '' }) : send(res, 401, { error: 'auth' });
  if (p === '/api/forgot' && m === 'POST') {
    const id = clean(b.id, 100).toLowerCase();
    if (limited('fg' + ip(req), 5, 3600e3)) return send(res, 429, { error: 'محاولات كتير، جرب بعد شوية' });
    const x = db.users[id] || Object.values(db.users).find(q => q.email && q.email === id);
    if (x && x.email) { const tok = rid(24); db.resets[crypto.createHash('sha256').update(tok).digest('hex')] = { u: x.username, exp: Date.now() + 3600e3 };
      deliver('email', x.email, 'استرجاع كلمة السر في همسه', 'ادخل على اللينك ده لتغيير كلمة السر (صالح لمدة ساعة):\n' + BASE + '/#/reset/' + tok + '\nلو مش أنت اللي طلبت، تجاهل الرسالة.'); }
    return send(res, 200, { ok: 1 }); // same answer whether or not the account exists
  }
  if (p === '/api/reset' && m === 'POST') {
    const k = crypto.createHash('sha256').update(String(b.token || '')).digest('hex'), r0 = db.resets[k];
    if (!r0 || r0.exp < Date.now()) return send(res, 400, { error: 'اللينك منتهي أو غير صحيح' });
    if (String(b.password || '').length < 6) return send(res, 400, { error: 'كلمة السر لازم تكون ٦ حروف على الأقل' });
    const x = db.users[r0.u]; x.salt = rid(8); x.pw = hash(b.password, x.salt); delete db.resets[k];
    for (const [sid, ss] of Object.entries(db.sessions)) if (ss.u === x.username) delete db.sessions[sid];
    save(); return send(res, 200, { ok: 1 });
  }
  if (p === '/api/password' && m === 'POST') {
    if (!u) return send(res, 401, { error: 'auth' });
    if (hash(String(b.old || ''), u.salt) !== u.pw) return send(res, 400, { error: 'كلمة السر الحالية غلط' });
    if (String(b.password || '').length < 6) return send(res, 400, { error: 'كلمة السر الجديدة لازم تكون ٦ حروف على الأقل' });
    u.salt = rid(8); u.pw = hash(b.password, u.salt); save(); return send(res, 200, { ok: 1 });
  }
  if (p === '/api/notify') {
    if (!u) return send(res, 401, { error: 'auth' });
    if (m === 'POST') {
      const em = clean(b.email, 100).toLowerCase(); if (em && !emailOk(em)) return send(res, 400, { error: 'الإيميل مش مظبوط' });
      if (em && Object.values(db.users).some(q => q.email === em && q !== u)) return send(res, 409, { error: 'الإيميل ده مستخدم قبل كده' });
      u.email = em; u.notify = { email: !!b.nEmail && !!em, telegram: clean(b.telegram, 40).replace(/[^0-9-]/g, ''), whatsapp: clean(b.whatsapp, 20).replace(/[^0-9]/g, ''), onMessage: b.onMessage !== false, onFollowup: b.onFollowup !== false };
      save();
    }
    return send(res, 200, { ...(u.notify || {}), email: u.email || '', nEmail: !!(u.notify || {}).email, live: { email: !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM), telegram: !!process.env.TELEGRAM_BOT_TOKEN, whatsapp: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) } });
  }
  if (p === '/api/notify/test' && m === 'POST') {
    if (!u) return send(res, 401, { error: 'auth' });
    const before = db.outbox.length; notify(u, 'new', 'ده إشعار تجريبي من همسه.'); await new Promise(r => setTimeout(r, 300));
    return send(res, 200, { sent: db.outbox.length - before });
  }
  if (p === '/api/dev/outbox') return DEV_OUTBOX ? send(res, 200, { outbox: db.outbox }) : send(res, 404, { error: 'off' });
  if (p === '/api/profile' && m === 'POST') {
    if (!u) return send(res, 401, { error: 'auth' });
    u.name = clean(b.name, 40) || u.username; u.bio = clean(b.bio, 200); u.open = b.open !== false;
    for (const k of ['avatar', 'cover']) { if (b[k] === '') delete u[k]; else if (b[k] !== undefined) { if (!img(b[k])) return send(res, 400, { error: 'الصورة لازم تكون JPG أو PNG وحجمها أقل من 250KB' }); u[k] = b[k]; } }
    save();
    return send(res, 200, pub(u));
  }
  let r;
  if ((r = p.match(/^\/api\/u\/([a-z0-9_]+)$/))) { const x = db.users[r[1]]; if (x && !me(req)) { x.views = (x.views || 0) + 1; save(); } return x ? send(res, 200, { ...pub(x), open: x.open }) : send(res, 404, { error: 'مفيش حد بالاسم ده' }); }
  if ((r = p.match(/^\/api\/u\/([a-z0-9_]+)\/send$/)) && m === 'POST') {
    const x = db.users[r[1]]; if (!x) return send(res, 404, { error: 'مفيش حد بالاسم ده' });
    if (!x.open) return send(res, 403, { error: 'صاحب الصفحة قافل استقبال الرسايل دلوقتي' });
    const text = clean(b.text, 1000); if (!text) return send(res, 400, { error: 'اكتب رسالة الأول' });
    if (limited('sd' + ip(req), 15, 600e3)) return send(res, 429, { error: 'بتبعت بسرعة، استنى شوية' });
    const fp = crypto.createHash('sha256').update(ip(req) + 's').digest('hex').slice(0, 16);
    if ((x.blocked || []).includes(fp)) return send(res, 200, { code: code() }); // blocked senders look like success
    const c = code();
    db.threads[c] = { code: c, to: x.username, fp, created: Date.now(), starred: false, unread: true, msgs: [{ from: 'anon', text, t: Date.now() }] };
    save(); notify(x, 'new', 'وصلتك رسالة جديدة على همسه.'); return send(res, 200, { code: c });
  }
  if ((r = p.match(/^\/api\/t\/([A-Z0-9-]+)$/))) {
    const t = db.threads[r[1]]; if (!t) return send(res, 404, { error: 'الكود ده مش صحيح' });
    const x = db.users[t.to];
    if (m === 'POST') {
      const text = clean(b.text, 1000); if (!text) return send(res, 400, { error: 'اكتب رسالة الأول' });
      if (limited('tp' + ip(req), 30, 600e3)) return send(res, 429, { error: 'بتبعت بسرعة، استنى شوية' });
      t.msgs.push({ from: 'anon', text, t: Date.now() }); t.unread = true; save(); notify(x, 'follow', 'وصلك رد جديد من مرسل مجهول.');
    }
    t.senderSeen = Date.now(); if (m !== 'POST') save();
    return send(res, 200, { code: t.code, to: pub(x), msgs: t.msgs });
  }
  if (p === '/api/inbox') {
    if (!u) return send(res, 401, { error: 'auth' });
    const list = Object.values(db.threads).filter(t => t.to === u.username).sort((a, b) => b.msgs.at(-1).t - a.msgs.at(-1).t)
      .map(t => ({ id: t.code, last: t.msgs.at(-1), count: t.msgs.length, unread: t.unread, starred: t.starred, replied: t.msgs.some(q => q.from === 'owner') }));
    return send(res, 200, { threads: list });
  }
  if ((r = p.match(/^\/api\/inbox\/([A-Z0-9-]+)(\/(reply|star|block))?$/))) {
    if (!u) return send(res, 401, { error: 'auth' });
    const t = db.threads[r[1]]; if (!t || t.to !== u.username) return send(res, 404, { error: 'مش موجود' });
    if (m === 'DELETE') { delete db.threads[t.code]; save(); return send(res, 200, { ok: 1 }); }
    if (r[3] === 'reply' && m === 'POST') {
      const text = clean(b.text, 1000); if (!text) return send(res, 400, { error: 'اكتب الرد الأول' });
      t.msgs.push({ from: 'owner', text, t: Date.now() });
    } else if (r[3] === 'star' && m === 'POST') t.starred = !t.starred;
    else if (r[3] === 'block' && m === 'POST') { (u.blocked = u.blocked || []).push(t.fp); delete db.threads[t.code]; save(); return send(res, 200, { ok: 1 }); }
    else if (m === 'GET') t.unread = false;
    save(); return send(res, 200, { id: t.code, msgs: t.msgs, starred: t.starred });
  }
  send(res, 404, { error: 'not found' });
}
function login(res, un) { const sid = rid(24); db.sessions[sid] = { u: un, t: Date.now() }; save(); send(res, 200, { username: un }, { 'Set-Cookie': `sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` }); }

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let f = url.pathname === '/app.js' || url.pathname === '/style.css' ? url.pathname : '/index.html';
    const data = fs.readFileSync(path.join(PUB, f));
    res.writeHead(200, { 'Content-Type': types[path.extname(f)], 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }); res.end(data);
  } catch (e) { res.writeHead(500); res.end('error'); }
}).listen(PORT, () => console.log('http://localhost:' + PORT));
