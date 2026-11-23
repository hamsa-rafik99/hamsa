const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (p, method = 'GET', data) => { const r = await fetch('/api' + p, { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'حصل خطأ'), { status: r.status }); return j; };
const time = t => new Date(t).toLocaleString('ar-EG', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' });
const origin = location.origin;
let SITE = 'همسه';
const theme = () => localStorage.getItem('theme') || 'dark';
document.documentElement.dataset.theme = theme();
const themeBtn = () => `<button class="theme" data-act="theme" title="الوضع الفاتح/الداكن" aria-label="تغيير الثيم">◐</button>`;
const shell = (inner, nav) => `<div class="wrap"><div class="top"><a class="brand" href="#/">${esc(SITE)}</a><div class="row" style="align-items:center">${nav === undefined ? themeBtn() : nav}</div></div>${inner}</div>`;
const ics = p => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const icGear = ics('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>');
const icMoon = ics('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>');
const icUsers = ics('<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>');
const icOut = ics('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>');
const icStar = ics('<path d="M12 2.5l2.9 6.2 6.8.7-5.1 4.6 1.4 6.7-6-3.4-6 3.4 1.4-6.7L2.3 9.4l6.8-.7z"/>');
const icCopy = ics('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>');
const userMenu = u => `<div class="umenu"><button class="uav" data-act="menu" aria-label="القائمة">${u.avatar ? `<img src="${u.avatar}" alt="${esc(u.name || '')}">` : `<span>${esc((u.name || '?')[0])}</span>`}</button><div class="udrop" hidden>
<div class="uhead">${av(u)}<div class="uhi"><b>${esc(u.name)}</b><span class="mut" dir="ltr">@${esc(u.username)}</span></div></div>
<a class="uit" href="#/settings">${icGear}<span>الإعدادات</span></a>
<a class="uit" href="#/missions">${icStar}<span>المهمات</span></a>
<button class="uit" data-act="theme">${icMoon}<span class="mlab">${theme() === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}</span></button>
<button class="uit" data-act="inv">${icUsers}<span>الدعوات</span></button>
<button class="uit danger" data-act="out">${icOut}<span>تسجيل الخروج</span></button></div></div>`;
async function invitePanel() {
  document.querySelectorAll('.udrop').forEach(d => d.hidden = true);
  let iv; try { iv = await api('/invite'); } catch { return; }
  const link = `${origin}/#/join/${iv.code}`;
  const d = document.createElement('div'); d.className = 'modal';
  d.innerHTML = `<div class="mbox"><h2 style="margin:2px 0 4px;font-size:19px">الدعوات</h2><p class="sub">شارك لينكك الخاص، وكل واحد يسجل منه بيتحسب ليك.</p>
  <div class="istats"><div><b>${nf(iv.count)}</b><span>انضموا من لينكك</span></div><div><b>${nf(iv.visits || 0)}</b><span>زيارة للينك</span></div></div>
  <div class="invlink" dir="ltr">${esc(link)}</div>
  <button class="copybtn" data-act="copy" data-text="${esc(link)}">${icCopy}<span>نسخ اللينك</span></button>
  ${navigator.share ? `<button class="btn full" data-act="share" data-text="${esc(link)}" style="margin-top:10px">مشاركة اللينك</button>` : ''}
  <button class="btn ghost full" style="margin-top:10px" data-act="x">إغلاق</button></div>`;
  document.body.appendChild(d);
  d.onclick = e => { if (e.target === d || e.target.closest('[data-act=x]')) d.remove(); };
}
let timer;
const plane = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>`;
function bubbles(msgs, ownerView, ownerName, ownerAv) {
  let prev = null;
  const rows = msgs.map(m => { const o = m.from === 'owner'; const mine = ownerView ? o : !o; const cont = prev === m.from; prev = m.from;
    const lbl = o ? (ownerView ? 'أنت' : esc(ownerName)) : (ownerView ? 'مجهول' : 'أنت (مجهول)');
    const wav = o ? (ownerAv ? `<img class="wav" src="${ownerAv}" alt="">` : `<span class="wav">${esc((ownerName || '?')[0])}</span>`) : `<span class="wav anon">؟</span>`;
    const chip = cont ? '' : `<div class="who ${mine ? '' : 'r'}"><span class="wchip">${wav}${lbl}</span></div>`;
    return `${chip}<div class="b ${mine ? 'mine' : 'theirs'}${cont ? ' c' : ''}">${esc(m.text)}<small>${time(m.t)}</small></div>`; }).join('');
  return `<div class="conv"><div class="hbrand"><span class="hb-mark">${esc(SITE)}</span><i></i><span>محادثة مجهولة</span></div><div class="chat">${rows}</div></div>`;
}
const brandline = () => `<div class="brandline">من <b>${esc(SITE)}</b> · رسايل مجهولة، وردود حقيقية</div>`;
const av = (u, cls = '') => u.avatar ? `<img class="av ${cls}" src="${u.avatar}" alt="${esc(u.name || '')}">` : `<div class="av ${cls}">${esc((u.name || '?')[0])}</div>`;
const nf = n => Number(n).toLocaleString('ar-EG');
const since = t => t ? new Date(t).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }) : '—';
const profileHead = (u, owner) => `<div class="pcard"><div class="cover ${u.cover ? '' : 'nocover'}" ${u.cover ? `style="background-image:url(${u.cover});background-position:center ${u.covery ?? 50}%"` : ''}></div><div class="pbody">${av(u, 'big')}<h1>${esc(u.name)}</h1><div class="handle">@${esc(u.username)}</div>
  ${u.bio ? `<p class="bio">${esc(u.bio)}</p>` : ''}
  <div class="stats" style="grid-template-columns:repeat(${owner ? 4 : 3},1fr)"><div><b>${nf(u.stats.received)}</b><span>رسالة</span></div><div><b>${nf(u.stats.replies)}</b><span>رد</span></div>${owner ? `<div><b>${nf(u.views)}</b><span>زيارة</span></div>` : ''}<div><b>${since(u.since)}</b><span>انضم</span></div></div></div></div>`;
const bigCopy = (text, label) => `<div class="invlink" dir="ltr">${esc(text)}</div><button class="copybtn" data-act="copy" data-text="${esc(text)}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg><span>${label}</span></button>`;
const copyBtn = (id, text) => `<button class="btn sm ghost" data-act="copy" data-text="${esc(text)}">نسخ</button>`;
// auto-growing composer textarea
const grow = t => { t.style.height = '46px'; const h = Math.min(t.scrollHeight, 120); t.style.height = h + 'px'; t.style.overflowY = t.scrollHeight > 120 ? 'auto' : 'hidden'; };
document.addEventListener('input', e => { if (e.target.matches('.composer textarea')) grow(e.target); });

// per-profile share banner (og:image): drawn on canvas here (perfect Arabic shaping), uploaded once, served at /og/u/<handle>
async function drawBanner(u) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const g = c.getContext('2d'); g.direction = 'rtl';
  g.fillStyle = '#171210'; g.fillRect(0, 0, 1200, 630);
  const orb = (x, y, r, col) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(224,85,59,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  orb(70, 30, 400, 'rgba(224,85,59,.5)'); orb(1130, 600, 440, 'rgba(255,138,76,.38)');
  const grad = (x0, x1) => { const r = g.createLinearGradient(x0, 0, x1, 0); r.addColorStop(0, '#e0553b'); r.addColorStop(1, '#ff8a4c'); return r; };
  g.textAlign = 'center';
  g.fillStyle = grad(430, 770); g.font = 'bold 72px Tahoma,"Segoe UI",sans-serif';
  g.fillText(SITE, 600, 105);
  const ax = 600, ay = 245, ar = 100;
  g.save(); g.beginPath(); g.arc(ax, ay, ar, 0, 7); g.clip();
  if (u.avatar) {
    const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u.avatar; });
    const s = Math.max(2 * ar / im.width, 2 * ar / im.height);
    g.drawImage(im, ax - im.width * s / 2, ay - im.height * s / 2, im.width * s, im.height * s);
  } else {
    g.fillStyle = '#3a312c'; g.fillRect(ax - ar, ay - ar, 2 * ar, 2 * ar);
    g.fillStyle = '#cfc5bd'; g.font = 'bold 90px Tahoma,sans-serif'; g.fillText((u.name || '؟')[0], ax, ay + 32);
  }
  g.restore();
  g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(ax, ay, ar + 4, 0, 7); g.stroke();
  g.fillStyle = '#f4ede7'; g.font = 'bold 62px Tahoma,"Segoe UI",sans-serif'; g.fillText(u.name || u.username, 600, 425);
  g.fillStyle = 'rgba(244,237,231,.7)'; g.font = '38px Tahoma,sans-serif'; g.direction = 'ltr'; g.fillText('@' + u.username, 600, 482); g.direction = 'rtl';
  g.fillStyle = grad(260, 940); g.font = 'bold 44px Tahoma,"Segoe UI",sans-serif';
  g.fillText('صارحني من غير ما تقول مين انت', 600, 565);
  return c.toDataURL('image/jpeg', .85);
}
async function genBanner(u) { try { const img = await drawBanner(u); await api('/og-image', 'POST', { img }); } catch {} }

