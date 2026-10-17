// Seguridad 3 LINE-AR: analiza solo archivos de aplicación; NO muestra valores detectados.
// La clave de configuración web Firebase (AIza...) identifica el proyecto, NO es un
// secreto privado; su protección se configura mediante Firebase Rules, App Check, IAM y límites.
import fs from 'node:fs';
const targets=['game.js','auth.js','index.html','ads-rewarded.js','ads-config.json','auth-config.json'];
const sensitive=[
 ['Clave privada PEM',/-----BEGIN\s+(?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
 ['Clave de acceso AWS',/AKIA[0-9A-Z]{16}/],
 ['Credencial GitHub',/(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{32,}/],
 ['Token de GitHub',/github_pat_[A-Za-z0-9_]{40,}/],
 ['Token de OpenAI',/sk-[A-Za-z0-9_-]{28,}/],
 ['Clave Firebase Admin',/(?:private_key|privateKey)\s*[:=]\s*['"]-----BEGIN/],
 ['Secret OAuth hardcodeado',/(?:client_secret|clientSecret|session_secret|sessionSecret)\s*[:=]\s*['"][A-Za-z0-9_+/=-]{16,}['"]/]
];
let errors=0;
for(const file of targets){
 if(!fs.existsSync(file))continue;
 const data=fs.readFileSync(file,'utf8');
 for(const [name,pattern] of sensitive){
  if(pattern.test(data)){console.error('Fallo de seguridad: '+name+' en '+file+' (valor oculto)');errors++;}
 }
}
for(const file of ['.gitignore','SECURITY.md','docs/SEGURIDAD_GRATUITA_3LINE.md']){
 if(!fs.existsSync(file)){console.error('Falta archivo de protección: '+file);errors++;}
}
if(errors)process.exit(1);
console.log('Revisión básica de credenciales: completada sin patrones privados detectados. No sustituye auditoría.');
