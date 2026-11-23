// Admin dashboard UI (loaded only on #/admin). Talks to /api/admin/*, which answers 404 unless the admin cookie is valid.
const aapi = (p, method = 'GET', data) => fetch('/api/admin' + p, { method, headers: { 'Content-Type': 'application/json', 'X-Admin': '1' }, body: data ? JSON.stringify(data) : undefined })
  .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'خطأ'), { status: r.status }); return j; });
const day = t => t ? new Date(t).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

let adminTimer;
const num = n => Number(n).toLocaleString('ar-EG');
async function pageAdmin(tab = 'overview') {
  clearInterval(adminTimer);
  let ov;
  try { ov = await aapi('/overview'); } catch (e) { return adminLogin(); }
  const tabs = [['overview', 'نظرة عامة', '◈'], ['users', 'المستخدمين', '☻'], ['signups', 'التسجيلات والدعوات', '⇪'], ['missions', 'المهمات', '★'], ['storyreports', 'بلاغات الاستوري', '◉'], ['reports', 'البلاغات', '⚑'], ['settings', 'الإعدادات', '⚙'], ['log', 'سجل النشاط', '≡']];
  const nav = tabs.map(([k, l, ic]) => `<a class="${k === tab ? 'on' : ''}" href="#/admin/${k}"><i>${ic}</i><span>${l}</span>${k === 'reports' && ov.reports + ov.flagged ? ` <em class="badge bad">${num(ov.reports + ov.flagged)}</em>` : ''}</a>`).join('');
  const body = await ({ overview: adminOverview, users: adminUsers, signups: adminSignups, missions: adminMissions, storyreports: adminStoryReports, reports: adminReports, settings: adminSettings, log: adminLog }[tab] || adminOverview)(ov);
  app.innerHTML = shell(`<div class="adm"><aside class="aside"><div class="abrand">لوحة التحكم</div><nav>${nav}</nav><button class="btn sm ghost" id="alo">تسجيل خروج</button></aside><main class="amain">${body.html}</main></div>`);
  $('#alo').onclick = async () => { clearInterval(adminTimer); await aapi('/logout', 'POST'); location.hash = '#/admin'; };
  body.bind && body.bind();
}

function adminLogin() {
  app.innerHTML = shell(`<div class="card"><h1>دخول الأدمن</h1><form id="af"><input id="ap" type="password" dir="ltr" autocomplete="current-password" placeholder="كلمة سر الأدمن"><div class="err" id="aer"></div><button class="btn full">دخول</button></form></div>`);
  $('#af').onsubmit = async e => { e.preventDefault(); try { await aapi('/login', 'POST', { password: $('#ap').value }); pageAdmin('overview'); } catch (x) { $('#aer').textContent = x.status === 429 ? 'محاولات كتير، استنى شوية' : 'مش مظبوط'; } };
}

