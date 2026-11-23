// Authenticated, expiring stories. Media stays in a private object bucket.
module.exports = function stories(ctx) {
 const {db,send,me,save,limited,ip,rid,SEC}=ctx, DAY=864e5, BUCKET='hamsa-stories';
 const url=(process.env.SUPABASE_URL||'').trim().replace(/\/$/,''),key=(process.env.SUPABASE_SERVICE_KEY||'').trim();
 db.stories=db.stories||{};
 const headers=()=>({apikey:key,...(key.startsWith('sb_')?{}:{Authorization:'Bearer '+key})});
 const objects=new Map(); // local tests only, never enabled in production
 const local=process.env.STORY_TEST_STORAGE==='1'&&!url;
 async function put(id,buf){if(local){objects.set(id,buf);return}if(!url||!key)throw Error('storage unavailable');const r=await fetch(url+'/storage/v1/object/'+BUCKET+'/'+id+'.webp',{method:'POST',headers:{...headers(),'Content-Type':'image/webp','Cache-Control':'no-store'},body:buf});if(!r.ok)throw Error('storage upload failed '+r.status)}
 async function get(id){if(local)return objects.get(id);const r=await fetch(url+'/storage/v1/object/'+BUCKET+'/'+id+'.webp',{headers:headers()});if(!r.ok)throw Error('storage read failed');return Buffer.from(await r.arrayBuffer())}
 async function erase(s){if(!s.image)return true;if(local){objects.delete(s.id);return true}try{const r=await fetch(url+'/storage/v1/object/'+BUCKET,{method:'DELETE',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({prefixes:[s.id+'.webp']})});return r.ok}catch{return false}}
 let cleaning=false;
 async function cleanup(){if(cleaning)return;cleaning=true;try{for(const s of Object.values(db.stories)){if(s.exp<=Date.now()||s.deleted||!db.users[s.owner]){delete s.text;delete s.views;s.reports=[];if(await erase(s)){delete db.stories[s.id];save()}}}}finally{cleaning=false}}
 const active=s=>s&&!s.deleted&&s.exp>Date.now()&&db.users[s.owner]&&!db.users[s.owner].banned;
 const row=(s,u)=>({id:s.id,owner:s.owner,name:db.users[s.owner].name,avatar:db.users[s.owner].avatar||'',text:s.text,color:s.color,image:s.image?'/api/stories/'+s.id+'/media':'',created:s.created,exp:s.exp,own:s.owner===u.username,seen:(s.views||[]).includes(u.username),views:s.owner===u.username?(s.views||[]).length:undefined});
 const colors=['orange','green','purple','black'];
 setInterval(cleanup,300000).unref();
 return {cleanup, async admin(req,res,p,m,b){
  if(p==='/api/admin/story-reports'&&m==='GET')return send(res,200,{stories:Object.values(db.stories).filter(s=>active(s)&&s.reports?.length).map(s=>({...row(s,{username:''}),reports:s.reports}))});
  const q=p.match(/^\/api\/admin\/story-reports\/([a-zA-Z0-9_-]+)\/(delete|dismiss|media)$/);if(!q)return false;const s=db.stories[q[1]];if(!active(s)||!s.reports?.length)return send(res,404,{error:'not found'});
  if(q[2]==='media'&&m==='GET'&&s.image){const month=new Date().toISOString().slice(0,7);if(db.storyTraffic?.month!==month)db.storyTraffic={month,bytes:0};if(db.storyTraffic.bytes+(s.bytes||250000)>500000000)return send(res,503,{error:'وصلنا لحد عرض الصور الشهري المجاني'});db.storyTraffic.bytes+=s.bytes||250000;save();const buf=await get(s.id);res.writeHead(200,{...SEC,'Content-Type':'image/webp','Cache-Control':'no-store'});res.end(buf);return true}
  if(m==='POST'&&q[2]!=='media'){ctx.adminLog('story_'+q[2],s.id);if(q[2]==='delete'){s.deleted=true;delete s.text;delete s.views;s.reports=[];cleanup()}else s.reports=[];save();return send(res,200,{ok:1})}return false;
 }, async handle(req,res,p,m,b){
  if(!p.startsWith('/api/stories'))return false;const u=me(req);if(!u||u.banned)return send(res,401,{error:'سجل دخولك الأول'});
  cleanup();
  if(p==='/api/stories/reset-hidden'&&m==='POST'){u.hiddenStories=[];save();return send(res,200,{ok:1})}
  if(p==='/api/stories'&&m==='GET'){const hidden=u.hiddenStories||[];return send(res,200,{stories:Object.values(db.stories).filter(s=>active(s)&&!hidden.includes(s.owner)).sort((a,b)=>b.created-a.created).slice(0,200).map(s=>row(s,u))})}
  if(p==='/api/stories'&&m==='POST'){
   if(limited('story:'+u.username,10,3600e3)||limited('storyip:'+ip(req),30,3600e3))return send(res,429,{error:'استنى شوية قبل استوري جديدة'});
   const all=Object.values(db.stories).filter(active);if(all.filter(s=>s.owner===u.username).length>=5)return send(res,400,{error:'أقصى عدد ٥ استوري في نفس الوقت'});
   const id=rid(12),text=typeof b.text==='string'?b.text.trim():'';if(text.length>500)return send(res,400,{error:'أقصى طول ٥٠٠ حرف'});
   let image=false,bytes=0;
   if(b.image){if(typeof b.image!=='string'||b.image.length>400000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.image))return send(res,400,{error:'الصورة مش مظبوطة'});let buf;try{buf=await require('sharp')(Buffer.from(b.image.split(',')[1],'base64'),{limitInputPixels:20000000}).rotate().resize(1080,1080,{fit:'inside',withoutEnlargement:true}).webp({quality:75}).toBuffer()}catch{return send(res,400,{error:'الصورة مش مظبوطة'})}if(buf.length>250000)return send(res,400,{error:'الصورة كبيرة، جرب صورة أصغر'});bytes=buf.length;if(all.reduce((n,s)=>n+(s.bytes||0),0)+bytes>100000000)return send(res,503,{error:'مساحة الاستوري ممتلئة مؤقتاً، جرب لاحقاً'});await put(id,buf);image=true}
   if(!image&&!text)return send(res,400,{error:'اكتب كلام أو اختار صورة'});if(image&&text){await erase({id,image:true});return send(res,400,{error:'اختار صورة أو كلام فقط'})}
   const s={id,owner:u.username,text,color:colors.includes(b.color)?b.color:'orange',image,bytes,created:Date.now(),exp:Date.now()+DAY,views:[],reports:[]};db.stories[id]=s;save();return send(res,200,row(s,u));
  }
  const q=p.match(/^\/api\/stories\/([a-zA-Z0-9_-]+)(?:\/(media|view|report|hide))?$/);if(!q)return send(res,404,{error:'not found'});const s=db.stories[q[1]];
  if(!active(s)||(u.hiddenStories||[]).includes(s.owner))return send(res,404,{error:'الاستوري انتهت أو اتحذفت'});
  if(q[2]==='media'&&m==='GET'&&s.image){const month=new Date().toISOString().slice(0,7);if(db.storyTraffic?.month!==month)db.storyTraffic={month,bytes:0};if(db.storyTraffic.bytes+(s.bytes||250000)>500000000)return send(res,503,{error:'وصلنا لحد عرض الصور الشهري المجاني'});db.storyTraffic.bytes+=s.bytes||250000;save();const buf=await get(s.id);if(!active(s))return send(res,404,{error:'انتهت الاستوري'});res.writeHead(200,{...SEC,'Content-Type':'image/webp','Content-Length':buf.length,'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'});res.end(buf);return true}
  if(q[2]==='view'&&m==='POST'){if(s.owner!==u.username&&!(s.views||[]).includes(u.username)){s.views=s.views||[];s.views.push(u.username);save()}return send(res,200,{ok:1})}
  if(q[2]==='hide'&&m==='POST'){u.hiddenStories=[...new Set([...(u.hiddenStories||[]),s.owner])].slice(-300);save();return send(res,200,{ok:1})}
  if(q[2]==='report'&&m==='POST'){if(limited('sr:'+u.username,20,3600e3))return send(res,429,{error:'محاولات كتير'});s.reports=s.reports||[];if(!s.reports.some(r=>r.by===u.username))s.reports.push({by:u.username,reason:String(b.reason||'').slice(0,300),t:Date.now()});save();return send(res,200,{ok:1})}
  if(!q[2]&&m==='DELETE'&&s.owner===u.username){s.deleted=true;delete s.text;delete s.views;s.reports=[];save();cleanup();return send(res,200,{ok:1})}
  return send(res,404,{error:'not found'});
 }};
};
