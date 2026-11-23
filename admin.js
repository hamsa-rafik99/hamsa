// Admin API for همسه. Enabled only when ADMIN_PASSWORD (16+ chars) is set in the environment.
// Privacy rule: the admin sees counts and metadata only. Message text is visible ONLY for threads the
// owner reported or the word filter flagged. Every admin action is written to the audit log.
const crypto = require('crypto');

const DAY = 864e5, ADMIN_TTL = 2 * 3600e3;
const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

module.exports = function createAdmin(ctx) {
  const { db, send, limited, ip, fpOf, sha, same, hash, save, cookie, HTTPS, metrics } = ctx;
  const pass = (process.env.ADMIN_PASSWORD || '').replace(/\s+/g, '');
  const enabled = pass.length >= 16;
  const salt = crypto.randomBytes(16).toString('hex');
  const passHash = enabled ? hash(pass, salt) : '';
  const sessions = new Map(); // sha(token) -> expiry. Memory only: a restart logs the admin out.

  db.settings = Object.assign({ siteName: '', registrationOpen: true, sendingOpen: true, perRecipientPerHour: 60, bannedWords: [] }, db.settings);
  db.audit = db.audit || []; db.feedLog = db.feedLog || []; db.hourly = db.hourly || {}; db.daily = db.daily || {}; db.bannedFp = db.bannedFp || [];

  const log = (kind, detail = '') => { db.audit.unshift({ t: Date.now(), kind, detail: String(detail).slice(0, 200) }); db.audit.length = Math.min(db.audit.length, 500); save(); };
  const bump = (what) => {
    const d = (db.daily[dayKey()] = db.daily[dayKey()] || {}); d[what] = (d[what] || 0) + 1;
    const keys = Object.keys(db.daily).sort(); while (keys.length > 90) delete db.daily[keys.shift()];
    if (what === 'messages' || what === 'replies') { const h = new Date().toISOString().slice(0, 13); db.hourly[h] = (db.hourly[h] || 0) + 1; const hk = Object.keys(db.hourly).sort(); while (hk.length > 72) delete db.hourly[hk.shift()]; }
  };
  // activity feed: what happened and to whom, never the message text
  const feed = (kind, detail = '') => { db.feedLog.unshift({ t: Date.now(), kind, detail: String(detail).slice(0, 60) }); db.feedLog.length = Math.min(db.feedLog.length, 100); };
  const flagged = text => { const w = db.settings.bannedWords; const t = String(text).toLowerCase(); return w.some(x => x && t.includes(x)); };

  const isAdmin = req => { const tok = cookie(req).asid; if (!tok) return false; const e = sessions.get(sha(tok)); if (!e || e < Date.now()) { sessions.delete(sha(tok || '')); return false; } return true; };
  const mask = e => { if (!e) return ''; const [a, d] = e.split('@'); return a.slice(0, 2) + '***@' + d; };
  const ck = (v, max) => `asid=${v}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${max}${HTTPS ? '; Secure' : ''}`;

  const sum = (from, to, k) => { let n = 0; for (let i = from; i <= to; i++) n += (db.daily[dayKey(Date.now() - i * DAY)] || {})[k] || 0; return n; };
  const series = (n) => { const out = []; for (let i = n - 1; i >= 0; i--) { const k = dayKey(Date.now() - i * DAY), d = db.daily[k] || {}; out.push({ day: k.slice(5), signups: d.signups || 0, messages: d.messages || 0, replies: d.replies || 0, views: d.views || 0, logins: d.logins || 0 }); } return out; };
  const hourly = () => { const out = []; for (let i = 23; i >= 0; i--) { const k = new Date(Date.now() - i * 36e5).toISOString().slice(0, 13); out.push({ h: new Date(Date.now() - i * 36e5).getHours(), n: db.hourly[k] || 0 }); } return out; };
  function overview() {
    let msgs = 0, replies = 0, reports = 0, flaggedN = 0, replied = 0, unread = 0;
    for (const t of Object.values(db.threads)) { let r = false; for (const m of t.msgs) { if (m.from === 'owner') { replies++; r = true; } else msgs++; } if (r) replied++; if (t.unread) unread++; if (t.report) reports++; else if (t.flagged) flaggedN++; }
    const users = Object.values(db.users), threads = Object.keys(db.threads).length, now = Date.now();
    const active7 = users.filter(u => u.last && now - u.last < 7 * DAY).length, active1 = users.filter(u => u.last && now - u.last < DAY).length;
    const top = (f) => users.map(u => ({ username: u.username, name: u.name, v: f(u) })).filter(x => x.v > 0).sort((a, b2) => b2.v - a.v).slice(0, 5);
    const recv = {}; for (const t of Object.values(db.threads)) recv[t.to] = (recv[t.to] || 0) + t.msgs.filter(m => m.from === 'anon').length;
    const out = db.outbox, ns = { total: out.length, sent: out.filter(e => e.status === 'أُرسل').length, failed: out.filter(e => e.status === 'فشل الإرسال').length };
    const mem = process.memoryUsage(), dbBytes = Buffer.byteLength(JSON.stringify(db));
    const ephemeral = !ctx.remote && !!process.env.RENDER;
    const alerts = [];
    if (ephemeral) alerts.push({ level: 'warn', text: 'التخزين مؤقت على الاستضافة المجانية: البيانات بتتمسح مع كل نشر أو بعد فترة خمول.' });
    if (reports) alerts.push({ level: 'bad', text: `${reports} بلاغ ينتظر المراجعة` });
    if (sum(0, 0, 'failedLogins') > 20) alerts.push({ level: 'bad', text: 'محاولات دخول فاشلة كتير النهارده' });
    if (sum(0, 0, 'limited') > 30) alerts.push({ level: 'warn', text: 'ضغط كبير: طلبات كتير اتحجبت بالحد الأقصى النهارده' });
    if (dbBytes > 20e6) alerts.push({ level: 'warn', text: 'حجم البيانات كبير، فكر في تنضيف أو تخزين خارجي' });
    return {
      users: users.length, banned: users.filter(u => u.banned).length, threads, messages: msgs, replies, reports, flagged: flaggedN, unread,
      views: users.reduce((a, u) => a + (u.views || 0), 0), active1, active7,
      today: { signups: sum(0, 0, 'signups'), messages: sum(0, 0, 'messages'), replies: sum(0, 0, 'replies'), views: sum(0, 0, 'views') },
      yesterday: { signups: sum(1, 1, 'signups'), messages: sum(1, 1, 'messages'), replies: sum(1, 1, 'replies'), views: sum(1, 1, 'views') },
      week: { signups: sum(0, 6, 'signups'), messages: sum(0, 6, 'messages'), replies: sum(0, 6, 'replies'), views: sum(0, 6, 'views') },
      prevWeek: { signups: sum(7, 13, 'signups'), messages: sum(7, 13, 'messages'), replies: sum(7, 13, 'replies'), views: sum(7, 13, 'views') },
      replyRate: threads ? Math.round((replied / threads) * 100) : 0, avgPerThread: threads ? +((msgs + replies) / threads).toFixed(1) : 0,
      emailUsers: users.filter(u => u.email).length, notifyOn: users.filter(u => u.notify && (u.notify.email || u.notify.telegram || u.notify.whatsapp)).length, notifications: ns,
      topInviters: top(u => Object.values(db.users).filter(q => q.invitedBy === u.username).length), invited: users.filter(u => u.invitedBy).length, topViews: top(u => u.views || 0), topReceived: top(u => recv[u.username] || 0),
      series: series(30), hourly: hourly(), alerts,
      security: { failedAdminToday: db.audit.filter(a => a.kind === 'admin_login_failed' && Date.now() - a.t < DAY).length, failedUserToday: sum(0, 0, 'failedLogins'), limitedToday: sum(0, 0, 'limited'), bannedSenders: db.bannedFp.length, sessions: Object.keys(db.sessions).length, adminSessions: sessions.size },
      system: { uptime: Math.round((Date.now() - metrics.started) / 1000), memMB: Math.round(mem.rss / 1048576), dbKB: Math.round(dbBytes / 1024), requests: metrics.requests, errors: metrics.errors, node: process.version, storage: ctx.remote ? 'supabase' : ephemeral ? 'ephemeral' : 'local-file', lastSave: metrics.lastSave },
    };
  }
  function userRow(u) {
    let got = 0, rep = 0; for (const t of Object.values(db.threads)) if (t.to === u.username) for (const m of t.msgs) m.from === 'owner' ? rep++ : got++;
    return { username: u.username, name: u.name, email: mask(u.email), created: u.created || 0, last: u.last || 0, invitedBy: u.invitedBy || '', invites: Object.values(db.users).filter(q => q.invitedBy === u.username).length, received: got, replies: rep, views: u.views || 0, banned: !!u.banned, open: u.open !== false };
  }
  const reportRow = t => ({ code: t.code, to: t.to, report: t.report || null, flagged: !!t.flagged, created: t.created, msgs: t.msgs.map(m => ({ from: m.from, text: m.text, t: m.t })) });

  function deleteUser(un) {
    delete db.users[un];
    for (const [c, t] of Object.entries(db.threads)) if (t.to === un) delete db.threads[c];
    for (const [s, v] of Object.entries(db.sessions)) if (v.u === un) delete db.sessions[s];
  }

  // Returns true when the request was handled. Anything not allowed looks like a plain 404.
  return {
    bump, flagged, log, feed, enabled,
    async handle(req, res, p, m, b) {
      const nf = () => send(res, 404, { error: 'not found' });
      if (!enabled) return nf();
      if (p === '/api/admin/login' && m === 'POST') {
        if (limited('al' + ip(req), 5, 900e3) || limited('alg', 40, 3600e3)) return send(res, 429, { error: 'محاولات كتير' });
        const ok = same(hash(b.password || '', salt), passHash);
        if (!ok) { log('admin_login_failed', 'client ' + fpOf(req).slice(0, 6)); return send(res, 401, { error: 'غلط' }); }
        const tok = crypto.randomBytes(32).toString('base64url'); sessions.set(sha(tok), Date.now() + ADMIN_TTL);
        log('admin_login', 'client ' + fpOf(req).slice(0, 6));
        return send(res, 200, { ok: 1 }, { 'Set-Cookie': ck(tok, ADMIN_TTL / 1000) });
      }
      if (!isAdmin(req)) return nf();
      if (m !== 'GET' && req.headers['x-admin'] !== '1') return send(res, 403, { error: 'forbidden' });
      if(p.startsWith('/api/admin/story-reports')) return ctx.storyAdmin(req,res,p,m,b);
      if (p === '/api/admin/logout' && m === 'POST') { sessions.delete(sha(cookie(req).asid)); return send(res, 200, { ok: 1 }, { 'Set-Cookie': ck('', 0) }); }
      if (p === '/api/admin/overview') return send(res, 200, overview());
      if (p === '/api/admin/users') {
        const q = String(new URL(req.url, 'http://x').searchParams.get('q') || '').toLowerCase().slice(0, 40);
        const sp = new URL(req.url, 'http://x').searchParams, st = sp.get('status'), sort = sp.get('sort');
        let rows = Object.values(db.users).filter(u => (!q || u.username.includes(q) || String(u.name).toLowerCase().includes(q)) && (st === 'banned' ? u.banned : st === 'active' ? !u.banned : true)).map(userRow);
        const key = { messages: 'received', views: 'views', replies: 'replies', last: 'last' }[sort] || 'created';
        rows = rows.sort((a, b2) => b2[key] - a[key]);
        return send(res, 200, { users: rows.slice(0, 300), total: rows.length });
      }
      let r;
      if ((r = p.match(/^\/api\/admin\/users\/([a-z0-9_]+)\/(ban|unban|delete)$/)) && m === 'POST') {
        const u = db.users[r[1]]; if (!u) return send(res, 404, { error: 'مش موجود' });
        if (r[2] === 'delete') { deleteUser(u.username); log('user_deleted', u.username); }
        else { u.banned = r[2] === 'ban'; if (u.banned) for (const [s, v] of Object.entries(db.sessions)) if (v.u === u.username) delete db.sessions[s]; log('user_' + r[2], u.username); }
        save(); return send(res, 200, { ok: 1 });
      }
      if (p === '/api/admin/reports') return send(res, 200, { reports: Object.values(db.threads).filter(t => t.report || t.flagged).sort((a, b2) => ((b2.report || {}).t || b2.created) - ((a.report || {}).t || a.created)).slice(0, 100).map(reportRow) });
      if ((r = p.match(/^\/api\/admin\/reports\/([A-Z0-9-]+)\/(dismiss|delete|ban-sender)$/)) && m === 'POST') {
        const t = db.threads[r[1]]; if (!t) return send(res, 404, { error: 'مش موجود' });
        if (r[2] === 'dismiss') { delete t.report; delete t.flagged; log('report_dismissed', t.code); }
        if (r[2] === 'delete') { delete db.threads[t.code]; log('thread_deleted', t.code); }
        if (r[2] === 'ban-sender') { if (t.fp && !db.bannedFp.includes(t.fp)) db.bannedFp.push(t.fp); delete db.threads[t.code]; log('sender_banned', t.code); }
        save(); return send(res, 200, { ok: 1 });
      }
      if (p === '/api/admin/settings') {
        if (m === 'POST') {
          const s = db.settings;
          s.siteName = String(b.siteName || '').trim().slice(0, 30);
          s.registrationOpen = b.registrationOpen !== false; s.sendingOpen = b.sendingOpen !== false;
          s.perRecipientPerHour = Math.min(1000, Math.max(5, parseInt(b.perRecipientPerHour, 10) || 60));
          s.bannedWords = String(b.bannedWords || '').split(/[\n,]/).map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, 100);
          log('settings_changed', 'registration=' + s.registrationOpen + ' sending=' + s.sendingOpen); save();
        }
        return send(res, 200, { ...db.settings, bannedWords: db.settings.bannedWords.join('\n') });
      }
      if (p === '/api/admin/signups') {
        const users = Object.values(db.users), by = {};
        for (const u of users) if (u.invitedBy) (by[u.invitedBy] = by[u.invitedBy] || []).push(u);
        const invited = users.filter(u => u.invitedBy).length, visits = users.reduce((a, u) => a + (u.inviteVisits || 0), 0);
        const per = Object.entries(by).map(([un, list]) => ({ username: un, name: (db.users[un] || {}).name || un, count: list.length, visits: (db.users[un] || {}).inviteVisits || 0, last: Math.max(...list.map(x => x.created || 0)), active: list.filter(x => x.last && Date.now() - x.last < 7 * DAY).length })).sort((a, b2) => b2.count - a.count).slice(0, 50);
        const days = []; for (let i = 29; i >= 0; i--) { const k = dayKey(Date.now() - i * DAY), d = db.daily[k] || {}; days.push({ day: k.slice(5), invited: d.invitedSignups || 0, organic: Math.max(0, (d.signups || 0) - (d.invitedSignups || 0)), visits: d.inviteVisits || 0 }); }
        const weeks = []; for (let w = 7; w >= 0; w--) { let i2 = 0, o = 0; for (let i = w * 7; i < w * 7 + 7; i++) { const d = db.daily[dayKey(Date.now() - i * DAY)] || {}; i2 += d.invitedSignups || 0; o += Math.max(0, (d.signups || 0) - (d.invitedSignups || 0)); } weeks.push({ w: w === 0 ? 'الأسبوع ده' : `-${w}`, invited: i2, organic: o }); }
        const depth = users.filter(u => u.invitedBy && by[u.username]).length; // invited members who invited others too
        return send(res, 200, { total: users.length, invited, organic: users.length - invited, visits, inviters: Object.keys(by).length, chains: depth, conversion: visits ? Math.min(100, Math.round((invited / visits) * 100)) : 0, per, days, weeks });
      }
      if (p === '/api/admin/feed') return send(res, 200, { feed: db.feedLog.slice(0, 40) });
      if (p === '/api/admin/log') return send(res, 200, { log: db.audit.slice(0, 200) });
            if (p === '/api/admin/missions' && m === 'GET') return send(res, 200, { missions: db.missions || [], types: ctx.missionTypes || {} });
      const cleanMission = (bb, existing) => {
        const title = String(bb.title || '').trim().slice(0, 60); if (!title) return { error: 'اكتب اسم المهمة' };
        const desc = String(bb.desc || '').trim().slice(0, 200);
        const type = String(bb.type || ''); if (!(ctx.missionTypes || {})[type]) return { error: 'نوع الشرط مش معروف' };
        const stages = (Array.isArray(bb.stages) ? bb.stages : []).slice(0, 8).map(s => ({ target: Math.floor(Number(s.target)), pts: Math.floor(Number(s.pts)) })).filter(s => Number.isFinite(s.target) && Number.isFinite(s.pts) && s.target >= 1 && s.target <= 1000000 && s.pts >= 1 && s.pts <= 100000);
        if (!stages.length) return { error: 'ضيف مرحلة واحدة على الأقل بهدف ونقاط صحيحة' };
        stages.sort((a, b2) => a.target - b2.target);
        return { m: { id: existing ? existing.id : 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title, desc, type, secret: bb.secret === true, active: bb.active !== false, stages } };
      };
      if (p === '/api/admin/missions' && m === 'POST') {
        const v = cleanMission(b); if (v.error) return send(res, 400, { error: v.error });
        db.missions = db.missions || []; db.missions.push(v.m); log('mission_created', v.m.id + ' ' + v.m.title); save();
        return send(res, 200, { ok: 1, id: v.m.id });
      }
      if ((r = p.match(/^\/api\/admin\/missions\/([\w-]+)$/))) {
        db.missions = db.missions || [];
        const ms = db.missions.find(x => x.id === r[1]); if (!ms) return send(res, 404, { error: 'مش موجود' });
        if (m === 'DELETE') { db.missions = db.missions.filter(x => x !== ms); log('mission_deleted', ms.id + ' ' + ms.title); save(); return send(res, 200, { ok: 1 }); }
        if (m === 'PUT') { const v = cleanMission(b, ms); if (v.error) return send(res, 400, { error: v.error }); Object.assign(ms, v.m, { id: ms.id }); log('mission_updated', ms.id + ' ' + ms.title); save(); return send(res, 200, { ok: 1 }); }
        return nf();
      }
      return nf();
    },
  };
};
