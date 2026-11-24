'use strict';
(() => {
 const api='https://api.trindadecraft.com.br:25585/v1/';
 const $=id=>document.getElementById(id);
 let token=null, busy=false, timer=null;
 const status=message=>{$('account-status').textContent=message;};
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const validToken=/^[A-Za-z0-9_-]{43}$/;
 async function request(route,body){
   const response=await fetch(api+route,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body,credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});
   return {ok:response.ok,code:response.status,value:(await response.text()).trim()};
 }
 function mode(activate){$('login').hidden=activate;$('activate').hidden=!activate;$('show-login').setAttribute('aria-pressed',String(!activate));$('show-activate').setAttribute('aria-pressed',String(activate));status('');}
 function lock(value){busy=value;document.querySelectorAll('.account-card button').forEach(b=>b.disabled=value);}
 function clearSession(){token=null;clearInterval(timer);timer=null;$('signed-in').hidden=true;$('identity').textContent='';$('account-forms').hidden=false;mode(false);}
 async function verify(){const current=token;if(!current)return false;try{const r=await request('session',current);if(token!==current)return false;if(r.ok&&uuid.test(r.value))return true;}catch{}if(token===current){clearSession();status('Sessão encerrada ou não foi possível validá-la. Entre novamente.');}return false;}
 $('show-login').onclick=()=>mode(false);$('show-activate').onclick=()=>mode(true);
 $('activate').onsubmit=async e=>{e.preventDefault();if(busy)return;const code=$('activation-code').value.trim(),password=$('new-password').value;if(!validToken.test(code)||password.length<12||password.length>128||password!==$('confirm-password').value){status('Confira o código e a confirmação da senha.');return;}lock(true);status('Validando código…');try{const r=await request('activate',code+'\n'+password);if(r.ok&&r.value==='OK'){mode(false);status('Conta ativada. Entre com seu nickname e a nova senha.');}else status(r.code===429?'Muitas tentativas. Aguarde um minuto.':'Não foi possível ativar. Gere um novo código no Minecraft.');}catch{status('Conexão indisponível. Tente novamente.');}finally{$('activate').reset();lock(false);}};
 $('login').onsubmit=async e=>{e.preventDefault();if(busy)return;const nick=$('nick').value.trim(),password=$('password').value;if(!nick||/[\r\n]/.test(nick)||!password)return;lock(true);status('Consultando o reino…');try{const r=await request('login',nick+'\n'+password);if(r.ok&&validToken.test(r.value)){token=r.value;if(await verify()){$('account-forms').hidden=true;$('signed-in').hidden=false;$('identity').textContent='Bem-vindo, '+nick+'.';status('');timer=setInterval(()=>{void verify();},30000);}}else status(r.code===429?'Muitas tentativas. Aguarde um minuto.':'Acesso não autorizado. Confira os dados e seu cargo no Minecraft.');}catch{status('Conexão indisponível. Tente novamente.');}finally{$('password').value='';lock(false);}};
 $('logout').onclick=async()=>{if(busy)return;lock(true);const current=token;clearSession();try{const r=await request('logout',current);status(r.ok?'Sessão encerrada.':'Sessão local encerrada; servidor não confirmou a revogação.');}catch{status('Sessão local encerrada; servidor não confirmou a revogação.');}finally{lock(false);}};
 addEventListener('pagehide',()=>{const current=token;token=null;clearInterval(timer);if(current)fetch(api+'logout',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:current,credentials:'omit',keepalive:true,redirect:'error'}).catch(()=>{});});
 addEventListener('pageshow',e=>{if(e.persisted){clearSession();lock(false);}});
 $('account-forms').hidden=false;
})();