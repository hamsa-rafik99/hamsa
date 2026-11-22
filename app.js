const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (p, method = 'GET', data) => { const r = await fetch('/api' + p, { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'حصل خطأ'), { status: r.status }); return j; };
const time = t => new Date(t).toLocaleString('ar-EG', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' });
const origin = location.origin;
let SITE = 'همسه';
const theme = () => localStorage.getItem('theme') || 'dark';
document.documentElement.dataset.theme = theme();
const themeBtn = () => `<button class="theme" id="th" title="الوضع الفاتح/الداكن" onclick="localStorage.setItem('theme', theme() === 'dark' ? 'light' : 'dark'); document.documentElement.dataset.theme = theme()">◐</button>`;
const shell = (inner, nav = '') => `<div class="wrap"><div class="top"><a class="brand" href="#/">${esc(SITE)}</a><div class="row" style="align-items:center">${nav} ${themeBtn()}</div></div>${inner}</div>`;
let timer;
function bubbles(msgs, ownerView, ownerName) {
  return `<div class="chat">${msgs.map(m => { const o = m.from === 'owner'; const lbl = o ? (ownerView ? 'أنت' : esc(ownerName)) : (ownerView ? 'مجهول' : 'أنت (مجهول)'); const mine = ownerView ? o : !o;
    return `<div class="who ${mine ? '' : 'r'}">${lbl}</div><div class="b ${mine ? 'mine' : 'theirs'}">${esc(m.text)}<small>${time(m.t)}</small></div>`; }).join('')}</div>`;
}
const av = (u, cls = '') => u.avatar ? `<img class="av ${cls}" src="${u.avatar}" alt="">` : `<div class="av ${cls}">${esc((u.name || '?')[0])}</div>`;
const nf = n => Number(n).toLocaleString('ar-EG');
const since = t => t ? new Date(t).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }) : '—';
const profileHead = (u, owner) => `<div class="pcard"><div class="cover ${u.cover ? '' : 'nocover'}" ${u.cover ? `style="background-image:url(${u.cover})"` : ''}></div><div class="pbody">${av(u, 'big')}<h1>${esc(u.name)}</h1><div class="handle">@${esc(u.username)}</div>
  <div class="stats" style="grid-template-columns:repeat(${owner ? 4 : 3},1fr)"><div><b>${nf(u.stats.received)}</b><span>رسالة</span></div><div><b>${nf(u.stats.replies)}</b><span>رد</span></div>${owner ? `<div><b>${nf(u.views)}</b><span>زيارة</span></div>` : ''}<div><b>${since(u.since)}</b><span>انضم</span></div></div>
  ${owner && u.bio ? `<p class="bio">${esc(u.bio)}</p>` : ''}</div></div>`;
const copyBtn = (id, text) => `<button class="btn sm ghost" onclick="navigator.clipboard.writeText('${text}');this.textContent='تم النسخ ✓'">نسخ</button>`;

