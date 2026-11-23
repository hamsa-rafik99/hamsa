// ogcard.js — the profile share card (og:image) as SVG, mirroring the app's profile card (profileHead) design.
// Design tokens mirror public/style.css :root (light theme). If the card design changes, change it here too.
const T = {
  bg: '#ffffff', cover: '#171210', ink: '#241a16', mut: '#8a7a70',
  p: '#e0553b', p2: '#ff8a4c', soft: '#f6ece5', line: '#efe1d8',
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '&gt;': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => Number(n).toLocaleString('ar-EG');
const FONT = "Tahoma,'Noto Sans Arabic','DejaVu Sans',sans-serif";

// u: { username, name, avatar (data URL or ''), stats: { received, replies }, views, since (ms) }
function ogSvg(u) {
  const since = new Date(u.since || Date.now());
  const month = since.toLocaleDateString('ar-EG', { month: 'long' }), year = since.toLocaleDateString('ar-EG', { year: 'numeric' });
  const handle = '@' + u.username;
  const chipW = Math.max(120, handle.length * 17 + 44);
  const av = u.avatar
    ? `<image href="${esc(u.avatar)}" x="505" y="155" width="190" height="190" preserveAspectRatio="xMidYMid slice" clip-path="url(#avc)"/>`
    : `<circle cx="600" cy="250" r="95" fill="${T.p}"/><text x="600" y="282" text-anchor="middle" font-family="${FONT}" font-size="86" font-weight="bold" fill="#fff">${esc((u.name || '؟')[0])}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.p}"/><stop offset="1" stop-color="${T.p2}"/></linearGradient>
<clipPath id="card"><rect width="1200" height="630" rx="44"/></clipPath>
<clipPath id="avc"><circle cx="600" cy="250" r="95"/></clipPath>
</defs>
<g clip-path="url(#card)">
<rect width="1200" height="630" fill="${T.bg}"/>
<rect width="1200" height="250" fill="${T.cover}"/>
<circle cx="1090" cy="30" r="200" fill="url(#g)"/>
<circle cx="105" cy="120" r="55" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2"/>
<text x="335" y="118" text-anchor="middle" direction="rtl" font-family="${FONT}" font-size="40" font-weight="bold" fill="url(#g)">صارحني من غير</text>
<text x="335" y="168" text-anchor="middle" direction="rtl" font-family="${FONT}" font-size="40" font-weight="bold" fill="url(#g)">ما تقول مين انت</text>
${av}
<circle cx="600" cy="250" r="100" fill="none" stroke="#fff" stroke-width="8"/>
<text x="600" y="418" text-anchor="middle" direction="rtl" font-family="${FONT}" font-size="56" font-weight="bold" fill="${T.ink}">${esc(u.name || u.username)}</text>
<rect x="${600 - chipW / 2}" y="445" width="${chipW}" height="48" rx="24" fill="${T.soft}"/>
<text x="600" y="478" text-anchor="middle" direction="ltr" font-family="${FONT}" font-size="27" fill="${T.mut}">${esc(handle)}</text>
<g font-family="${FONT}" text-anchor="middle">
<line x1="900" y1="515" x2="900" y2="600" stroke="${T.line}" stroke-width="2"/>
<line x1="600" y1="515" x2="600" y2="600" stroke="${T.line}" stroke-width="2"/>
<line x1="300" y1="515" x2="300" y2="600" stroke="${T.line}" stroke-width="2"/>
<text x="1050" y="552" direction="rtl" font-size="42" font-weight="bold" fill="${T.p}">${nf(u.stats.received)}</text>
<text x="1050" y="596" direction="rtl" font-size="25" fill="${T.mut}">رسالة</text>
<text x="750" y="552" direction="rtl" font-size="42" font-weight="bold" fill="${T.p}">${nf(u.stats.replies)}</text>
<text x="750" y="596" direction="rtl" font-size="25" fill="${T.mut}">رد</text>
<text x="450" y="552" direction="rtl" font-size="42" font-weight="bold" fill="${T.p}">${nf(u.views)}</text>
<text x="450" y="596" direction="rtl" font-size="25" fill="${T.mut}">زيارة</text>
<text x="150" y="536" direction="rtl" font-size="37" font-weight="bold" fill="${T.p}">${esc(month)}</text>
<text x="150" y="572" direction="rtl" font-size="37" font-weight="bold" fill="${T.p}">${esc(year)}</text>
<text x="150" y="604" direction="rtl" font-size="25" fill="${T.mut}">انضم</text>
</g>
</g>
</svg>`;
}
module.exports = { ogSvg, T };
