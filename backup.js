// Offline encrypted database snapshot. Never connects to or mutates live services.
// node scripts/backup.js create|verify|restore INPUT OUTPUT KEY_FILE
const fs=require('fs'),crypto=require('crypto'),path=require('path');
const [cmd,input,output,keyFile]=process.argv.slice(2);
function validate(db){if(!db||typeof db!=='object'||Array.isArray(db)||!db.users||!db.threads||typeof db.users!=='object'||typeof db.threads!=='object')throw Error('Invalid database structure');return db}
try{
 if(!['create','verify','restore'].includes(cmd)||!input||!output||!keyFile)throw Error('Usage: create|verify|restore INPUT OUTPUT KEY_FILE');
 const key=fs.readFileSync(keyFile);if(key.length!==32)throw Error('Key file must contain exactly 32 random bytes');
 if(path.resolve(input)===path.resolve(output))throw Error('Input and output must differ');
 if(cmd==='create'){
  const raw=fs.readFileSync(input);validate(JSON.parse(raw));const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([c.update(raw),c.final()]);
  fs.writeFileSync(output,JSON.stringify({format:'hamsa-db-v1',created:new Date().toISOString(),iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),data:encrypted.toString('base64')}),{mode:0o600,flag:'wx'});console.log('Encrypted database snapshot created. Media is NOT included.');
 }else{
  const x=JSON.parse(fs.readFileSync(input,'utf8'));if(x.format!=='hamsa-db-v1')throw Error('Unknown snapshot format');const d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(x.iv,'base64'));d.setAuthTag(Buffer.from(x.tag,'base64'));const raw=Buffer.concat([d.update(Buffer.from(x.data,'base64')),d.final()]);const db=validate(JSON.parse(raw));
  if(cmd==='verify')console.log('Authenticated decryption and database structure verified.');
  else{db.sessions={};db.resets={};db.outbox=[];fs.writeFileSync(output,JSON.stringify(db),{mode:0o600,flag:'wx'});console.log('Restored to NEW local file only. Sessions and reset links invalidated. No remote data changed.');}
 }
}catch(e){console.error('Backup operation failed:',e.message);process.exitCode=1}