// long-press (or right-click) a bubble to peek at its time; tap anywhere else to hide
let lpT;
const showT = b => { document.querySelectorAll('.b.showt').forEach(x => x.classList.remove('showt')); b.classList.add('showt'); };
document.addEventListener('contextmenu', e => { const b = e.target.closest('.b'); if (b) { e.preventDefault(); showT(b); } });
document.addEventListener('pointerdown', e => { clearTimeout(lpT); const b = e.target.closest('.b'); if (b) lpT = setTimeout(() => showT(b), 450); });
document.addEventListener('pointerup', () => clearTimeout(lpT));
document.addEventListener('pointercancel', () => clearTimeout(lpT));
document.addEventListener('pointermove', () => clearTimeout(lpT));
document.addEventListener('click', e => { if (!e.target.closest('.b')) document.querySelectorAll('.b.showt').forEach(x => x.classList.remove('showt')); });

// one delegated click handler instead of inline onclick attributes (lets the CSP forbid inline scripts)
document.addEventListener('click', e => {
  const mbtn = e.target.closest('[data-act=menu]');
  document.querySelectorAll('.udrop:not([hidden])').forEach(d => { if (!mbtn || d.parentElement.querySelector('[data-act=menu]') !== mbtn) d.hidden = true; });
  if (mbtn) { const d = mbtn.parentElement.querySelector('.udrop'); d.hidden = !d.hidden; return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'theme') { localStorage.setItem('theme', theme() === 'dark' ? 'light' : 'dark'); document.documentElement.dataset.theme = theme(); document.querySelectorAll('.mlab').forEach(s => s.textContent = theme() === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'); }
  if (b.dataset.act === 'out') api('/logout', 'POST').finally(() => { location.hash = '#/'; location.reload(); });
  if (b.dataset.act === 'inv') invitePanel();
  if (b.dataset.act === 'share') { navigator.share({ title: SITE, text: b.dataset.stext || ('سجّل على ' + SITE + ' واستقبل رسايل مجهولة'), url: b.dataset.text }).then(() => api('/event', 'POST', { t: 'share' }).catch(() => {})).catch(() => {}); }
  if (b.dataset.act === 'copy') { const done = () => { const l = b.querySelector('span'); (l || b).textContent = 'تم النسخ ✓'; b.classList.add('done'); }; (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.text).then(done, done) : done()); }
});

// the admin UI is a separate file, fetched only when someone opens #/admin
let adminLoaded;
async function loadAdmin(tab) {
  if (!adminLoaded) adminLoaded = new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = '/admin-ui.js'; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
  await adminLoaded; return pageAdmin(tab || 'overview');
}
async function route() {
  clearInterval(timer);
  document.querySelector('.storymodal')?.remove();
  const h = location.hash.slice(1) || '/'; let m;
  try {
    if ((m = h.match(/^\/u\/([a-z0-9_]+)$/))) return pageSend(m[1]);
    if ((m = h.match(/^\/t\/([A-Za-z0-9-]+)$/))) return pageTrack(m[1].toUpperCase());
    if ((m = h.match(/^\/inbox\/([A-Za-z0-9-]+)$/))) return pageThread(m[1].toUpperCase());
    if (h === '/inbox') return pageInbox();
    if (h === '/stories/new') return pageStoryCompose();
    if (h === '/follow') return pageFollow();
    if (h === '/settings') return pageSettings();
    if (h === '/missions') return pageMissions();
    if (h === '/settings/invite') { await pageSettings(); const c = document.querySelector('.invite'); if (c) { c.scrollIntoView({ block: 'center' }); c.classList.add('flash'); } return; }
    if (h === '/login' || h === '/signup') return pageAuth(h === '/signup');
    if (h === '/forgot') return pageForgot();
    if ((m = h.match(/^\/reset\/([A-Za-z0-9_-]+)$/))) return pageReset(m[1]);
    if (h === '/outbox') return pageOutbox();
    if ((m = h.match(/^\/join\/([A-Za-z0-9_-]{4,16})$/))) { sessionStorage.setItem('ref', m[1]); return pageJoin(m[1]); }
    if ((m = h.match(/^\/admin(?:\/([a-z]+))?$/))) return loadAdmin(m[1]);
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
  <div class="tabwrap"><div class="chipbar" id="lchips"><button class="chip on" type="button">المهمات والنقاط</button><button class="chip" type="button">إزاي بتشتغل؟</button><button class="chip" type="button">ليه ${S}؟</button></div><div class="tpanes" id="lpanes">
  <div class="tpanel on"><h2 class="panelheading">المهمات والنقاط</h2><div class="tmcard">
  <div class="tmlock"><span class="tmq">؟؟؟</span><div class="tmgrow"><b>مهمات مخفية</b><span>محدش يعرفها... هتتكشف لو عملتها بالصدفة</span></div></div>
  <div class="tmlock"><span class="tmq">؟؟؟</span><div class="tmgrow"><b>مهمات مخفية</b><span>وفي كمان، وكمان...</span></div></div>
  <div class="tmhook">كن أول واحد يكتشف المهمات المخفية ☝️</div>
  <div class="tmmini"><span class="tmic">★</span><div class="tmgrow"><b>استقبل رسايل على صفحتك</b><span>كل خطوة ليها مكافأة</span></div><span class="tmpts">+١٠</span></div>
  <div class="tmmini"><span class="tmic">★</span><div class="tmgrow"><b>ادعُ أصحابك</b><span>مراحل بتتفتح واحدة ورا التانية</span></div><span class="tmpts">+٥٠</span></div>
  <div class="tmmini"><span class="tmic">★</span><div class="tmgrow"><b>كمّل ملفك وانشر لينكك</b><span>نقط سهلة من أول يوم</span></div><span class="tmpts">+٢٥</span></div>
  <p class="mut" style="text-align:center;font-size:13px;margin:10px 0">سجل دلوقتي وابدأ اكسب نقط</p>
  <a class="btn big full" href="#/signup" style="display:block;text-align:center">اعمل صفحتك مجاناً</a></div></div>
  <div class="tpanel"><h2 class="panelheading">إزاي بتشتغل؟</h2><div class="grid3">${step(1, 'اعمل صفحتك', 'سجّل في ثواني واحصل على لينك خاص بيك.')}${step(2, 'شارك اللينك', 'حطه في الستوري أو البايو، وأي حد يقدر يبعتلك رسالة من غير اسم.')}${step(3, 'اقرا وردّ', 'الرسايل بتوصلك، وإنت تردّ، والمرسل يتابع الرد بكود خاص بيه.')}</div></div>
  <div class="tpanel"><h2 class="panelheading">ليه ${S}؟</h2><div class="grid4">${feat('✉', 'ردود بشكل شات', 'محادثة حديثة بفقاعات، مش مجرد رسايل منفصلة.')}${feat('✓', 'كود متابعة للمرسل', 'المرسل يفضل مجهول وياخد كود يرجع بيه يشوف الرد.')}${feat('★', 'شارك كصورة', `حوّل المحادثة لصورة عليها اسم ${S} وانشرها على السوشيال.`)}${feat('♥', 'إشعارات', 'تنبيه لما توصلك رسالة، من غير ما نكتب نص الرسالة فيه.')}${feat('✎', 'تحكم كامل', 'احظر، احذف، أو اقفل استقبال الرسايل في أي وقت.')}${feat('☺', 'بروفايل مميز', 'صورة وغلاف ونبذة وإحصائيات لصفحتك.')}</div></div>
  </div></div>
  <section class="sec"><div class="endcta"><h2>جاهز تبدأ؟</h2><p>الحساب مجاني وبياخد أقل من دقيقة.</p><a class="btn big" href="#/signup">ابدأ دلوقتي</a></div></section>
  <footer class="lfoot">${S} · رسايل مجهولة بكل احترام</footer></div>`;
  $('#ff').onsubmit = e => { e.preventDefault(); if ($('#fc').value.trim()) location.hash = '#/t/' + $('#fc').value.trim().toUpperCase(); };
  const lchips=[...document.querySelectorAll('#lchips .chip')],lpanes=[...document.querySelectorAll('#lpanes .tpanel')];let lcur=0;
  const lshow=li=>{lcur=li;lchips.forEach((c,j)=>c.classList.toggle('on',j===li));lpanes.forEach((p,j)=>p.classList.toggle('on',j===li));};
  let ltimer=setInterval(()=>{if(!document.contains(lchips[0])){clearInterval(ltimer);return}lshow((lcur+1)%3)},3000);
  lchips.forEach((c,li)=>c.onclick=()=>{clearInterval(ltimer);lshow(li)});
}
async function pageJoin(code) {
  let inviter = null; try { inviter = await api('/invite/' + code); } catch { sessionStorage.removeItem('ref'); }
  await pageAuth(true);
  if (inviter && $('.card')) $('.card').insertAdjacentHTML('afterbegin', `<div class="note">${esc(inviter.name)} دعاك تنضم لـ ${esc(SITE)}</div>`);
}
async function pageAuth(signupFirst) {
  let user = null; try { user = await api('/me'); } catch {}
  if (user) { location.hash = '#/inbox'; return; }
  app.innerHTML = shell(`<div class="card center"><div class="avatar">ه</div><h1>${esc(SITE)}</h1><p class="sub">استقبل رسايل من أصحابك من غير ما يظهر اسمهم. وتقدر ترد عليهم، وهم يتابعوا الرد بكود خاص.</p>
  <div class="tabs"><button class="btn full" id="tl">دخول</button><button class="btn full ghost" id="ts">حساب جديد</button></div>
  <form id="f"><input id="un" placeholder="اسم المستخدم أو الإيميل" dir="ltr" autocomplete="username" autocapitalize="none" spellcheck="false"><input id="nm" placeholder="الاسم اللي هيظهر" style="display:none"><input id="em" type="email" dir="ltr" placeholder="الإيميل (لاسترجاع كلمة السر والإشعارات)" style="display:none"><input id="pw" type="password" placeholder="كلمة السر" dir="ltr" autocomplete="current-password"><p class="err" id="er"></p><button class="btn full" id="go">دخول</button><p style="margin:12px 0 0"><a href="#/forgot" id="fg" class="mut">نسيت كلمة السر؟</a></p></form></div>
  <div class="card center"><p class="sub" style="margin:0">معاك كود رسالة بعتها قبل كده؟</p><a class="btn ghost sm" href="#/follow" style="margin-top:8px">تابع الردود</a></div><p class="center" style="margin:8px 0 0"><a class="mut" href="#/">→ الصفحة الرئيسية</a></p>`);
  let signup = false; const set = s => { signup = s; $('#nm').style.display = $('#em').style.display = s ? '' : 'none'; $('#fg').style.display = s ? 'none' : ''; $('#un').placeholder = s ? 'اسم المستخدم (إنجليزي)' : 'اسم المستخدم أو الإيميل'; $('#go').textContent = s ? 'إنشاء حساب' : 'دخول'; $('#tl').classList.toggle('ghost', s); $('#ts').classList.toggle('ghost', !s); };
  $('#tl').onclick = () => set(false); $('#ts').onclick = () => set(true); if (signupFirst) set(true);
  $('#f').onsubmit = async e => { e.preventDefault(); try { await api(signup ? '/signup' : '/login', 'POST', { username: $('#un').value, name: $('#nm').value, email: $('#em').value, password: $('#pw').value, ref: sessionStorage.getItem('ref') || '' }); location.hash = '#/inbox'; } catch (x) { $('#er').textContent = x.message; } };
}
async function pageSend(un) {
  const u = await api('/u/' + un);
  app.innerHTML = shell(`${profileHead(u, false)}<div class="card msgcard">
  ${u.bio ? '' : `<div class="quote"><i>”</i>همسة صغيرة من القلب... واسمك في أمان، مش هيظهر لحد.</div>`}
  ${u.open ? `<div class="chips">${['رأيك الصريح', 'عندي سؤال', 'نصيحة', 'كلمة مؤجلة'].map(t => `<button type="button" class="chip">${t}</button>`).join('')}</div><form id="f"><textarea id="tx" maxlength="500" placeholder="اكتب رسالتك هنا..." style="min-height:140px"></textarea><div class="counter"><span>الرسالة مجهولة</span><span id="cnt">0/500</span></div><p class="err" id="er"></p><button class="btn full">إرسال بشكل مجهول</button></form>` : `<p class="mut">صاحب الصفحة قافل استقبال الرسايل دلوقتي.</p>`}</div>
  <div class="center mut"><a href="#/follow" class="mut">عندك كود؟ تابع الردود</a> · <a href="#/" class="mut">اعمل صفحتك</a></div>`);
  const tx0 = $('#tx'); if (tx0) { tx0.oninput = () => $('#cnt').textContent = tx0.value.length + '/500'; document.querySelectorAll('.chip').forEach(b => b.onclick = () => { document.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); b.classList.add('on'); if (!tx0.value.trim() || /^\[.*\] /.test(tx0.value)) tx0.value = `[${b.textContent}] `; tx0.focus(); tx0.oninput(); }); }
  const f = $('#f'); if (f) f.onsubmit = async e => { e.preventDefault(); try { const r = await api(`/u/${un}/send`, 'POST', { text: $('#tx').value }); localStorage.setItem('last-code', r.code);
    app.innerHTML = shell(`<div class="card center"><div class="avatar">✓</div><h1>اتبعتت</h1><p class="sub">احفظ الكود ده أو الرابط، وتقدر تتابع بيه لو ${esc(u.name)} رد عليك.</p><div class="codebig">${r.code}</div>
    ${bigCopy(origin + '/#/t/' + r.code, 'نسخ اللينك')}<p class="row" style="justify-content:center;margin-top:14px"><a class="btn" href="#/t/${r.code}">افتح المحادثة</a></p><div class="notice">الكود هو الوحيد اللي بيوصل لمحادثتك. لو ضاع مفيش طريقة نرجعه، لأننا مش بنعرف مين أنت.</div></div>`);
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
    app.innerHTML = shell(`<div class="card"><div class="center">${av(t.to)}<h1 style="font-size:20px">${esc(t.to.name)}</h1><p class="mut" style="margin:0">محادثة مجهولة · ${t.code}</p><button class="btn sm ghost" id="shr" style="margin-top:8px">📷 شارك كصورة</button></div>${bubbles(t.msgs, false, t.to.name, t.to.avatar)}
    <form class="composer" id="f"><textarea id="tx" maxlength="1000" placeholder="اكتب رسالتك..."></textarea><button class="send" aria-label="إرسال">${plane}</button></form>${brandline()}
    ${t.msgs.some(m => m.from === 'owner') ? '' : '<p class="mut center" style="margin-bottom:0">لسه مفيش رد. الصفحة بتتحدث لوحدها.</p>'}</div>`);
    $('#shr').onclick = () => shareDialog(t.msgs, t.to.name, false);
    $('#f').onsubmit = e => { e.preventDefault(); if ($('#tx').value.trim()) draw({ text: $('#tx').value }); };
    seen = t.msgs.length; window.scrollTo(0, document.body.scrollHeight);
  };
  await draw();
  timer = setInterval(async () => { if (document.activeElement && document.activeElement.id === 'tx' && $('#tx').value) return; try { const t = await api('/t/' + c); if (t.msgs.length !== seen) draw(); } catch {} }, 5000);
}
async function pageInbox() {
  const u = await api('/me'), { threads } = await api('/inbox'), link = `${origin}/u/${u.username}`;
  if (!u.ogimg) genBanner(u);
  const shareTxt = `صارحني من غير ما تقول مين انت: ابعتلي رسالة مجهولة على ${SITE} وهرد عليك، وهتتابع ردّي من نفس اللينك`;
  app.innerHTML = shell(`<div id="storystrip"></div>${profileHead(u, true)}<div class="card center"><p class="sub">شارك رابطك على ستوري أو بروفايلك واستقبل رسايل مجهولة</p>${bigCopy(link, 'نسخ اللينك')}${navigator.share ? `<button class="btn full" data-act="share" data-text="${esc(link)}" data-stext="${esc(shareTxt)}" style="margin-top:10px">شارك لينكك</button>` : ''}</div>
  ${threads.length ? `<div class="sect"><b>الرسايل</b><span class="badge new">${nf(threads.length)}</span></div>` + threads.map(t => `<a class="thread ${t.unread ? 'unread' : ''}" href="#/inbox/${t.id}"><span class="tav">${t.starred ? '★' : '؟'}</span><div class="tc"><div class="t"><b>مجهول</b><span class="mut">${time(t.last.t)}</span></div><div class="m mut">${t.last.from === 'owner' ? 'أنت: ' : ''}${esc(t.last.text)}</div><div class="tb">${t.unread ? '<span class="badge new">جديدة</span>' : ''}${t.count > 1 ? `<span class="badge">${nf(t.count)} رسايل</span>` : ''}${t.replied ? '<span class="badge soft">اترد عليها</span>' : ''}</div></div></a>`).join('') : '<div class="empty">مفيش رسايل لسه.<br>أول ما حد يبعتلك هتظهر هنا.</div>'}`,
    `<a class="btn sm" href="#/settings/invite">+ ادعُ أصحابك</a>${userMenu(u)}`);
  loadStoryStrip();
  const sig = JSON.stringify(threads.map(t => [t.id, t.count, t.unread, t.starred, t.replied]));
  timer = setInterval(async () => { try { if (location.hash !== '#/inbox') return; const r = await api('/inbox'); if (JSON.stringify(r.threads.map(t => [t.id, t.count, t.unread, t.starred, t.replied])) !== sig) pageInbox(); } catch (e) {} }, 15000);
  document.querySelectorAll('a.thread').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); location.hash = a.getAttribute('href'); }));
}
async function pageThread(id) {
  const t = await api('/inbox/' + id), u0 = await api('/me');
  app.innerHTML = shell(`<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><a href="#/inbox" class="mut">→ الرسايل</a><span class="row"><button class="btn sm ghost" id="shr">📷 صورة</button><button class="btn sm ghost" id="st">${t.starred ? '⭐ مفضلة' : '☆ تفضيل'}</button><button class="btn sm ghost" id="rp">إبلاغ</button><button class="btn sm ghost" id="bl">حظر</button><button class="btn sm ghost" id="dl">حذف</button></span></div>${bubbles(t.msgs, true, u0.name, u0.avatar)}
  <form class="composer" id="f"><textarea id="tx" maxlength="1000" placeholder="اكتب ردك..."></textarea><button class="send" aria-label="إرسال">${plane}</button></form>${brandline()}</div>`, userMenu(u0));
  $('#f').onsubmit = async e => { e.preventDefault(); if (!$('#tx').value.trim()) return; await api(`/inbox/${id}/reply`, 'POST', { text: $('#tx').value }); pageThread(id); };
  $('#shr').onclick = () => shareDialog(t.msgs, u0.name, true);
  $('#st').onclick = async () => { await api(`/inbox/${id}/star`, 'POST'); pageThread(id); };
  $('#dl').onclick = async () => { if (confirm('تحذف المحادثة؟')) { await api('/inbox/' + id, 'DELETE'); location.hash = '#/inbox'; } };
  $('#rp').onclick = async () => { const reason = prompt('سبب البلاغ (اختياري). الإدارة هتشوف المحادثة دي بس.'); if (reason === null) return; await api(`/inbox/${id}/report`, 'POST', { reason }); alert('تم الإبلاغ'); };
  $('#bl').onclick = async () => { if (confirm('تحظر المرسل ده؟ مش هيعرف إنه اتحظر.')) { await api(`/inbox/${id}/block`, 'POST'); location.hash = '#/inbox'; } };
  window.scrollTo(0, document.body.scrollHeight);
}
async function pageMissions() {
  const u = await api('/me'), d = await api('/missions');
  const seenSecrets = JSON.parse(localStorage.getItem('mseen') || '[]');
  const freshSecret = d.missions.find(m => m.secret && m.done && !seenSecrets.includes(m.id));
  const stageRows = m => `<div class="msts">${m.stages.map((s, i) => { const cur = !s.done && i === m.current; return `<div class="mst ${s.done ? 'done' : ''} ${cur ? 'cur' : ''}"><span class="msc">${s.done ? '✓' : nf(i + 1)}</span><div class="msb"><b>المرحلة ${nf(i + 1)} · هدف ${nf(s.target)}</b><span>${s.done ? 'خلصت' : cur ? `${nf(Math.min(m.prog, s.target))} / ${nf(s.target)}` : 'بتتفتح بعد اللي قبلها'}</span>${cur ? `<div class="mprog"><i style="width:${Math.min(100, Math.round(m.prog / s.target * 100))}%"></i></div>` : ''}</div><span class="msp">+${nf(s.pts)}</span></div>`; }).join('')}</div>`;
  const oneBar = m => `<div class="mprog"><i style="width:${Math.min(100, Math.round(m.prog / m.stages[0].target * 100))}%"></i></div>`;
  const state = m => m.done ? '<span class="mstate ok">✓ خلصت</span>' : m.stages.length > 1 ? `<span class="mstate">${nf(m.current + 1)} / ${nf(m.stages.length)} مراحل</span>` : `<span class="mstate">${nf(m.prog)} / ${nf(m.stages[0].target)}</span>`;
  const card = m => m.locked
    ? `<div class="mcard secret"><div class="micon">؟</div><div class="mbody"><b>مهمة سرية</b><span>مقفولة لسه — هتتكشف لما تعملها بالصدفة</span></div></div>`
    : `<div class="mcard ${m.done ? 'done' : ''} ${m.secret ? 'secret-open' : ''}"><div class="micon">${m.done ? '✓' : '★'}</div><div class="mbody"><b>${esc(m.title)}${m.secret ? ' <em class="mtag">سرية</em>' : ''}</b><span>${esc(m.desc)}</span>${m.stages.length > 1 ? stageRows(m) : oneBar(m)}</div><div class="mpts">+${nf(m.ptsTotal)}</div>${state(m)}</div>`;
  const vis = d.missions.filter(m => !m.secret), sec = d.missions.filter(m => m.secret);
  app.innerHTML = shell(`<div class="card center mhead"><p class="mut" style="margin:0">رصيدك الحالي</p><div class="mscore">${nf(d.points)}</div><p class="mut" style="margin:0">نقطة · استخدمها قريب في حاجات حلوة</p></div>
  ${freshSecret ? `<div class="mcard banner" id="mb"><div class="micon">★</div><div class="mbody"><b>اكتشفت مهمة سرية: ${esc(freshSecret.title)}</b><span>+${nf(freshSecret.ptsTotal)} نقطة في رصيدك</span></div></div>` : ''}
  <div class="msec">المهمات</div>
  ${vis.map(card).join('')}
  <div class="msec">مهمات سرية <span class="mut" style="font-weight:400">(${sec.filter(m => m.done).length} من ${sec.length} اتكشفت)</span></div>
  ${sec.map(card).join('')}
  <div class="center" style="margin:14px 0"><a class="mut" href="#/settings">→ رجوع للإعدادات</a></div>`, userMenu(u));
  if (freshSecret) { seenSecrets.push(freshSecret.id); localStorage.setItem('mseen', JSON.stringify(seenSecrets)); }
}
async function pageSettings() {
  const u = await api('/me'), n = await api('/notify');
  const ch = (id, label, val, ph, live, need) => `<div class="chan"><b>${label}</b> <span class="badge">${live ? 'جاهز للإرسال الفعلي' : 'تجريبي محلي'}</span><input id="${id}" dir="ltr" value="${esc(val)}" placeholder="${ph}"><p class="mut" style="margin:-4px 0 4px;font-size:12px">${need}</p></div>`;
  app.innerHTML = shell(`<div class="card"><h1>الملف الشخصي</h1><form id="f"><div class="edit-cover" id="cv" ${u.cover ? `style="background-image:url(${u.cover});background-position:center ${u.covery ?? 50}%"` : ''}><div class="cvbar"><button type="button" class="btn sm ghost" id="rp" ${u.cover ? '' : 'disabled'}>تحديد الجزء الظاهر</button><label class="btn sm ghost">تغيير الغلاف<input type="file" id="cf" accept="image/*" hidden></label></div><div class="cvhint">اسحب الصورة لتحديد الجزء اللي يظهر</div><div class="cvact"><button type="button" class="btn sm" id="rok">حفظ التحديد</button><button type="button" class="btn sm ghost" id="rno">إلغاء</button></div></div><div class="row" style="align-items:center;margin:-34px 14px 10px">${av(u, 'big')}<label class="btn sm ghost" style="margin-top:34px">صورة شخصية<input type="file" id="af" accept="image/*" hidden></label><button type="button" class="btn sm ghost" id="rm" style="margin-top:34px">إزالة الصور</button></div><input id="nm" value="${esc(u.name)}" placeholder="الاسم"><textarea id="bio" maxlength="200" placeholder="نبذة عنك (٢٠٠ حرف)" style="min-height:80px">${esc(u.bio)}</textarea><label class="row" style="margin-bottom:12px"><input type="checkbox" id="op" ${u.open ? 'checked' : ''} style="width:auto;margin:0"> استقبل رسايل جديدة</label><button class="btn full">حفظ الملف</button></form></div>
  <div class="card center" id="msum" style="cursor:pointer"><h1 style="font-size:20px">المهمات</h1><p class="sub">كمّل مهمات واكسب نقاط، وفي مهمات سرية هتكتشفها بالصدفة.</p><div class="mscore" id="msc">…</div><a class="btn full ghost" href="#/missions">افتح المهمات</a></div>
  <div class="card"><h1 style="font-size:20px">الإشعارات</h1><p class="sub">هنبعتلك تنبيه لما توصلك رسالة أو رد جديد (من غير ما نكتب نص الرسالة، بس لينك).</p><form id="nf">
  ${ch('ne', 'إيميل / Gmail', n.email, 'name@gmail.com', n.live.email, 'يحتاج مفتاح خدمة إرسال إيميل (Resend أو SMTP) ودومين مُرسِل')}
  <label class="row" style="margin:-2px 0 12px"><input type="checkbox" id="nen" ${n.nEmail ? 'checked' : ''} style="width:auto;margin:0"> فعّل إشعارات الإيميل</label>
  ${ch('nt', 'تيليجرام (Chat ID)', n.telegram || '', 'مثال: 123456789', n.live.telegram, 'يحتاج بوت تيليجرام (توكن من BotFather) وإنك تبدأ محادثة معاه')}
  ${ch('nw', 'واتساب (رقم بكود الدولة)', n.whatsapp || '', '201001234567', n.live.whatsapp, 'يحتاج حساب WhatsApp Business Cloud API من ميتا ورسائل قوالب معتمدة')}
  <label class="row" style="margin-bottom:6px"><input type="checkbox" id="o1" ${n.onMessage !== false ? 'checked' : ''} style="width:auto;margin:0"> أنبهني لما توصلني رسالة جديدة</label>
  <label class="row" style="margin-bottom:12px"><input type="checkbox" id="o2" ${n.onFollowup !== false ? 'checked' : ''} style="width:auto;margin:0"> أنبهني لما المرسل يكتب رد</label>
  <p class="err" id="ner"></p><div class="row"><button class="btn">حفظ الإشعارات</button><button type="button" class="btn ghost" id="tst">إشعار تجريبي</button></div></form><p class="mut" id="nok" style="margin:8px 0 0"></p>
  <p style="margin:12px 0 0"><a class="mut" href="#/outbox">شوف الرسايل اللي اتجهزت (للتجربة المحلية)</a></p></div>
  <div class="card"><h1 style="font-size:20px">تغيير كلمة السر</h1><form id="pf"><input id="po" type="password" dir="ltr" placeholder="كلمة السر الحالية"><input id="pn" type="password" dir="ltr" placeholder="كلمة السر الجديدة"><p class="err" id="per"></p><button class="btn full ghost">تغيير</button></form></div><a href="#/inbox" class="mut">→ رجوع</a>`, userMenu(u));
  api('/missions').then(d => { $('#msc').textContent = nf(d.points) + ' نقطة'; }).catch(() => { $('#msc').textContent = ''; });
  const pend = {};
  const shrink = (file, w, h) => new Promise(ok => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), r = Math.max(w / im.width, h / im.height); g.drawImage(im, (w - im.width * r) / 2, (h - im.height * r) / 2, im.width * r, im.height * r); ok(c.toDataURL('image/jpeg', .82)); }; im.src = URL.createObjectURL(file); });
  $('#af').onchange = async e => { if (e.target.files[0]) { pend.avatar = await shrink(e.target.files[0], 256, 256); const el = document.querySelector('.av.big'); el.outerHTML = `<img class="av big" src="${pend.avatar}">`; } };
  const shrinkCover = file => new Promise(ok => { const im = new Image(); im.onload = () => { let w = Math.min(im.width, 900), h = Math.round(w * im.height / im.width); if (h > 675) { h = 675; w = Math.round(h * im.width / im.height); } const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h); ok(c.toDataURL('image/jpeg', .82)); }; im.src = URL.createObjectURL(file); });
  let posY = u.covery ?? 50; const cvEl = $('#cv');
  const setPos = y => { posY = Math.max(0, Math.min(100, y)); cvEl.style.backgroundPosition = `center ${posY}%`; };
  $('#cf').onchange = async e => { if (e.target.files[0]) { pend.cover = await shrinkCover(e.target.files[0]); cvEl.style.backgroundImage = `url(${pend.cover})`; pend.covery = 50; setPos(50); $('#rp').disabled = false; } };
  $('#rp').onclick = () => cvEl.classList.add('repos');
  $('#rok').onclick = () => { pend.covery = posY; cvEl.classList.remove('repos'); };
  $('#rno').onclick = () => { setPos(pend.covery ?? u.covery ?? 50); cvEl.classList.remove('repos'); };
  let cvDrag = null;
  cvEl.addEventListener('pointerdown', e => { if (!cvEl.classList.contains('repos')) return; cvDrag = { y: e.clientY, p: posY }; cvEl.setPointerCapture(e.pointerId); e.preventDefault(); });
  cvEl.addEventListener('pointermove', e => { if (!cvDrag) return; setPos(cvDrag.p - (e.clientY - cvDrag.y) / cvEl.getBoundingClientRect().height * 100); });
  cvEl.addEventListener('pointerup', () => cvDrag = null);
  cvEl.addEventListener('pointercancel', () => cvDrag = null);
  $('#rm').onclick = () => { pend.avatar = ''; pend.cover = ''; pend.covery = 50; $('#cv').style.backgroundImage = ''; setPos(50); $('#rp').disabled = true; };
  $('#f').onsubmit = async e => { e.preventDefault(); await api('/profile', 'POST', { name: $('#nm').value, bio: $('#bio').value, open: $('#op').checked, ...pend }); genBanner({ username: u.username, name: $('#nm').value, avatar: pend.avatar !== undefined ? pend.avatar : u.avatar }); location.hash = '#/inbox'; };
  const saveN = () => api('/notify', 'POST', { email: $('#ne').value, nEmail: $('#nen').checked, telegram: $('#nt').value, whatsapp: $('#nw').value, onMessage: $('#o1').checked, onFollowup: $('#o2').checked });
  try { const iv = await api('/invite'), link = `${origin}/#/join/${iv.code}`;
    app.querySelector('.wrap .card').insertAdjacentHTML('afterend', `<div class="card center invite"><h1 style="font-size:20px">ادعُ أصحابك</h1><p class="sub">شارك لينكك الخاص. كل واحد يسجل منه بيتسجل إنه جه من عندك (${iv.count} لحد دلوقتي).</p><div class="invlink" dir="ltr">${esc(link)}</div><button class="copybtn" data-act="copy" data-text="${esc(link)}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg><span>نسخ اللينك</span></button>${navigator.share ? `<button class="btn full" data-act="share" data-text="${esc(link)}" style="margin-top:10px">مشاركة اللينك</button>` : ''}</div>`); } catch {}
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
fetch('/api/config').then(r => r.json()).then(c => { SITE = c.name; document.title = c.name + ' — رسايل مجهولة من أصحابك'; }).catch(() => {}).finally(route);
// ---- share a conversation as an image (drawn in the browser, nothing is uploaded)
function wrap(g, text, maxW) { const out = []; for (const para of text.split('\n')) { let line = ''; for (const w of para.split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } out.push(line); } return out; }
function chatImage(msgs, ownerName, ownerView) {
  const W = 1080, P = 64, BW = 800, F = 40, LH = 58, g0 = document.createElement('canvas').getContext('2d'); g0.font = `${F}px Tahoma,"Segoe UI",sans-serif`;
  const items = msgs.slice(-8).map(m => { const mine = ownerView ? m.from === 'owner' : m.from === 'anon'; const lbl = m.from === 'owner' ? (ownerView ? 'أنت' : ownerName) : (ownerView ? 'مجهول' : 'أنت (مجهول)'); const lines = wrap(g0, m.text, BW - 90); return { mine, lbl, lines, h: lines.length * LH + 58 }; });
  const cardTop = 250, pad = 44, foot = 190, msgH = items.reduce((a, i) => a + i.h + 46, 0), H = cardTop + pad + msgH + pad + foot;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.direction = 'rtl';
  g.fillStyle = '#171210'; g.fillRect(0, 0, W, H);
  const orb = (x, y, r, c1) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c1); rg.addColorStop(1, 'rgba(224,85,59,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  orb(90, 40, 430, 'rgba(224,85,59,.5)'); orb(W - 60, H - 100, 480, 'rgba(255,138,76,.32)');
  g.save(); g.globalAlpha = .05; g.fillStyle = '#ff8a4c'; g.font = 'bold 88px Tahoma,sans-serif'; g.textAlign = 'center';
  for (let yy = 420; yy < H; yy += 360) for (let xx = 160; xx < W; xx += 460) { g.save(); g.translate(xx, yy); g.rotate(-.3); g.fillText(SITE, 0, 0); g.restore(); }
  g.restore();
  const grad = g.createLinearGradient(W / 2 - 170, 0, W / 2 + 170, 0); grad.addColorStop(0, '#e0553b'); grad.addColorStop(1, '#ff8a4c');
  g.textAlign = 'center'; g.fillStyle = grad; g.font = 'bold 104px Tahoma,"Segoe UI",sans-serif'; g.fillText(SITE, W / 2, 128);
  g.fillStyle = 'rgba(244,237,231,.85)'; g.font = '37px Tahoma,sans-serif'; g.fillText('محادثة مجهولة مع ' + ownerName, W / 2, 186);
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.beginPath(); g.moveTo(140, 216); g.lineTo(W - 140, 216); g.stroke();
  g.fillStyle = 'rgba(30,25,23,.94)'; g.beginPath(); g.roundRect(36, cardTop, W - 72, msgH + pad * 2, 42); g.fill();
  let y = cardTop + pad; g.textAlign = 'right';
  for (const it of items) { const w = Math.max(...it.lines.map(l => g.measureText(l).width)) + 90, x = it.mine ? W - 36 - pad - w : 36 + pad;
    g.fillStyle = '#a39990'; g.font = '27px Tahoma,sans-serif'; g.textAlign = it.mine ? 'right' : 'left'; g.fillText(it.lbl, it.mine ? x + w - 10 : x + 10, y + 26); g.textAlign = 'right';
    const by = y + 40; if (it.mine) { const bg2 = g.createLinearGradient(x, by, x + w, by + it.h); bg2.addColorStop(0, '#e0553b'); bg2.addColorStop(1, '#ff8a4c'); g.fillStyle = bg2; } else g.fillStyle = '#2c2421';
    g.beginPath(); g.roundRect(x, by, w, it.h, it.mine ? [32, 32, 9, 32] : [32, 32, 32, 9]); g.fill();
    if (!it.mine) { g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 2; g.stroke(); }
    g.fillStyle = it.mine ? '#fff' : '#f4ede7'; g.font = `${F}px Tahoma,"Segoe UI",sans-serif`; it.lines.forEach((l, i) => g.fillText(l, x + w - 45, by + 66 + i * LH)); y = by + it.h + 6; }
  g.textAlign = 'center'; g.fillStyle = grad; g.font = 'bold 46px Tahoma,sans-serif'; g.fillText('ابعت رسالة مجهولة على ' + SITE, W / 2, H - 108);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '30px Tahoma,sans-serif'; g.save(); g.direction = 'ltr'; g.fillText(origin.replace(/^https?:\/\//, ''), W / 2, H - 58); g.restore();
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

async function loadStoryStrip(){
 try{const {stories}=await api('/stories'),box=$('#storystrip');if(!box)return;const groups=[];for(const s of stories)if(!groups.some(x=>x.owner===s.owner))groups.push(s);
 box.innerHTML=`<section class="storybox"><div class="stitle"><b>الاستوري</b><button class="storyreset" id="storyreset">إظهار المخفي</button></div><div class="storyrings"><a class="storyitem" href="#/stories/new"><span class="storyring add">+</span><span>ضيف استوري</span></a>${groups.map(s=>`<button class="storyitem" data-story="${esc(s.owner)}"><span class="storyring ${s.seen?'seen':''}">${s.avatar?`<img src="${esc(s.avatar)}" alt="">`:esc(s.name[0]||'؟')}</span><span>${s.own?'استوري بتاعتك':esc(s.name)}</span></button>`).join('')}</div></section>`;
 $('#storyreset').onclick=async()=>{await api('/stories/reset-hidden','POST');loadStoryStrip()};
 box.querySelectorAll('[data-story]').forEach(b=>b.onclick=()=>openStories(stories.filter(s=>s.owner===b.dataset.story).reverse(),0));
 }catch{}}
function openStories(list,index){
 document.querySelector('.storymodal')?.remove();if(index>=list.length)return;const s=list[index];if(s.exp<=Date.now())return loadStoryStrip();const d=document.createElement('div');d.className='storymodal';d.innerHTML=`<div class="storyview"><div class="storyprogress">${list.map((x,i)=>`<span class="${i<=index?'on':''}"></span>`).join('')}</div><div class="storyhead"><b>${esc(s.name)}</b><small>باقي ${Math.max(1,Math.ceil((s.exp-Date.now())/36e5))} ساعة</small><button data-sc="close">×</button></div><div class="storycontent scolor-${esc(s.color)}">${s.image?`<img src="${esc(s.image)}" alt="استوري صورة">`:`<p>${esc(s.text)}</p>`}</div><div class="storycontrols"><button data-sc="prev">→ السابقة</button><button data-sc="next">التالية ←</button></div><div class="storyactions">${s.own?`<span>المشاهدات: ${nf(s.views||0)}</span><button data-sc="delete">حذف</button>`:'<button data-sc="report">إبلاغ</button><button data-sc="hide">إخفاء استوري الحساب</button>'}</div></div>`;document.body.append(d);api('/stories/'+s.id+'/view','POST').catch(()=>{});
 const exp=setTimeout(()=>{d.remove();loadStoryStrip()},Math.max(0,s.exp-Date.now()));const close=()=>{clearTimeout(exp);d.remove()};
 d.onclick=async e=>{const act=e.target.closest('[data-sc]')?.dataset.sc;if(!act)return;try{if(act==='close')close();if(act==='next'||act==='prev'){close();openStories(list,Math.max(0,index+(act==='next'?1:-1)))}if(act==='delete'&&confirm('تحذف الاستوري؟')){await api('/stories/'+s.id,'DELETE');close();loadStoryStrip()}if(act==='report'){const reason=prompt('سبب البلاغ (الإدارة هتشوف الاستوري دي بس)');if(reason===null)return;await api('/stories/'+s.id+'/report','POST',{reason});alert('وصل البلاغ')}if(act==='hide'&&confirm('تخفي استوري الحساب ده؟ تقدر ترجعه من زر إظهار المخفي.')){await api('/stories/'+s.id+'/hide','POST');close();loadStoryStrip()}}catch(e){alert(e.message)}};
}
async function pageStoryCompose(){
 const u=await api('/me');app.innerHTML=shell(`<div class="card"><div class="row" style="justify-content:space-between"><h1>ضيف استوري</h1><a href="#/inbox" class="mut">إلغاء</a></div><div class="storymodes"><button class="btn" id="stext">كلام</button><button class="btn ghost" id="simage">صورة</button></div><div class="storypreview scolor-orange" id="spreview">اكتب اللي في بالك</div><div id="stextbox"><textarea id="storytext" maxlength="500" rows="3" placeholder="اكتب اللي في بالك..."></textarea><div class="storyswatches">${['orange','green','purple','black'].map(c=>`<button class="scolor-${c}" data-scolor="${c}" aria-label="خلفية ${c}"></button>`).join('')}</div><div class="mut" id="scount">٠ / ٥٠٠ حرف</div></div><div id="simagebox" hidden><label class="btn ghost full" for="storyfile" style="display:block;text-align:center">اختار صورة</label><input id="storyfile" type="file" accept="image/jpeg,image/png,image/webp" hidden><p class="mut">JPG أو PNG أو WebP حتى ٥ ميجا. هنصغّرها قبل الرفع.</p></div><div class="storynotice">هتظهر لكل الأعضاء المسجلين باسمك، وتختفي بعد ٢٤ ساعة من النشر. تقدر تحذفها في أي وقت.<br>ممكن حد ياخد لقطة شاشة، متشاركش معلومات حساسة.</div><p id="serror" class="mut"></p><button class="btn full big" id="spublish">انشر الاستوري</button></div>`,userMenu(u));
 let mode='text',color='orange',image='';const preview=$('#spreview');
 const update=()=>{preview.className='storypreview scolor-'+color;preview.innerHTML=mode==='image'?(image?`<img src="${image}" alt="معاينة الصورة">`:'اختار صورة للمعاينة'):esc($('#storytext').value||'اكتب اللي في بالك');$('#scount').textContent=nf($('#storytext').value.length)+' / ٥٠٠ حرف'};
 $('#storytext').oninput=update;document.querySelectorAll('[data-scolor]').forEach(b=>b.onclick=()=>{color=b.dataset.scolor;update()});
 const setmode=m=>{mode=m;$('#stextbox').hidden=m!=='text';$('#simagebox').hidden=m!=='image';$('#stext').classList.toggle('ghost',m!=='text');$('#simage').classList.toggle('ghost',m!=='image');update()};$('#stext').onclick=()=>setmode('text');$('#simage').onclick=()=>setmode('image');
 $('#storyfile').onchange=async()=>{const f=$('#storyfile').files[0];if(!f)return;try{if(f.size>5e6||!['image/jpeg','image/png','image/webp'].includes(f.type))throw Error('اختار صورة JPG أو PNG أو WebP أقل من ٥ ميجا');let bitmap;for(let attempt=0;attempt<3;attempt++){try{bitmap=await createImageBitmap(f);break}catch(e){if(attempt===2)throw Error('تعذر قراءة الصورة، جرب صورة تانية');await new Promise(r=>setTimeout(r,300))}}const scale=Math.min(1,1080/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.round(bitmap.width*scale);c.height=Math.round(bitmap.height*scale);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();let q=.8,data;do{data=c.toDataURL('image/webp',q);q-=.1}while(data.length>330000&&q>.25);if(data.length>330000)throw Error('الصورة كبيرة، جرب صورة أصغر');image=data;update();$('#serror').textContent=''}catch(e){$('#serror').textContent=e.message}};
 $('#spublish').onclick=async()=>{const b=$('#spublish');b.disabled=true;try{await api('/stories','POST',mode==='image'?{image}:{text:$('#storytext').value,color});location.hash='#/inbox'}catch(e){$('#serror').textContent=e.message;b.disabled=false}};
}
