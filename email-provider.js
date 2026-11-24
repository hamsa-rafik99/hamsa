// HTTPS-only transactional adapters. No credentials or recipient content logged here.
function emailConfig(env=process.env){
 const provider=env.EMAIL_PROVIDER||'resend';
 const from=env.MAIL_FROM||'';
 const key=provider==='brevo'?env.BREVO_API_KEY:provider==='resend'?env.RESEND_API_KEY:'';
 const ready=env.EMAIL_ENABLED==='1'&&!!key&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from);
 return {provider,from,key,ready};
}
async function sendEmail({to,subject,text,id},config=emailConfig(),request=fetch){
 if(!config.ready)return false;
 const brevo=config.provider==='brevo';
 const response=await request(brevo?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails',{
  method:'POST',signal:AbortSignal.timeout(10000),headers:brevo?{'api-key':config.key,'Content-Type':'application/json'}:{Authorization:'Bearer '+config.key,'Content-Type':'application/json','Idempotency-Key':'hamsa/'+id},
  body:JSON.stringify(brevo?{sender:{name:'همسه',email:config.from},to:[{email:to}],subject,textContent:text}:{from:config.from,to:[to],subject,text})
 });
 return response.ok;
}
module.exports={emailConfig,sendEmail};
