const net=require('net'),crypto=require('crypto');
// Render documents first XFF entry as the client IP. Outside Render ignore proxy headers.
function clientIp(req,env=process.env){
 if(env.RENDER==='true'){
  const raw=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  if(net.isIP(raw))return raw;
 }
 return req.socket.remoteAddress||'unknown';
}
function passwordError(value){const p=String(value||''),n=Array.from(p).length;
 if(n<8||p.length>200)return 'كلمة السر لازم تكون ٨ حروف أو أرقام على الأقل وبحد أقصى ٢٠٠.';
 return '';
}
function makeLimiter(db,save){return function limited(key,max,ms){
 const now=Date.now();db.securityRate=db.securityRate||{};
 const id=crypto.createHmac('sha256',db.secret).update(String(key)).digest('hex');
 // Bounded storage and expiry. No raw IP/identifier in rate-limit records.
 for(const [k,v] of Object.entries(db.securityRate))if(!v||v.until<=now)delete db.securityRate[k];
 let bucket=db.securityRate[id];
 if(!bucket){if(Object.keys(db.securityRate).length>=10000)return true;bucket=db.securityRate[id]={count:0,until:now+ms};}
 if(bucket.count>=max)return true;
 bucket.count++;save();return false;
 }}
module.exports={clientIp,passwordError,makeLimiter};