async function route() {
  clearInterval(timer);
  const h = location.hash.slice(1) || '/'; let m;
  try {
    if ((m = h.match(/^\/u\/([a-z0-9_]+)$/))) return pageSend(m[1]);
    if ((m = h.match(/^\/t\/([A-Za-z0-9-]+)$/))) return pageTrack(m[1].toUpperCase());
    if ((m = h.match(/^\/inbox\/([A-Za-z0-9-]+)$/))) return pageThread(m[1].toUpperCase());
    if (h === '/inbox') return pageInbox();
    if (h === '/follow') return pageFollow();
    if (h === '/settings') return pageSettings();
    if (h === '/login' || h === '/signup') return pageAuth(h === '/signup');
    if (h === '/forgot') return pageForgot();
    if ((m = h.match(/^\/reset\/([A-Za-z0-9_-]+)$/))) return pageReset(m[1]);
    if (h === '/outbox') return pageOutbox();
    return pageHome();
  } catch (e) { if (e.status === 401) location.hash = '#/'; else app.innerHTML = shell(`<div class="card center"><h1>مش لاقيين الصفحة</h1><p class="sub">${esc(e.message)}</p><a class="btn" href="#/">الرئيسية</a></div>`); }
}
async function pageHome() {
  let user = null; try { user = await api('/me'); } catch {}
  if (user) { location.hash = '#/inbox'; return; }
  const S = esc(SITE);
  const step = (n, t, d) => `<div class="step"><span class="num">${n}</span><b>${t}</b><p>${d}</p></div>`;
  const feat = (i, t, d) => `<div class="feat"><div class="fi">${i}</div><b>${t}</b><p>${d}</p></div>`;
  app.innerHTML = `<div class="land"><header class="lnav"><a class="brand" href="#/">${S}</a><div class="row">${themeBtn()}<a class="btn sm ghost" href="#/login">دخول</a><a class="btn sm" href="#/signup">حساب جديد</a></div></header>
  <section class="hero"><div class="hcopy"><span class="pill">رسايل مجهولة، وردود حقيقية</span><h1>قول اللي في قلبك.<br>من غير ما حد يعرفك.</h1><p>${S} بيديك لينك خاص. شاركه، واستقبل رسايل صريحة من أصحابك ومتابعينك من غير أسماء، وردّ عليهم في محادثة شكلها شات حديث.</p>
  <div class="row cta"><a class="btn big" href="#/signup">اعمل صفحتك مجانًا</a><a class="btn big ghost" href="#/login">عندي حساب</a></div>
  <form class="follow" id="ff"><input id="fc" dir="ltr" placeholder="معاك كود رسالة؟ اكتبه هنا" autocomplete="off"><button class="btn">تابع الرد</button></form></div>
  <div class="hvis" aria-hidden="true"><div class="phone"><div class="pt">محادثة مجهولة</div><div class="chat"><div class="b mine">محتواك حلو جدًا، كمل كده 😄<small>مجهول</small></div><div class="b theirs">ميرسي ليك! مين حضرتك؟ 😄<small>رد من صاحب الصفحة</small></div><div class="b mine">سر 😉 بس متابعك من زمان<small>مجهول</small></div></div></div></div></section>
  <section class="sec"><h2>إزاي بتشتغل؟</h2><div class="grid3">${step(1, 'اعمل صفحتك', 'سجّل في ثواني واحصل على لينك خاص بيك.')}${step(2, 'شارك اللينك', 'حطه في الستوري أو البايو، وأي حد يقدر يبعتلك رسالة من غير اسم.')}${step(3, 'اقرا وردّ', 'الرسايل بتوصلك، وإنت تردّ، والمرسل يتابع الرد بكود خاص بيه.')}</div></section>
  <section class="sec alt"><h2>ليه ${S}؟</h2><div class="grid4">${feat('✉', 'ردود بشكل شات', 'محادثة حديثة بفقاعات، مش مجرد رسايل منفصلة.')}${feat('✓', 'كود متابعة للمرسل', 'المرسل يفضل مجهول وياخد كود يرجع بيه يشوف الرد.')}${feat('★', 'شارك كصورة', `حوّل المحادثة لصورة عليها اسم ${S} وانشرها على السوشيال.`)}${feat('♥', 'إشعارات', 'تنبيه لما توصلك رسالة، من غير ما نكتب نص الرسالة فيه.')}${feat('✎', 'تحكم كامل', 'احظر، احذف، أو اقفل استقبال الرسايل في أي وقت.')}${feat('☺', 'بروفايل مميز', 'صورة وغلاف ونبذة وإحصائيات لصفحتك.')}</div></section>
  <section class="sec"><div class="endcta"><h2>جاهز تبدأ؟</h2><p>الحساب مجاني وبياخد أقل من دقيقة.</p><a class="btn big" href="#/signup">ابدأ دلوقتي</a></div></section>
  <footer class="lfoot">${S} · رسايل مجهولة بكل احترام</footer></div>`;
  $('#ff').onsubmit = e => { e.preventDefault(); if ($('#fc').value.trim()) location.hash = '#/t/' + $('#fc').value.trim().toUpperCase(); };
}
async function pageAuth(signupFirst) {
  let user = null; try { user = await api('/me'); } catch {}
  if (user) { location.hash = '#/inbox'; return; }
  app.innerHTML = shell(`<div class="card center"><div class="avatar">ص</div><h1>${esc(SITE)}</h1><p class="sub">استقبل رسايل من أصحابك من غير ما يظهر اسمهم. وتقدر ترد عليهم، وهم يتابعوا الرد بكود خاص.</p>
  <div class="tabs"><button class="btn full" id="tl">دخول</button><button class="btn full ghost" id="ts">حساب جديد</button></div>
  <form id="f"><input id="un" placeholder="اسم المستخدم (إنجليزي)" dir="ltr" autocomplete="username"><input id="nm" placeholder="الاسم اللي هيظهر" style="display:none"><input id="em" type="email" dir="ltr" placeholder="الإيميل (لاسترجاع كلمة السر والإشعارات)" style="display:none"><input id="pw" type="password" placeholder="كلمة السر" dir="ltr" autocomplete="current-password"><p class="err" id="er"></p><button class="btn full" id="go">دخول</button><p style="margin:12px 0 0"><a href="#/forgot" id="fg" class="mut">نسيت كلمة السر؟</a></p></form></div>
  <div class="card center"><p class="sub" style="margin:0">معاك كود رسالة بعتها قبل كده؟</p><a class="btn ghost sm" href="#/follow" style="margin-top:8px">تابع الردود</a></div><p class="center" style="margin:8px 0 0"><a class="mut" href="#/">→ الصفحة الرئيسية</a></p>`);
  let signup = false; const set = s => { signup = s; $('#nm').style.display = $('#em').style.display = s ? '' : 'none'; $('#fg').style.display = s ? 'none' : ''; $('#go').textContent = s ? 'إنشاء حساب' : 'دخول'; $('#tl').classList.toggle('ghost', s); $('#ts').classList.toggle('ghost', !s); };
  $('#tl').onclick = () => set(false); $('#ts').onclick = () => set(true); if (signupFirst) set(true);
  $('#f').onsubmit = async e => { e.preventDefault(); try { await api(signup ? '/signup' : '/login', 'POST', { username: $('#un').value, name: $('#nm').value, email: $('#em').value, password: $('#pw').value }); location.hash = '#/inbox'; } catch (x) { $('#er').textContent = x.message; } };
}
async function pageSend(un) {
  const u = await api('/u/' + un);
  app.innerHTML = shell(`${profileHead(u, false)}<div class="card msgcard">
  <div class="quote"><i>”</i>${esc(u.bio || 'همسة صغيرة من القلب... واسمك في أمان، مش هيظهر لحد.')}</div>
  ${u.open ? `<div class="chips">${['رأيك الصريح', 'عندي سؤال', 'نصيحة', 'كلمة مؤجلة'].map(t => `<button type="button" class="chip">${t}</button>`).join('')}</div><form id="f"><textarea id="tx" maxlength="500" placeholder="اكتب رسالتك هنا..." style="min-height:140px"></textarea><div class="counter"><span>الرسالة مجهولة</span><span id="cnt">0/500</span></div><p class="err" id="er"></p><button class="btn full">إرسال بشكل مجهول</button></form>` : `<p class="mut">صاحب الصفحة قافل استقبال الرسايل دلوقتي.</p>`}</div>
  <div class="center mut"><a href="#/follow" class="mut">عندك كود؟ تابع الردود</a> · <a href="#/" class="mut">اعمل صفحتك</a></div>`);
  const tx0 = $('#tx'); if (tx0) { tx0.oninput = () => $('#cnt').textContent = tx0.value.length + '/500'; document.querySelectorAll('.chip').forEach(b => b.onclick = () => { document.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); b.classList.add('on'); if (!tx0.value.trim() || /^\[.*\] /.test(tx0.value)) tx0.value = `[${b.textContent}] `; tx0.focus(); tx0.oninput(); }); }
  const f = $('#f'); if (f) f.onsubmit = async e => { e.preventDefault(); try { const r = await api(`/u/${un}/send`, 'POST', { text: $('#tx').value }); localStorage.setItem('last-code', r.code);
    app.innerHTML = shell(`<div class="card center"><div class="avatar">✓</div><h1>اتبعتت</h1><p class="sub">احفظ الكود ده أو الرابط، وتقدر تتابع بيه لو ${esc(u.name)} رد عليك.</p><div class="codebig">${r.code}</div>
    <div class="linkbox"><span>${origin}/#/t/${r.code}</span>${copyBtn('', origin + '/#/t/' + r.code)}</div><p class="row" style="justify-content:center;margin-top:14px"><a class="btn" href="#/t/${r.code}">افتح المحادثة</a></p><div class="notice">الكود هو الوحيد اللي بيوصل لمحادثتك. لو ضاع مفيش طريقة نرجعه، لأننا مش بنعرف مين أنت.</div></div>`);
  } catch (x) { $('#er').textContent = x.message; } };
}
function pageFollow() {
  app.innerHTML = shell(`<div class="card center"><h1>تابع الردود</h1><p class="sub">اكتب الكود اللي جالك بعد ما بعتّ الرسالة</p><form id="f"><input id="c" dir="ltr" placeholder="XXXXX-XXXXX" value="${esc(localStorage.getItem('last-code') || '')}" style="text-align:center;letter-spacing:2px"><button class="btn full">فتح المحادثة</button></form></div>`);
  $('#f').onsubmit = e => { e.preventDefault(); location.hash = '#/t/' + $('#c').value.trim().toUpperCase(); };
}
async function pageTrack(c) {
  let seen = 0;
  const draw = async (post) => {
    const t = await api('/t/' + c, post ? 'POST' : 'GET', post);
    app.innerHTML = shell(`<div class="card"><div class="center">${av(t.to)}<h1 style="font-size:20px">${esc(t.to.name)}</h1><p class="mut" style="margin:0">محادثة مجهولة · ${t.code}</p><button class="btn sm ghost" id="shr" style="margin-top:8px">📷 شارك كصورة</button></div>${bubbles(t.msgs, false, t.to.name)}
    <form class="composer" id="f"><textarea id="tx" maxlength="1000" placeholder="اكتب رسالة جديدة..."></textarea><button class="send" aria-label="إرسال">➤</button></form>
    ${t.msgs.some(m => m.from === 'owner') ? '' : '<p class="mut center" style="margin-bottom:0">لسه مفيش رد. الصفحة بتتحدث لوحدها.</p>'}</div>`);
    $('#shr').onclick = () => shareDialog(t.msgs, t.to.name, false);
    $('#f').onsubmit = e => { e.preventDefault(); if ($('#tx').value.trim()) draw({ text: $('#tx').value }); };
    seen = t.msgs.length; window.scrollTo(0, document.body.scrollHeight);
  };
  await draw();
  timer = setInterval(async () => { if (document.activeElement && document.activeElement.id === 'tx' && $('#tx').value) return; try { const t = await api('/t/' + c); if (t.msgs.length !== seen) draw(); } catch {} }, 5000);
}
async function pageInbox() {
  const u = await api('/me'), { threads } = await api('/inbox'), link = `${origin}/#/u/${u.username}`;
  app.innerHTML = shell(`${profileHead(u, true)}<div class="card center"><p class="sub">شارك رابطك على ستوري أو بروفايلك واستقبل رسايل مجهولة</p><div class="linkbox"><span>${link}</span>${copyBtn('', link)}</div></div>
  ${threads.length ? threads.map(t => `<a class="thread ${t.unread ? 'unread' : ''}" href="#/inbox/${t.id}"><div class="t"><b>${t.starred ? '⭐ ' : ''}مجهول</b><span class="mut">${time(t.last.t)}</span></div><div class="m mut">${t.last.from === 'owner' ? 'أنت: ' : ''}${esc(t.last.text)}</div><div style="margin-top:4px">${t.count > 1 ? `<span class="badge">${t.count} رسايل</span> ` : ''}${t.replied ? '<span class="badge">اترد عليها</span>' : ''}</div></a>`).join('') : '<div class="empty">مفيش رسايل لسه.<br>أول ما حد يبعتلك هتظهر هنا.</div>'}`,
    `<a class="btn sm ghost" href="#/settings">الإعدادات</a> <button class="btn sm ghost" id="out">خروج</button>`);
  $('#out').onclick = async () => { await api('/logout', 'POST'); location.hash = '#/'; location.reload(); };
  const sig = JSON.stringify(threads.map(t => [t.id, t.count, t.unread, t.starred, t.replied]));
  timer = setInterval(async () => { try { if (location.hash !== '#/inbox') return; const r = await api('/inbox'); if (JSON.stringify(r.threads.map(t => [t.id, t.count, t.unread, t.starred, t.replied])) !== sig) pageInbox(); } catch (e) {} }, 15000);
  document.querySelectorAll('a.thread').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); location.hash = a.getAttribute('href'); }));
}
async function pageThread(id) {
  const t = await api('/inbox/' + id), u0 = await api('/me');
  app.innerHTML = shell(`<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><a href="#/inbox" class="mut">→ الرسايل</a><span class="row"><button class="btn sm ghost" id="shr">📷 صورة</button><button class="btn sm ghost" id="st">${t.starred ? '⭐ مفضلة' : '☆ تفضيل'}</button><button class="btn sm ghost" id="bl">حظر</button><button class="btn sm ghost" id="dl">حذف</button></span></div>${bubbles(t.msgs, true)}
  <form class="composer" id="f"><textarea id="tx" maxlength="1000" placeholder="اكتب ردك... المرسل هيشوفه بالكود بتاعه"></textarea><button class="send" aria-label="إرسال">➤</button></form></div>`);
  $('#f').onsubmit = async e => { e.preventDefault(); if (!$('#tx').value.trim()) return; await api(`/inbox/${id}/reply`, 'POST', { text: $('#tx').value }); pageThread(id); };
  $('#shr').onclick = () => shareDialog(t.msgs, u0.name, true);
  $('#st').onclick = async () => { await api(`/inbox/${id}/star`, 'POST'); pageThread(id); };
  $('#dl').onclick = async () => { if (confirm('تحذف المحادثة؟')) { await api('/inbox/' + id, 'DELETE'); location.hash = '#/inbox'; } };
  $('#bl').onclick = async () => { if (confirm('تحظر المرسل ده؟ مش هيعرف إنه اتحظر.')) { await api(`/inbox/${id}/block`, 'POST'); location.hash = '#/inbox'; } };
  window.scrollTo(0, document.body.scrollHeight);
}
async function pageSettings() {
  const u = await api('/me'), n = await api('/notify');
  const ch = (id, label, val, ph, live, need) => `<div class="chan"><b>${label}</b> <span class="badge">${live ? 'جاهز للإرسال الفعلي' : 'تجريبي محلي'}</span><input id="${id}" dir="ltr" value="${esc(val)}" placeholder="${ph}"><p class="mut" style="margin:-4px 0 4px;font-size:12px">${need}</p></div>`;
  app.innerHTML = shell(`<div class="card"><h1>الملف الشخصي</h1><form id="f"><div class="edit-cover" id="cv" ${u.cover ? `style="background-image:url(${u.cover})"` : ''}><label class="btn sm ghost">غلاف<input type="file" id="cf" accept="image/*" hidden></label></div><div class="row" style="align-items:center;margin:-34px 14px 10px">${av(u, 'big')}<label class="btn sm ghost" style="margin-top:34px">صورة شخصية<input type="file" id="af" accept="image/*" hidden></label><button type="button" class="btn sm ghost" id="rm" style="margin-top:34px">إزالة الصور</button></div><input id="nm" value="${esc(u.name)}" placeholder="الاسم"><textarea id="bio" maxlength="200" placeholder="نبذة عنك (٢٠٠ حرف)" style="min-height:80px">${esc(u.bio)}</textarea><label class="row" style="margin-bottom:12px"><input type="checkbox" id="op" ${u.open ? 'checked' : ''} style="width:auto;margin:0"> استقبل رسايل جديدة</label><button class="btn full">حفظ الملف</button></form></div>
  <div class="card"><h1 style="font-size:20px">الإشعارات</h1><p class="sub">هنبعتلك تنبيه لما توصلك رسالة أو رد جديد (من غير ما نكتب نص الرسالة، بس لينك).</p><form id="nf">
  ${ch('ne', 'إيميل / Gmail', n.email, 'name@gmail.com', n.live.email, 'يحتاج مفتاح خدمة إرسال إيميل (Resend أو SMTP) ودومين مُرسِل')}
  <label class="row" style="margin:-2px 0 12px"><input type="checkbox" id="nen" ${n.nEmail ? 'checked' : ''} style="width:auto;margin:0"> فعّل إشعارات الإيميل</label>
  ${ch('nt', 'تيليجرام (Chat ID)', n.telegram || '', 'مثال: 123456789', n.live.telegram, 'يحتاج بوت تيليجرام (توكن من BotFather) وإنك تبدأ محادثة معاه')}
  ${ch('nw', 'واتساب (رقم بكود الدولة)', n.whatsapp || '', '201001234567', n.live.whatsapp, 'يحتاج حساب WhatsApp Business Cloud API من ميتا ورسائل قوالب معتمدة')}
  <label class="row" style="margin-bottom:6px"><input type="checkbox" id="o1" ${n.onMessage !== false ? 'checked' : ''} style="width:auto;margin:0"> أنبهني لما توصلني رسالة جديدة</label>
  <label class="row" style="margin-bottom:12px"><input type="checkbox" id="o2" ${n.onFollowup !== false ? 'checked' : ''} style="width:auto;margin:0"> أنبهني لما المرسل يكتب رد</label>
  <p class="err" id="ner"></p><div class="row"><button class="btn">حفظ الإشعارات</button><button type="button" class="btn ghost" id="tst">إشعار تجريبي</button></div></form><p class="mut" id="nok" style="margin:8px 0 0"></p>
  <p style="margin:12px 0 0"><a class="mut" href="#/outbox">شوف الرسايل اللي اتجهزت (للتجربة المحلية)</a></p></div>
  <div class="card"><h1 style="font-size:20px">تغيير كلمة السر</h1><form id="pf"><input id="po" type="password" dir="ltr" placeholder="كلمة السر الحالية"><input id="pn" type="password" dir="ltr" placeholder="كلمة السر الجديدة"><p class="err" id="per"></p><button class="btn full ghost">تغيير</button></form></div><a href="#/inbox" class="mut">→ رجوع</a>`);
  const pend = {};
  const shrink = (file, w, h) => new Promise(ok => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), r = Math.max(w / im.width, h / im.height); g.drawImage(im, (w - im.width * r) / 2, (h - im.height * r) / 2, im.width * r, im.height * r); ok(c.toDataURL('image/jpeg', .82)); }; im.src = URL.createObjectURL(file); });
  $('#af').onchange = async e => { if (e.target.files[0]) { pend.avatar = await shrink(e.target.files[0], 256, 256); const el = document.querySelector('.av.big'); el.outerHTML = `<img class="av big" src="${pend.avatar}">`; } };
  $('#cf').onchange = async e => { if (e.target.files[0]) { pend.cover = await shrink(e.target.files[0], 900, 300); $('#cv').style.backgroundImage = `url(${pend.cover})`; } };
  $('#rm').onclick = () => { pend.avatar = ''; pend.cover = ''; $('#cv').style.backgroundImage = ''; };
  $('#f').onsubmit = async e => { e.preventDefault(); await api('/profile', 'POST', { name: $('#nm').value, bio: $('#bio').value, open: $('#op').checked, ...pend }); location.hash = '#/inbox'; };
  const saveN = () => api('/notify', 'POST', { email: $('#ne').value, nEmail: $('#nen').checked, telegram: $('#nt').value, whatsapp: $('#nw').value, onMessage: $('#o1').checked, onFollowup: $('#o2').checked });
  $('#nf').onsubmit = async e => { e.preventDefault(); try { await saveN(); $('#nok').textContent = 'اتحفظت ✓'; $('#ner').textContent = ''; } catch (x) { $('#ner').textContent = x.message; } };
  $('#tst').onclick = async () => { try { await saveN(); const r = await api('/notify/test', 'POST'); $('#nok').textContent = r.sent ? `اتجهز ${r.sent} إشعار تجريبي ✓` : 'مفيش قناة مفعّلة'; } catch (x) { $('#ner').textContent = x.message; } };
  $('#pf').onsubmit = async e => { e.preventDefault(); try { await api('/password', 'POST', { old: $('#po').value, password: $('#pn').value }); $('#per').style.color = '#1a8f4c'; $('#per').textContent = 'اتغيرت ✓'; $('#po').value = $('#pn').value = ''; } catch (x) { $('#per').style.color = ''; $('#per').textContent = x.message; } };
}
function pageForgot() {
  app.innerHTML = shell(`<div class="card center"><div class="avatar">؟</div><h1>نسيت كلمة السر؟</h1><p class="sub">اكتب اسم المستخدم أو الإيميل اللي سجلت بيه وهنبعتلك لينك لتغييرها.</p><form id="f"><input id="id" dir="ltr" placeholder="اسم المستخدم أو الإيميل"><p class="err" id="er"></p><button class="btn full">ابعتلي اللينك</button></form><p style="margin:12px 0 0"><a class="mut" href="#/login">→ رجوع للدخول</a></p></div>`);
  $('#f').onsubmit = async e => { e.preventDefault(); try { await api('/forgot', 'POST', { id: $('#id').value }); $('.card').innerHTML = `<div class="avatar">@</div><h1>تم</h1><p class="sub">لو الحساب موجود وعليه إيميل، هيوصله لينك الاسترجاع (صالح ساعة). مش هنقول إذا كان الحساب موجود ولا لأ، لحمايتك.</p><a class="btn ghost" href="#/login">رجوع</a>`; } catch (x) { $('#er').textContent = x.message; } };
}
function pageReset(tok) {
  app.innerHTML = shell(`<div class="card center"><div class="avatar">*</div><h1>كلمة سر جديدة</h1><form id="f"><input id="pw" type="password" dir="ltr" placeholder="كلمة السر الجديدة" autocomplete="new-password"><p class="err" id="er"></p><button class="btn full">حفظ ودخول</button></form></div>`);
  $('#f').onsubmit = async e => { e.preventDefault(); try { await api('/reset', 'POST', { token: tok, password: $('#pw').value }); $('.card').innerHTML = `<div class="avatar">✓</div><h1>اتغيرت كلمة السر</h1><p class="sub">تقدر تدخل بيها دلوقتي.</p><a class="btn" href="#/login">دخول</a>`; } catch (x) { $('#er').textContent = x.message; } };
}
async function pageOutbox() {
  const { outbox } = await api('/dev/outbox'); const ic = { email: '✉ إيميل', telegram: '✈ تيليجرام', whatsapp: '💬 واتساب' };
  app.innerHTML = shell(`<div class="card"><h1 style="font-size:20px">صندوق التجربة</h1><p class="sub">الرسايل اللي النظام جهزها. من غير مفاتيح خدمات خارجية بتتحفظ هنا بس ومبتتبعتش فعلياً. الصفحة دي للتطوير وبتتقفل في النسخة العامة.</p>
  ${outbox.length ? outbox.map(o => `<div class="out"><div class="t"><b>${ic[o.channel] || o.channel}</b><span class="mut">${time(o.t)}</span></div><div dir="ltr" class="mut" style="text-align:right">${esc(o.to)}</div><div><b>${esc(o.subject)}</b></div><div class="mut" style="white-space:pre-wrap;word-break:break-all">${esc(o.text)}</div><span class="badge">${esc(o.status)}</span></div>`).join('') : '<div class="empty">مفيش رسايل لسه.</div>'}</div><a href="#/settings" class="mut">→ رجوع</a>`);
}
addEventListener('hashchange', route);
fetch('/api/config').then(r => r.json()).then(c => { SITE = c.name; document.title = c.name; }).catch(() => {}).finally(route);
// ---- share a conversation as an image (drawn in the browser, nothing is uploaded)
function wrap(g, text, maxW) { const out = []; for (const para of text.split('\n')) { let line = ''; for (const w of para.split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } out.push(line); } return out; }
function chatImage(msgs, ownerName, ownerView) {
  const W = 1080, P = 70, BW = 760, F = 38, LH = 56, g0 = document.createElement('canvas').getContext('2d'); g0.font = `${F}px "Segoe UI",Tahoma,sans-serif`;
  const items = msgs.slice(-8).map(m => { const mine = ownerView ? m.from === 'owner' : m.from === 'anon'; const lines = wrap(g0, m.text, BW - 80); return { mine, lines, h: lines.length * LH + 50 }; });
  const head = 300, foot = 170, H = head + items.reduce((a, i) => a + i.h + 26, 0) + foot;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.direction = 'rtl';
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#c8402b'); bg.addColorStop(1, '#ff9a5c'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.96)'; g.beginPath(); g.roundRect(40, 190, W - 80, H - 190 - 120, 44); g.fill();
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = 'bold 86px "Segoe UI",Tahoma,sans-serif'; g.fillText(SITE, W / 2, 120);
  g.font = '34px "Segoe UI",Tahoma,sans-serif'; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText('محادثة مجهولة مع ' + ownerName, W / 2, 168);
  let y = head - 40; g.font = `${F}px "Segoe UI",Tahoma,sans-serif`;
  for (const it of items) { const w = Math.max(...it.lines.map(l => g.measureText(l).width)) + 80, x = it.mine ? W - P - 20 - w : P + 20;
    g.fillStyle = it.mine ? '#e0553b' : '#f6ece5'; g.beginPath(); g.roundRect(x, y, w, it.h, 34); g.fill();
    g.fillStyle = it.mine ? '#fff' : '#241a16'; g.textAlign = 'right'; it.lines.forEach((l, i) => g.fillText(l, x + w - 40, y + 62 + i * LH)); y += it.h + 26; }
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = 'bold 40px "Segoe UI",Tahoma,sans-serif'; g.fillText('ابعت رسالة مجهولة على ' + SITE, W / 2, H - 52);
  return c;
}
function shareDialog(msgs, ownerName, ownerView) {
  const c = chatImage(msgs, ownerName, ownerView), url = c.toDataURL('image/png');
  const d = document.createElement('div'); d.className = 'modal';
  d.innerHTML = `<div class="mbox"><img src="${url}" alt="معاينة"><div class="row" style="justify-content:center;margin-top:12px"><button class="btn" id="dl2">تنزيل الصورة</button><button class="btn ghost" id="sh2">مشاركة</button><button class="btn ghost" id="cl2">إغلاق</button></div></div>`;
  document.body.appendChild(d);
  c.toBlob(b => { const f = new File([b], 'chat.png', { type: 'image/png' });
    $('#dl2').onclick = () => { const a = document.createElement('a'); a.href = url; a.download = SITE + '-chat.png'; a.click(); };
    $('#sh2').onclick = () => navigator.canShare && navigator.canShare({ files: [f] }) ? navigator.share({ files: [f] }).catch(() => {}) : $('#dl2').click(); });
  $('#cl2').onclick = () => d.remove(); d.onclick = e => { if (e.target === d) d.remove(); };
}
