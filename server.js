// همسه: anonymous messages with reply threads. No dependencies. Node 18+.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data.json');
const PUB = fs.existsSync(path.join(__dirname, 'public')) ? path.join(__dirname, 'public') : __dirname;
let db = { users: {}, threads: {}, sessions: {}, outbox: [], resets: {}, secret: '' };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch {}
db.outbox = db.outbox || []; db.resets = db.resets || {}; db.secret = db.secret || crypto.randomBytes(32).toString('hex');
const SITE_NAME = process.env.SITE_NAME || 'همسه'; // change the site name here or via env
const BASE = process.env.BASE_URL || 'http://localhost:' + PORT;
const HTTPS = BASE.startsWith('https://');
const DEV_OUTBOX = process.env.DEV_OUTBOX ? process.env.DEV_OUTBOX !== '0' : !HTTPS; // local testing mailbox; off in production
let saveTimer;
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\s+/g, '').replace(/\/$/, ''), SB_KEY = (process.env.SUPABASE_SERVICE_KEY || '').replace(/\s+/g, '');
const remote = async (method, q, payload) => { const r = await fetch(SB_URL + '/rest/v1/kv' + q, { method, headers: { apikey: SB_KEY, ...(SB_KEY.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + SB_KEY }), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }, body: payload ? JSON.stringify(payload) : undefined }); if (!r.ok) throw new Error('remote ' + r.status); return method === 'GET' ? r.json() : null; };
let remoteBusy = false, remoteDirty = false;
const flushRemote = async () => { if (!SB_URL) return; if (remoteBusy) { remoteDirty = true; return; } remoteBusy = true; try { await remote('POST', '', { id: 'db', data: db }); } catch (e) { console.error('remote save failed', e.message); } remoteBusy = false; if (remoteDirty) { remoteDirty = false; flushRemote(); } };
const flush = () => { metrics.lastSave = Date.now(); flushRemote(); try { fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db)); fs.renameSync(DB_FILE + '.tmp', DB_FILE); } catch (e) { console.error('save failed', e.message); } }; // atomic write
const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 50); };
process.on('SIGTERM', async () => { flush(); await new Promise(r => setTimeout(r, 1500)); process.exit(0); });
process.on('uncaughtException', e => console.error('uncaught', e.message));
process.on('unhandledRejection', e => console.error('unhandled', e && e.message));
const rid = n => crypto.randomBytes(n).toString('base64url');
const code = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (const b of crypto.randomBytes(10)) s += a[b % a.length]; return s.slice(0,5)+'-'+s.slice(5); };
const hash = (pw, salt) => crypto.scryptSync(String(pw).slice(0, 200), salt, 32).toString('hex');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const sha = v => crypto.createHash('sha256').update(String(v)).digest('hex');
const DUMMY = { salt: 'x', pw: hash('dummy', 'x') }; // keeps login timing equal for unknown users
const SESSION_MS = 30 * 864e5;
const hits = {}; // simple rate limit
setInterval(() => { const n = Date.now(); for (const k of Object.keys(hits)) { hits[k] = hits[k].filter(t => n - t < 36e5); if (!hits[k].length) delete hits[k]; } for (const [k, s] of Object.entries(db.sessions)) if (n - s.t > SESSION_MS) delete db.sessions[k]; for (const [k, r] of Object.entries(db.resets)) if (r.exp < n) delete db.resets[k]; }, 600e3).unref();
const limited = (k, max, ms) => { const n = Date.now(); hits[k] = (hits[k] || []).filter(t => n - t < ms); if (hits[k].length >= max) return true; hits[k].push(n); return false; };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cross-Origin-Opener-Policy': 'same-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  ...(HTTPS ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}) };
const metrics = { started: Date.now(), requests: 0, errors: 0, lastSave: 0 };
const send = (res, st, obj, hdr = {}) => { if (st === 429 && admin) admin.bump('limited'); res.writeHead(st, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC, ...hdr }); res.end(JSON.stringify(obj)); };
const body = req => new Promise((ok, no) => { let d = '', n = 0; req.on('data', c => { n += c.length; if (n > 600000) { no(Object.assign(new Error('big'), { status: 413 })); req.destroy(); } else d += c; }); req.on('end', () => { try { const j = JSON.parse(d || '{}'); ok(j && typeof j === 'object' && !Array.isArray(j) ? j : {}); } catch { ok({}); } }); req.on('error', () => ok({})); });
const cookie = req => { const o = {}; for (const c of (req.headers.cookie || '').split(/;\s*/)) { const i = c.indexOf('='); if (i > 0) { try { o[c.slice(0, i)] = decodeURIComponent(c.slice(i + 1)); } catch {} } } return o; };
const me = req => { const sid = cookie(req).sid, s = sid && db.sessions[sha(sid)]; if (!s) return null; if (Date.now() - s.t > SESSION_MS) { delete db.sessions[sha(sid)]; return null; } const u = db.users[s.u]; return u && !u.banned ? u : null; };
const clean = (t, max) => String(t || '').replace(/\s+\n/g, '\n').trim().slice(0, max);
const img = v => typeof v === 'string' && v.length < 260000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(v);
const stats = un => { let got = 0, rep = 0, th = 0; for (const t of Object.values(db.threads)) if (t.to === un) { th++; got += t.msgs.filter(m => m.from === 'anon').length; rep += t.msgs.filter(m => m.from === 'owner').length; } return { received: got, replies: rep, threads: th }; };
const pub = u => ({ username: u.username, name: u.name, bio: u.bio, avatar: u.avatar || '', cover: u.cover || '', since: u.created || 0, views: u.views || 0, stats: stats(u.username) });
// Real client address behind Render/Cloudflare. Used ONLY for rate limits and the hidden block fingerprint, never stored in the clear.
let admin; // created in boot() after the database is loaded
const ip = req => String(req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress);
const fpOf = req => crypto.createHmac('sha256', db.secret).update(ip(req)).digest('hex').slice(0, 16);


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
  let r;
  const b = m === 'POST' ? await body(req) : {};
  if (p === '/api/config') return send(res, 200, { name: db.settings.siteName || SITE_NAME });
  if (p.startsWith('/api/admin/')) return admin.handle(req, res, p, m, b);
  if (p === '/api/signup' && m === 'POST') {
    if (!db.settings.registrationOpen) return send(res, 403, { error: 'التسجيل مقفول مؤقتاً' });
    const un = clean(b.username, 20).toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(un)) return send(res, 400, { error: 'اسم المستخدم لازم يكون ٣ إلى ٢٠ حرف إنجليزي أو أرقام أو _' });
    if (String(b.password || '').length < 6 || String(b.password).length > 200) return send(res, 400, { error: 'كلمة السر لازم تكون من ٦ لـ ٢٠٠ حرف' });
    if (limited('su' + ip(req), 10, 3600e3)) return send(res, 429, { error: 'محاولات كتير، جرب بعد شوية' });
    if (db.users[un]) return send(res, 409, { error: 'اسم المستخدم ده مستخدم قبل كده' });
    const salt = rid(16);
    const em = clean(b.email, 100).toLowerCase(); if (em && !emailOk(em)) return send(res, 400, { error: 'الإيميل مش مظبوط' });
    if (em && Object.values(db.users).some(x => x.email === em)) return send(res, 409, { error: 'الإيميل ده مستخدم قبل كده' });
    db.users[un] = { username: un, name: clean(b.name, 40) || un, bio: '', salt, pw: hash(b.password, salt), blocked: [], open: true, created: Date.now(), invitedBy: ((b.ref && Object.values(db.users).find(q => q.invite === String(b.ref).slice(0, 16) && !q.banned)) || {}).username || '', email: em, notify: { email: !!em, onMessage: true, onFollowup: true } };
    admin.bump('signups'); admin.feed('signup', '@' + un); if (db.users[un].invitedBy) { admin.bump('invitedSignups'); admin.feed('invited signup', '@' + un + ' ← @' + db.users[un].invitedBy); }
    return login(res, un);
  }
  if (p === '/api/login' && m === 'POST') {
    const idf = clean(b.username, 100).toLowerCase().replace(/^@/, ''), x = idf.includes('@') ? Object.values(db.users).find(q => q.email && q.email === idf) : db.users[idf], un = x ? x.username : idf.slice(0, 20);
    if (limited('li' + ip(req) + idf, 8, 600e3) || limited('lu' + idf, 30, 3600e3)) return send(res, 429, { error: 'محاولات كتير، جرب بعد شوية' });
    const y = x || DUMMY;
    if (!same(hash(b.password || '', y.salt), y.pw) || !x) { admin.bump('failedLogins'); return send(res, 401, { error: 'اسم المستخدم أو كلمة السر غلط' }); }
    if (x.banned) return send(res, 403, { error: 'الحساب ده موقوف' });
    return login(res, un);
  }
  if (p === '/api/invite' && m === 'GET') {
    if (!u) return send(res, 401, { error: 'auth' });
    if (!u.invite) { do { u.invite = rid(6); } while (Object.values(db.users).some(q => q !== u && q.invite === u.invite)); save(); }
    return send(res, 200, { code: u.invite, count: Object.values(db.users).filter(q => q.invitedBy === u.username).length, visits: u.inviteVisits || 0 });
  }
  if ((r = p.match(/^\/api\/invite\/([A-Za-z0-9_-]{4,16})$/)) && m === 'GET') {
    if (limited('iv' + ip(req), 30, 600e3)) return send(res, 429, { error: 'محاولات كتير' });
    const x = Object.values(db.users).find(q => q.invite === r[1] && !q.banned); if (x) { x.inviteVisits = (x.inviteVisits || 0) + 1; admin.bump('inviteVisits'); save(); }
    return x ? send(res, 200, { name: x.name }) : send(res, 404, { error: 'لينك الدعوة مش صحيح' });
  }
  if (p === '/api/logout' && m === 'POST') { delete db.sessions[sha(cookie(req).sid || '')]; save(); return send(res, 200, { ok: 1 }, { 'Set-Cookie': `sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${HTTPS ? '; Secure' : ''}` }); }
  if (p === '/api/me') return u ? send(res, 200, { ...pub(u), open: u.open, email: u.email || '', ogimg: !!u.ogimg }) : send(res, 401, { error: 'auth' });
  if (p === '/api/og-image' && m === 'POST') {
    if (!u) return send(res, 401, { error: 'auth' });
    const img = String(b.img || '');
    if (!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(img) || img.length > 400000) return send(res, 400, { error: 'الصورة مش مظبوطة' });
    u.ogimg = img; save(); return send(res, 200, { ok: 1 });
  }
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
    const x = db.users[r0.u]; x.salt = rid(16); x.pw = hash(b.password, x.salt); delete db.resets[k];
    for (const [sid, ss] of Object.entries(db.sessions)) if (ss.u === x.username) delete db.sessions[sid];
    save(); return send(res, 200, { ok: 1 });
  }
  if (p === '/api/password' && m === 'POST') {
    if (!u) return send(res, 401, { error: 'auth' });
    if (!same(hash(b.old || '', u.salt), u.pw)) return send(res, 400, { error: 'كلمة السر الحالية غلط' });
    if (String(b.password || '').length < 6 || String(b.password).length > 200) return send(res, 400, { error: 'كلمة السر الجديدة لازم تكون من ٦ لـ ٢٠٠ حرف' });
    if (limited('pw' + u.username, 10, 3600e3)) return send(res, 429, { error: 'محاولات كتير، جرب بعد شوية' });
    u.salt = rid(16); u.pw = hash(b.password, u.salt); save(); return send(res, 200, { ok: 1 });
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
  if ((r = p.match(/^\/api\/u\/([a-z0-9_]+)$/))) { const x = db.users[r[1]]; if (x && !me(req)) { x.views = (x.views || 0) + 1; admin.bump('views'); save(); } return x ? send(res, 200, { ...pub(x), open: x.open }) : send(res, 404, { error: 'مفيش حد بالاسم ده' }); }
  if ((r = p.match(/^\/api\/u\/([a-z0-9_]+)\/send$/)) && m === 'POST') {
    const x = db.users[r[1]]; if (!x) return send(res, 404, { error: 'مفيش حد بالاسم ده' });
    if (!x.open || x.banned || !db.settings.sendingOpen) return send(res, 403, { error: 'صاحب الصفحة قافل استقبال الرسايل دلوقتي' });
    const text = clean(b.text, 1000); if (!text) return send(res, 400, { error: 'اكتب رسالة الأول' });
    if (limited('sd' + ip(req), 15, 600e3)) return send(res, 429, { error: 'بتبعت بسرعة، استنى شوية' });
    const fp = fpOf(req);
    if (limited('rc' + x.username, db.settings.perRecipientPerHour, 3600e3)) return send(res, 429, { error: 'الصفحة دي جاتلها رسايل كتير، جرب بعد شوية' });
    if ((x.blocked || []).includes(fp) || db.bannedFp.includes(fp)) return send(res, 200, { code: code() }); // blocked senders look like success
    const c = code();
    db.threads[c] = { code: c, to: x.username, fp, created: Date.now(), starred: false, unread: true, msgs: [{ from: 'anon', text, t: Date.now() }] };
    if (admin.flagged(text)) db.threads[c].flagged = true;
    admin.bump('messages'); admin.feed('message', '@' + x.username);
    save(); notify(x, 'new', 'وصلتك رسالة جديدة على همسه.'); return send(res, 200, { code: c });
  }
  if ((r = p.match(/^\/api\/t\/([A-Z0-9-]+)$/))) {
    const t = db.threads[r[1]];
    if (!t) return send(res, limited('tg' + ip(req), 30, 600e3) ? 429 : 404, { error: 'الكود ده مش صحيح' }); // only wrong guesses count: blocks code brute-forcing
    const x = db.users[t.to];
    if (m === 'POST') {
      const text = clean(b.text, 1000); if (!text) return send(res, 400, { error: 'اكتب رسالة الأول' });
      if (limited('tp' + ip(req), 30, 600e3)) return send(res, 429, { error: 'بتبعت بسرعة، استنى شوية' });
      if (t.msgs.length >= 300) return send(res, 400, { error: 'المحادثة وصلت للحد الأقصى' });
      if (admin.flagged(text)) t.flagged = true;
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
  if ((r = p.match(/^\/api\/inbox\/([A-Z0-9-]+)(\/(reply|star|block|report))?$/))) {
    if (!u) return send(res, 401, { error: 'auth' });
    const t = db.threads[r[1]]; if (!t || t.to !== u.username) return send(res, 404, { error: 'مش موجود' });
    if (m === 'DELETE') { delete db.threads[t.code]; save(); return send(res, 200, { ok: 1 }); }
    if (r[3] === 'reply' && m === 'POST') {
      const text = clean(b.text, 1000); if (!text) return send(res, 400, { error: 'اكتب الرد الأول' });
      t.msgs.push({ from: 'owner', text, t: Date.now() }); admin.bump('replies'); admin.feed('reply', '@' + t.to);
    } else if (r[3] === 'report' && m === 'POST') { t.report = { t: Date.now(), reason: clean(b.reason, 200) }; admin.bump('reports'); admin.feed('report', '@' + t.to); admin.log('thread_reported', t.code);
    } else if (r[3] === 'star' && m === 'POST') t.starred = !t.starred;
    else if (r[3] === 'block' && m === 'POST') { (u.blocked = u.blocked || []).push(t.fp); delete db.threads[t.code]; save(); return send(res, 200, { ok: 1 }); }
    else if (m === 'GET') t.unread = false;
    save(); return send(res, 200, { id: t.code, msgs: t.msgs, starred: t.starred });
  }
  send(res, 404, { error: 'not found' });
}
function login(res, un) { admin.bump('logins'); if (db.users[un]) db.users[un].last = Date.now(); const sid = rid(32); db.sessions[sha(sid)] = { u: un, t: Date.now() }; save(); send(res, 200, { username: un }, { 'Set-Cookie': `sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${HTTPS ? '; Secure' : ''}` }); }

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const { ogSvg } = require('./ogcard');
let sharp = null; try { sharp = require('sharp'); } catch { /* optional dep: og image falls back to stored/static */ }
const ogCache = new Map(); // handle -> {t, buf} (60s)
// SEO / AI-SEO: index.html is a template; these routes serve crawlers and chat agents.
function renderIndex() {
  const SNAME = db.settings.siteName || SITE_NAME;
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: SNAME, alternateName: 'Hamsa', url: BASE + '/', description: 'منصة عربية للرسائل المجهولة: شارك رابطك واستقبل رسائل بدون أسماء ورد عليها في محادثة حديثة.', inLanguage: 'ar', applicationCategory: 'SocialNetworkingApplication', operatingSystem: 'Web', browserRequirements: 'Requires JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, featureList: 'anonymous messages, chat-style replies, sender follow-up code, share conversation as image' }).replace(/</g, '\\u003c');
  const html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8').split('__SITENAME__').join(escHtml(SNAME)).split('__BASE__').join(escHtml(BASE)).split('__LD__').join(ld);
  const hash = crypto.createHash('sha256').update(ld).digest('base64');
  return { html, csp: SEC['Content-Security-Policy'].replace("script-src 'self'", `script-src 'self' 'sha256-${hash}'`) };
}
const llms = () => `# ${db.settings.siteName || SITE_NAME}\n\n> Anonymous messaging in Arabic (RTL): create a page, share your link, receive anonymous messages and reply in a chat-style thread. Senders stay anonymous and follow replies with a private code. Free.\n\n## Pages\n- ${BASE}/ : landing page (Arabic)\n- ${BASE}/#/signup and ${BASE}/#/login : account creation and sign-in\n- ${BASE}/#/u/{username} : public page to send an anonymous message to that user\n- ${BASE}/#/t/{CODE} : sender follows replies using the private code\n- ${BASE}/#/inbox : owner's inbox (requires sign-in)\n- ${BASE}/#/settings : profile, notifications, invite link\n\n## Notes\n- Hash-based single-page app: routes live after '#'.\n- Messages are private. The admin dashboard shows metadata only; message text is visible only for reported threads.\n- API endpoints under /api/ are for the app, not public data.\n`;
const manifest = () => JSON.stringify({ name: (db.settings.siteName || SITE_NAME) + ' — رسايل مجهولة', short_name: db.settings.siteName || SITE_NAME, start_url: '/', display: 'standalone', dir: 'rtl', lang: 'ar', background_color: '#171210', theme_color: '#e0553b', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] });
// Server-rendered profile page: crawlers (WhatsApp, Facebook, X...) read the OG/Twitter tags from the HTML;
// real browsers get redirected to the SPA hash route. Old /#/u/... links keep working in the app.
function profilePage(handle) {
  const S = db.settings.siteName || SITE_NAME, u = db.users[handle];
  const name = u ? (u.name || handle) : handle;
  const title = u ? `صارح ${name} وتابع الردود في ${S}` : `${S} — رسايل مجهولة`;
  const desc = u ? `ابعت رسالة مجهولة لـ ${name} — من غير اسم ولا حساب — وهو يرد عليك وانت متابع من نفس اللينك.` : 'منصة عربية للرسائل المجهولة: شارك رابطك واستقبل رسايل بدون أسماء ورد عليها.';
  const img = u && (sharp || u.ogimg) ? `${BASE}/og/u/${handle}` : `${BASE}/og.png`;
  const page = `${BASE}/u/${handle}`, spa = `/#/u/${handle}`;
  const m = (k, v, p) => `<meta ${p ? 'property' : 'name'}="${k}" content="${escHtml(v)}">`;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escHtml(title)}</title>
${m('description', desc)}${m('og:type', 'profile', 1)}${m('og:site_name', S, 1)}${m('og:title', title, 1)}${m('og:description', desc, 1)}${m('og:url', page, 1)}${m('og:image', img, 1)}${m('og:image:width', '1200', 1)}${m('og:image:height', '630', 1)}${m('og:locale', 'ar_AR', 1)}${m('twitter:card', 'summary_large_image')}${m('twitter:title', title)}${m('twitter:description', desc)}${m('twitter:image', img)}
<meta http-equiv="refresh" content="0;url=${escHtml(spa)}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"></head>
<body style="font-family:Tahoma,sans-serif;text-align:center;padding:40px 16px"><p><a href="${escHtml(spa)}">${escHtml(title)}</a></p></body></html>`;
}
const server = http.createServer(async (req, res) => {
  metrics.requests++;
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) {
      // CSRF: state-changing requests must come from this site (Origin check) and be JSON. SameSite cookies add a second layer.
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const o = req.headers.origin;
        if (o && (() => { try { return new URL(o).host !== req.headers.host; } catch { return true; } })()) return send(res, 403, { error: 'forbidden' });
        if (req.method === 'POST' && !String(req.headers['content-type'] || '').startsWith('application/json') && Number(req.headers['content-length'] || 0) > 0) return send(res, 415, { error: 'bad type' });
      }
      return await api(req, res, url);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, SEC); return res.end(); }
    if (url.pathname === '/robots.txt') { res.writeHead(200, { 'Content-Type': types['.txt'], 'Cache-Control': 'no-cache', ...SEC }); return res.end(req.method === 'HEAD' ? undefined : `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${BASE}/sitemap.xml\n`); }
    if (url.pathname === '/sitemap.xml') { res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-cache', ...SEC }); return res.end(req.method === 'HEAD' ? undefined : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${BASE}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>`); }
    if (url.pathname === '/llms.txt') { res.writeHead(200, { 'Content-Type': types['.txt'], 'Cache-Control': 'no-cache', ...SEC }); return res.end(req.method === 'HEAD' ? undefined : llms()); }
    if (url.pathname === '/manifest.webmanifest') { res.writeHead(200, { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-cache', ...SEC }); return res.end(req.method === 'HEAD' ? undefined : manifest()); }
    let rm;
    if ((rm = url.pathname.match(/^\/u\/([a-z0-9_]{3,20})$/))) { res.writeHead(200, { 'Content-Type': types['.html'], 'Cache-Control': 'no-cache', ...SEC }); return res.end(req.method === 'HEAD' ? undefined : profilePage(rm[1])); }
    if ((rm = url.pathname.match(/^\/og\/u\/([a-z0-9_]{3,20})$/))) {
      const u = db.users[rm[1]];
      if (u && sharp) {
        try {
          let c = ogCache.get(rm[1]);
          if (!c || Date.now() - c.t > 60000) {
            c = { t: Date.now(), buf: await sharp(Buffer.from(ogSvg({ username: u.username, name: u.name, avatar: u.avatar || '', stats: stats(u.username), views: u.views || 0, since: u.created }))).png().toBuffer() };
            ogCache.set(rm[1], c);
          }
          res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': c.buf.length, 'Cache-Control': 'public, max-age=60', ...SEC }); return res.end(req.method === 'HEAD' ? undefined : c.buf);
        } catch (e) { /* fall through to stored/static fallback */ }
      }
      if (u && u.ogimg) {
        const ci = u.ogimg.indexOf(','), mime = u.ogimg.slice(5, u.ogimg.indexOf(';'));
        const buf = Buffer.from(u.ogimg.slice(ci + 1), 'base64');
        res.writeHead(200, { 'Content-Type': mime, 'Content-Length': buf.length, 'Cache-Control': 'public, max-age=300', ...SEC }); return res.end(req.method === 'HEAD' ? undefined : buf);
      }
      res.writeHead(302, { Location: '/og.png', ...SEC }); return res.end();
    }
    if ((rm = url.pathname.match(/^\/avatar\/([a-z0-9_]{3,20})$/))) {
      const u = db.users[rm[1]];
      if (u && u.avatar && u.avatar.startsWith('data:image/')) {
        const ci = u.avatar.indexOf(','), mime = u.avatar.slice(5, u.avatar.indexOf(';'));
        const buf = Buffer.from(u.avatar.slice(ci + 1), 'base64');
        res.writeHead(200, { 'Content-Type': mime, 'Content-Length': buf.length, 'Cache-Control': 'public, max-age=300', ...SEC }); return res.end(req.method === 'HEAD' ? undefined : buf);
      }
      res.writeHead(302, { Location: '/icon-512.png', ...SEC }); return res.end();
    }
    const f = ['/app.js', '/style.css', '/admin-ui.js', '/favicon.svg', '/favicon.ico', '/og.png', '/icon-180.png', '/icon-192.png', '/icon-512.png'].includes(url.pathname) ? (url.pathname === '/favicon.ico' ? '/favicon.svg' : url.pathname) : '/index.html'; // fixed whitelist: no path traversal possible
    if (f === '/index.html') { const { html, csp } = renderIndex(); res.writeHead(200, { 'Content-Type': types['.html'], 'Cache-Control': 'no-cache', ...SEC, 'Content-Security-Policy': csp }); return res.end(req.method === 'HEAD' ? undefined : html); }
    const data = fs.readFileSync(path.join(PUB, f));
    res.writeHead(200, { 'Content-Type': types[path.extname(f)], 'Cache-Control': 'no-cache', ...SEC }); res.end(req.method === 'HEAD' ? undefined : data);
  } catch (e) {
    metrics.errors++;
    if (!res.headersSent) { const st = e && e.status === 413 ? 413 : 500; res.writeHead(st, { 'Content-Type': 'application/json', ...SEC }); res.end(JSON.stringify({ error: st === 413 ? 'too large' : 'server error' })); }
  }
});
server.requestTimeout = 20000; server.headersTimeout = 10000; server.keepAliveTimeout = 5000;
(async function boot() {
  if (SB_URL) { try { const rows = await remote('GET', '?id=eq.db&select=data'); if (rows[0]) Object.assign(db, rows[0].data); console.log('database loaded from Supabase'); } catch (e) { console.error('remote load failed, refusing to start to avoid overwriting data:', e.message); process.exit(1); } }
  admin = require('./admin')({ db, send, limited, ip, fpOf, sha, same, hash, save, cookie, HTTPS, metrics, dbFile: DB_FILE, remote: !!SB_URL });
  server.listen(PORT, () => console.log('http://localhost:' + PORT + (admin.enabled ? ' (admin on)' : '')));
})();