const delta = (a, b) => { if (!b && !a) return '<small class="mut">—</small>'; if (!b) return '<small class="up">جديد</small>'; const p = Math.round(((a - b) / b) * 100); return `<small class="${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${num(Math.abs(p))}٪</small>`; };
const kpi = (label, val, sub) => `<div class="kpi"><span>${label}</span><b>${val}</b>${sub || ''}</div>`;
function lineChart(series, keys, colors) {
  const W = 600, H = 160, P = 6, max = Math.max(1, ...series.flatMap(d => keys.map(k => d[k])));
  const x = i => P + (i * (W - 2 * P)) / (series.length - 1), y = v => H - P - (v / max) * (H - 2 * P);
  const lines = keys.map((k, ki) => { const pts = series.map((d, i) => `${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(' '); return `<polyline fill="none" stroke="${colors[ki]}" stroke-width="2.5" stroke-linejoin="round" points="${pts}"/>`; }).join('');
  const grid = [0, 0.5, 1].map(f => `<line x1="0" x2="${W}" y1="${y(max * f).toFixed(1)}" y2="${y(max * f).toFixed(1)}" stroke="currentColor" opacity=".12"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="none" role="img">${grid}${lines}</svg><div class="legend">${keys.map((k, i) => `<span><i style="background:${colors[i]}"></i>${({ messages: 'رسائل', signups: 'حسابات', replies: 'ردود', views: 'زيارات', logins: 'دخول' })[k]}</span>`).join('')}<span class="mut">أعلى قيمة: ${num(max)}</span></div>`;
}
const feedText = { signup: 'حساب جديد', message: 'رسالة جديدة وصلت', reply: 'رد من صاحب صفحة', report: 'بلاغ جديد', 'invited signup': 'حساب جديد بدعوة' };
const fmtUp = s => s >= 86400 ? `${num(Math.floor(s / 86400))} يوم` : s >= 3600 ? `${num(Math.floor(s / 3600))} ساعة` : `${num(Math.floor(s / 60))} دقيقة`;
const dot = ok => `<i class="dot ${ok ? 'ok' : 'warn'}"></i>`;

function adminOverview(ov) {
  const hmax = Math.max(1, ...ov.hourly.map(h => h.n));
  const hours = ov.hourly.map(h => `<div class="bar" title="${num(h.h)}:00 — ${num(h.n)}"><i style="height:${Math.round((h.n / hmax) * 100)}%"></i><span>${h.h % 6 === 0 ? num(h.h) : ''}</span></div>`).join('');
  const rank = (arr, unit) => arr.length ? arr.map((u, i) => `<div class="lrow"><span>${num(i + 1)}. ${esc(u.name)} <span class="mut" dir="ltr">@${esc(u.username)}</span></span><b>${num(u.v)} <small class="mut">${unit}</small></b></div>`).join('') : '<div class="empty">لسه مفيش بيانات</div>';
  const alerts = ov.alerts.length ? ov.alerts.map(a => `<div class="alert ${a.level}">${esc(a.text)}</div>`).join('') : '<div class="alert ok">كل حاجة تمام، مفيش تنبيهات.</div>';
  const sy = ov.system, se = ov.security, nt = ov.notifications;
  const html = `<h1>نظرة عامة</h1>${alerts}
  <div class="kpis">${kpi('المستخدمين', num(ov.users), `<small class="mut">${num(ov.today.signups)} النهارده</small>`)}${kpi('الرسائل (٧ أيام)', num(ov.week.messages), delta(ov.week.messages, ov.prevWeek.messages))}${kpi('الردود (٧ أيام)', num(ov.week.replies), delta(ov.week.replies, ov.prevWeek.replies))}${kpi('الزيارات (٧ أيام)', num(ov.week.views), delta(ov.week.views, ov.prevWeek.views))}
  ${kpi('نشطين آخر ٢٤ ساعة', num(ov.active1), `<small class="mut">${num(ov.active7)} آخر أسبوع</small>`)}${kpi('نسبة الرد', num(ov.replyRate) + '٪', `<small class="mut">من ${num(ov.threads)} محادثة</small>`)}${kpi('متوسط رسائل المحادثة', num(ov.avgPerThread), '')}${kpi('بلاغات + معلّمة', num(ov.reports + ov.flagged), `<small class="mut">${num(ov.banned)} موقوف</small>`)}</div>
  <div class="grid2"><section class="card"><h2>النمو آخر ٣٠ يوم</h2>${lineChart(ov.series, ['messages', 'views', 'signups'], ['#ff8a4c', '#6ea8ff', '#5bd68a'])}</section>
  <section class="card"><h2>النشاط حسب الساعة (آخر ٢٤ ساعة)</h2><div class="bars">${hours}</div><div class="mut" style="margin-top:6px">رسائل وردود فقط، أرقام بدون محتوى.</div></section></div>
  <div class="grid2"><section class="card"><h2>الأكتر زيارة</h2>${rank(ov.topViews, 'زيارة')}</section><section class="card"><h2>الأكتر استقبالاً للرسايل</h2>${rank(ov.topReceived, 'رسالة')}</section></div>
  <div class="grid2"><section class="card"><h2>أكتر المدعوين <small class="mut">(${num(ov.invited)} حساب جه من دعوة)</small></h2>${rank(ov.topInviters, 'مدعو')}</section><section class="card"><h2>الدعوات</h2><p class="mut">كل عضو عنده لينك دعوة خاص في الإعدادات. بنسجّل مين دعا مين، من غير مكافآت (عشان ما يحصلش سبام).</p></section></div>
  <div class="grid2"><section class="card"><h2>حالة النظام</h2>
    <div class="lrow"><span>${dot(true)}السيرفر شغال</span><b>${fmtUp(sy.uptime)}</b></div>
    <div class="lrow"><span>الطلبات / الأخطاء</span><b>${num(sy.requests)} / ${num(sy.errors)}</b></div>
    <div class="lrow"><span>الذاكرة</span><b>${num(sy.memMB)} MB</b></div>
    <div class="lrow"><span>حجم البيانات</span><b>${num(sy.dbKB)} KB</b></div>
    <div class="lrow"><span>${dot(sy.storage !== 'ephemeral')}التخزين</span><b>${sy.storage === 'supabase' ? 'قاعدة بيانات دائمة' : sy.storage === 'ephemeral' ? 'مؤقت' : 'ملف محلي'}</b></div>
    <div class="lrow"><span>إصدار Node</span><b dir="ltr">${esc(sy.node)}</b></div></section>
  <section class="card"><h2>الأمان</h2>
    <div class="lrow"><span>دخول أدمن فاشل (٢٤س)</span><b>${num(se.failedAdminToday)}</b></div>
    <div class="lrow"><span>دخول مستخدمين فاشل (النهارده)</span><b>${num(se.failedUserToday)}</b></div>
    <div class="lrow"><span>طلبات اتحجبت بالحد الأقصى</span><b>${num(se.limitedToday)}</b></div>
    <div class="lrow"><span>مرسلين محظورين</span><b>${num(se.bannedSenders)}</b></div>
    <div class="lrow"><span>جلسات مفتوحة (مستخدمين / أدمن)</span><b>${num(se.sessions)} / ${num(se.adminSessions)}</b></div></section></div>
  <div class="grid2"><section class="card"><h2>الإشعارات</h2>
    <div class="lrow"><span>حسابات عليها إيميل</span><b>${num(ov.emailUsers)}</b></div><div class="lrow"><span>إشعارات مفعّلة</span><b>${num(ov.notifyOn)}</b></div>
    <div class="lrow"><span>مرسلة / فاشلة / محفوظة فقط</span><b>${num(nt.sent)} / ${num(nt.failed)} / ${num(nt.total - nt.sent - nt.failed)}</b></div></section>
  <section class="card"><h2>آخر الأحداث <small class="mut">(مباشر)</small></h2><div id="feed"></div></section></div>
  <p class="mut">الخصوصية: اللوحة بتعرض أرقام وبيانات وصفية فقط. نص الرسايل بيظهر فقط للمحادثات اللي صاحبها بلّغ عنها أو الفلتر علّمها.</p>`;
  return { html, bind() {
    const load = async () => { try { const { feed } = await aapi('/feed'); const f = $('#feed'); if (!f) return clearInterval(adminTimer); f.innerHTML = feed.length ? feed.slice(0, 12).map(e => `<div class="lrow"><span>${esc(feedText[e.kind] || e.kind)} <span class="mut" dir="ltr">${esc(e.detail)}</span></span><span class="mut">${time(e.t)}</span></div>`).join('') : '<div class="empty">مفيش أحداث لسه</div>'; } catch (e) { clearInterval(adminTimer); } };
    load(); adminTimer = setInterval(load, 8000);
  } };
}

async function adminUsers() {
  const html = `<h1>المستخدمين</h1><div class="card"><div class="row" style="flex-wrap:wrap"><input id="aq" placeholder="ابحث باليوزر أو الاسم" style="flex:2;min-width:160px"><select id="as" style="flex:1"><option value="created">الأحدث</option><option value="messages">الأكتر رسايل</option><option value="views">الأكتر زيارة</option><option value="last">آخر دخول</option></select><select id="ast" style="flex:1"><option value="">الكل</option><option value="active">نشط</option><option value="banned">موقوف</option></select><button class="btn sm ghost" id="csv">تصدير CSV</button></div><div class="mut" id="ucount" style="margin:8px 0"></div><div id="ul"></div></div>`;
  return { html, bind() {
    let rows = [];
    const load = async () => {
      const r = await aapi(`/users?q=${encodeURIComponent($('#aq').value)}&sort=${$('#as').value}&status=${$('#ast').value}`); rows = r.users;
      $('#ucount').textContent = `${num(r.total)} حساب`;
      $('#ul').innerHTML = rows.length ? rows.map(u => `<div class="urow"><div><b>${esc(u.name)}</b> <span class="mut" dir="ltr">@${esc(u.username)}</span> ${u.banned ? '<span class="badge bad">موقوف</span>' : ''}<div class="mut">${esc(u.email || 'بدون إيميل')} · انضم ${day(u.created)} · آخر دخول ${u.last ? day(u.last) : '-'}${u.invitedBy ? ' · دعاه @' + esc(u.invitedBy) : ''}${u.invites ? ' · دعا ' + num(u.invites) : ''}</div><div class="mut">${num(u.received)} رسالة · ${num(u.replies)} رد · ${num(u.views)} زيارة</div></div>
        <div class="row"><button class="btn sm ghost" data-u="${esc(u.username)}" data-do="${u.banned ? 'unban' : 'ban'}">${u.banned ? 'رفع الإيقاف' : 'إيقاف'}</button><button class="btn sm ghost" data-u="${esc(u.username)}" data-do="delete">حذف</button></div></div>`).join('') : '<div class="empty">مفيش نتايج</div>';
    };
    let tm; $('#aq').oninput = () => { clearTimeout(tm); tm = setTimeout(load, 250); }; $('#as').onchange = $('#ast').onchange = load;
    $('#ul').onclick = async e => { const b = e.target.closest('[data-do]'); if (!b) return; const a = b.dataset.do; if (a === 'delete' && !confirm('حذف الحساب وكل رسايله نهائياً؟')) return; if (a === 'ban' && !confirm('إيقاف الحساب؟')) return; await aapi(`/users/${b.dataset.u}/${a}`, 'POST'); load(); };
    $('#csv').onclick = () => { const safe = v => { v = String(v); return '"' + (/^[=+\-@]/.test(v) ? "'" + v : v).replace(/"/g, '""') + '"'; }; const csv = ['username,name,email,joined,last_login,messages,replies,views,banned'].concat(rows.map(u => [u.username, u.name, u.email, day(u.created), u.last ? day(u.last) : '', u.received, u.replies, u.views, u.banned].map(safe).join(','))).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = 'users.csv'; a.click(); };
    load();
  } };
}

async function adminSignups() {
  const d = await aapi('/signups');
  const max = Math.max(1, ...d.days.map(x => x.invited + x.organic));
  const stack = d.days.map(x => `<div class="bar" title="${esc(x.day)}: ${num(x.organic)} عادي، ${num(x.invited)} بدعوة"><div class="stk"><i class="inv" style="height:${(x.invited / max) * 100}%"></i><i class="org" style="height:${(x.organic / max) * 100}%"></i></div><span>${x.day.slice(3) % 5 === 0 ? esc(x.day.slice(3)) : ''}</span></div>`).join('');
  const wmax = Math.max(1, ...d.weeks.map(x => x.invited + x.organic));
  const wk = d.weeks.map(x => `<div class="lrow"><span>${esc(x.w)}</span><span class="hbar"><i class="org" style="width:${(x.organic / wmax) * 100}%"></i><i class="inv" style="width:${(x.invited / wmax) * 100}%"></i></span><b>${num(x.organic)} / ${num(x.invited)}</b></div>`).join('');
  const share = d.total ? Math.round((d.invited / d.total) * 100) : 0;
  const per = d.per.length ? `<div class="trow th"><span>المدعو بواسطة</span><span>مدعوين</span><span>زيارات اللينك</span><span>نشطين ٧ أيام</span><span>آخر دعوة</span></div>` + d.per.map(p => `<div class="trow"><span>${esc(p.name)} <small class="mut" dir="ltr">@${esc(p.username)}</small></span><b>${num(p.count)}</b><span>${num(p.visits)}</span><span>${num(p.active)}</span><span class="mut">${day(p.last)}</span></div>`).join('') : '<div class="empty">لسه حد ما دعا حد</div>';
  const html = `<h1>التسجيلات والدعوات</h1>
  <div class="kpis">${kpi('إجمالي الحسابات', num(d.total), '')}${kpi('بدعوة', num(d.invited), `<small class="up">${num(share)}٪ من الكل</small>`)}${kpi('تسجيل عادي', num(d.organic), `<small class="mut">${num(100 - share)}٪</small>`)}${kpi('معدل التحويل', num(d.conversion) + '٪', `<small class="mut">${num(d.visits)} زيارة للينكات</small>`)}
  ${kpi('أعضاء دعوا', num(d.inviters), '')}${kpi('سلاسل دعوة', num(d.chains), '<small class="mut">مدعو دعا غيره</small>')}</div>
  <section class="card"><h2>تسجيلات يومية آخر ٣٠ يوم</h2><div class="bars">${stack}</div><div class="legend"><span><i style="background:var(--p2)"></i>عادي</span><span><i style="background:#6ea8ff"></i>بدعوة</span></div></section>
  <div class="grid2"><section class="card"><h2>حسب الأسبوع (عادي / بدعوة)</h2>${wk}</section>
  <section class="card"><h2>مصدر التسجيل</h2><div class="split"><i class="org" style="width:${100 - share}%"></i><i class="inv" style="width:${share}%"></i></div><div class="legend"><span><i style="background:var(--p2)"></i>عادي ${num(d.organic)}</span><span><i style="background:#6ea8ff"></i>بدعوة ${num(d.invited)}</span></div></section></div>
  <section class="card"><h2>تفصيل كل عضو دعا</h2><div class="tbl">${per}</div></section>`;
  return { html };
}

async function adminReports() {
  const { reports } = await aapi('/reports');
  const html = `<h1>البلاغات</h1>` + (reports.length ? reports.map(r => `<div class="card"><div class="t"><b>إلى @${esc(r.to)}</b><span class="mut">${r.report ? 'بلاغ من صاحب الصفحة' : 'علّمها فلتر الكلمات'}</span></div>
    ${r.report && r.report.reason ? `<div class="mut">السبب: ${esc(r.report.reason)}</div>` : ''}
    ${r.msgs.map(m => `<div class="rmsg ${m.from === 'owner' ? 'own' : ''}">${esc(m.text)}</div>`).join('')}
    <div class="row" style="margin-top:8px"><button class="btn sm ghost" data-c="${esc(r.code)}" data-do="dismiss">تجاهل</button><button class="btn sm ghost" data-c="${esc(r.code)}" data-do="delete">حذف المحادثة</button><button class="btn sm ghost" data-c="${esc(r.code)}" data-do="ban-sender">حظر المرسل وحذف</button></div></div>`).join('') : '<div class="card empty">مفيش بلاغات.</div>');
  return { html, bind() { app.onclick = async e => { const b = e.target.closest('[data-do]'); if (!b || !b.dataset.c) return; await aapi(`/reports/${b.dataset.c}/${b.dataset.do}`, 'POST'); pageAdmin('reports'); }; } };
}

async function adminSettings() {
  const s = await aapi('/settings');
  const html = `<h1>الإعدادات</h1><div class="card"><form id="sf"><label class="mut">اسم الموقع (فاضي = الافتراضي)</label><input id="sn" maxlength="30" value="${esc(s.siteName)}">
    <label class="row" style="margin:10px 0"><input type="checkbox" id="sr" ${s.registrationOpen ? 'checked' : ''} style="width:auto;margin:0"> التسجيل مفتوح</label>
    <label class="row" style="margin-bottom:10px"><input type="checkbox" id="ss" ${s.sendingOpen ? 'checked' : ''} style="width:auto;margin:0"> إرسال الرسايل مفتوح</label>
    <label class="mut">أقصى رسايل لكل صفحة في الساعة</label><input id="sl" type="number" min="5" max="1000" value="${esc(s.perRecipientPerHour)}">
    <label class="mut">كلمات ممنوعة (واحدة في كل سطر): الرسالة بتتعلّم وبتظهر في البلاغات</label><textarea id="sw" style="min-height:90px">${esc(s.bannedWords)}</textarea>
    <div class="err" id="sok"></div><button class="btn full">حفظ</button></form></div>`;
  return { html, bind() { $('#sf').onsubmit = async e => { e.preventDefault(); await aapi('/settings', 'POST', { siteName: $('#sn').value, registrationOpen: $('#sr').checked, sendingOpen: $('#ss').checked, perRecipientPerHour: $('#sl').value, bannedWords: $('#sw').value }); $('#sok').textContent = 'اتحفظ ✓'; }; } };
}

async function adminLog() {
  const { log } = await aapi('/log');
  const names = { signup: 'حساب جديد', admin_login: 'دخول أدمن', admin_login_failed: 'محاولة دخول فاشلة', user_ban: 'إيقاف حساب', user_unban: 'رفع إيقاف', user_deleted: 'حذف حساب', thread_reported: 'بلاغ على محادثة', report_dismissed: 'تجاهل بلاغ', thread_deleted: 'حذف محادثة', sender_banned: 'حظر مرسل', settings_changed: 'تغيير إعدادات', mission_created: 'مهمة جديدة', mission_updated: 'تعديل مهمة', mission_deleted: 'حذف مهمة' };
  return { html: `<h1>سجل النشاط</h1><div class="card">${log.length ? log.map(l => `<div class="lrow"><span>${esc(names[l.kind] || l.kind)} <span class="mut" dir="ltr">${esc(l.detail)}</span></span><span class="mut">${time(l.t)}</span></div>`).join('') : '<div class="empty">السجل فاضي</div>'}</div>` };
}

let editMissionId = null; // null = closed, '' = new mission form, otherwise the mission id being edited
async function adminMissions() {
  const d = await aapi('/missions');
  const stageLine = ms => ms.stages.map(s => `${num(s.target)} ← ${num(s.pts)} نقطة`).join(' · ');
  const form = ms => `<form id="mf">
    <label class="mut">اسم المهمة</label><input id="mt" maxlength="60" value="${ms ? esc(ms.title) : ''}">
    <label class="mut">الوصف (اختياري)</label><input id="md" maxlength="200" value="${ms ? esc(ms.desc || '') : ''}">
    <label class="mut">نوع الشرط</label><select id="mty">${Object.entries(d.types).map(([k, v]) => `<option value="${k}" ${ms && ms.type === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
    <label class="row" style="margin:10px 0"><input type="checkbox" id="mac" ${!ms || ms.active !== false ? 'checked' : ''} style="width:auto;margin:0"> المهمة مفعّلة</label>
    <label class="row" style="margin-bottom:10px"><input type="checkbox" id="mse" ${ms && ms.secret ? 'checked' : ''} style="width:auto;margin:0"> مهمة سرية (بتتكشف بالصدفة، مش بتظهر قبلها)</label>
    <label class="mut">المراحل بالترتيب: الهدف تراكمي من بداية المهمة، وكل مكافأة بتتضاف مرة واحدة</label>
    <div id="mst">${(ms ? ms.stages : [{ target: 5, pts: 5 }]).map(s => `<div class="stg row"><input type="number" class="stgt" min="1" placeholder="الهدف" value="${s.target}" style="flex:1"><input type="number" class="stgp" min="1" placeholder="النقاط" value="${s.pts}" style="flex:1"><button type="button" class="btn sm ghost" data-rm>✕</button></div>`).join('')}</div>
    <button type="button" class="btn sm ghost" id="madd" style="margin-bottom:10px">+ أضف مرحلة</button>
    <div class="err" id="merr"></div><div class="row"><button class="btn">${ms ? 'حفظ المهمة' : 'إنشاء المهمة'}</button><button type="button" class="btn ghost" id="mcancel">إلغاء</button></div></form>`;
  const editing = editMissionId ? d.missions.find(x => x.id === editMissionId) : null;
  const formOpen = editing || editMissionId === '';
  const list = d.missions.map(ms => `<div class="urow"><div><b>${esc(ms.title)}</b> ${ms.secret ? '<span class="badge bad">سرية</span>' : '<span class="badge">ظاهرة</span>'}${ms.active === false ? ' <span class="badge">متوقفة</span>' : ''}<div class="mut">${esc(d.types[ms.type] || ms.type)}${ms.desc ? ' — ' + esc(ms.desc) : ''}</div><div class="mut">${stageLine(ms)}</div></div>
    <div class="row"><button class="btn sm ghost" data-e="${esc(ms.id)}">تعديل</button><button class="btn sm ghost" data-d="${esc(ms.id)}">حذف</button></div></div>`).join('');
  const html = `<h1>المهمات</h1><p class="mut">اعمل مهمات عادية أو سرية وحدد مراحلها ومكافآتها. السرية بتظهر للمستخدم «؟؟؟» لحد ما يكتشفها، وأنت شايفها هنا بكل تفاصيلها.</p>
  ${formOpen ? `<div class="card">${form(editing)}</div>` : ''}
  <div class="card"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">المهمات الحالية (${num(d.missions.length)})</h2><button class="btn sm" id="mnew">+ مهمة جديدة</button></div><div style="margin-top:10px">${list || '<div class="empty">مفيش مهمات</div>'}</div></div>`;
  return { html, bind() {
    $('#mnew').onclick = () => { editMissionId = ''; pageAdmin('missions'); };
    app.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { editMissionId = b.dataset.e; pageAdmin('missions'); });
    app.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('تحذف المهمة دي نهائياً؟')) { await aapi('/missions/' + b.dataset.d, 'DELETE'); pageAdmin('missions'); } });
    if (!formOpen) return;
    $('#madd').onclick = () => $('#mst').insertAdjacentHTML('beforeend', `<div class="stg row"><input type="number" class="stgt" min="1" placeholder="الهدف" style="flex:1"><input type="number" class="stgp" min="1" placeholder="النقاط" style="flex:1"><button type="button" class="btn sm ghost" data-rm>✕</button></div>`);
    $('#mst').onclick = e => { const b = e.target.closest('[data-rm]'); if (b && app.querySelectorAll('.stg').length > 1) b.closest('.stg').remove(); };
    $('#mcancel').onclick = () => { editMissionId = null; pageAdmin('missions'); };
    $('#mf').onsubmit = async e => {
      e.preventDefault();
      const stages = [...app.querySelectorAll('.stg')].map(rw => ({ target: Number(rw.querySelector('.stgt').value), pts: Number(rw.querySelector('.stgp').value) }));
      const body = { title: $('#mt').value, desc: $('#md').value, type: $('#mty').value, active: $('#mac').checked, secret: $('#mse').checked, stages };
      try { if (editing) await aapi('/missions/' + editing.id, 'PUT', body); else await aapi('/missions', 'POST', body); editMissionId = null; pageAdmin('missions'); }
      catch (x) { $('#merr').textContent = x.message; }
    };
  } };
}

async function adminStoryReports(){const {stories}=await aapi('/story-reports');return {html:`<h1>بلاغات الاستوري</h1><p class="mut">الاستوري المبلّغ عنها فقط. الاستوري المنتهية لا تُعرض.</p>`+(stories.length?stories.map(s=>`<div class="card"><b>@${esc(s.owner)}</b>${s.image?`<img src="/api/admin/story-reports/${esc(s.id)}/media" style="max-height:300px;max-width:100%;display:block" alt="استوري مبلّغ عنها">`:`<p>${esc(s.text)}</p>`}${s.reports.map(r=>`<p class="mut">${esc(r.reason||'بدون سبب')}</p>`).join('')}<button class="btn sm" data-sid="${esc(s.id)}" data-sa="delete">حذف الاستوري</button> <button class="btn sm ghost" data-sid="${esc(s.id)}" data-sa="dismiss">تجاهل البلاغ</button></div>`).join(''):'<div class="card empty">مفيش بلاغات استوري.</div>'),bind(){app.onclick=async e=>{const b=e.target.closest('[data-sid]');if(!b)return;await aapi('/story-reports/'+b.dataset.sid+'/'+b.dataset.sa,'POST');pageAdmin('storyreports')}}}}
