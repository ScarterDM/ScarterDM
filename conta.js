'use strict';
(() => {
 const api='https://api.trindadecraft.com.br:25585/v1/';
 const $=id=>document.getElementById(id);
 let token=null, busy=false, timer=null, playerId=null, playerNick='';
 const status=message=>{$('account-status').textContent=message;};
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const validToken=/^[A-Za-z0-9_-]{43}$/;
 async function request(route,body){
   const response=await fetch(api+route,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body,credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});
   return {ok:response.ok,code:response.status,value:(await response.text()).trim()};
 }
 function mode(activate){$('login').hidden=activate;$('activate').hidden=!activate;$('show-login').setAttribute('aria-pressed',String(!activate));$('show-activate').setAttribute('aria-pressed',String(activate));status('');}
 function lock(value){busy=value;document.querySelectorAll('.account-card button').forEach(b=>b.disabled=value);}
 function clearSession(){playerId=null;playerNick='';$('portal-view').replaceChildren();$('portal-nav').replaceChildren();token=null;clearInterval(timer);timer=null;$('signed-in').hidden=true;$('identity').textContent='';$('account-forms').hidden=false;mode(false);}
 async function verify(){const current=token;if(!current)return false;try{const r=await request('session',current);if(token!==current)return false;if(r.ok&&uuid.test(r.value)){playerId=r.value;return true;}}catch{}if(token===current){clearSession();status('Sessão encerrada ou não foi possível validá-la. Entre novamente.');}return false;}
 $('show-login').onclick=()=>mode(false);$('show-activate').onclick=()=>mode(true);
 $('activate').onsubmit=async e=>{
   e.preventDefault();
   if(busy)return;
   const nick=$('activation-nick').value.trim(),pin=$('activation-pin').value,password=$('activation-password').value;
   if(!nick||/[\r\n]/.test(nick)||!/^[0-9]{4}$/.test(pin)||password.length<12||password.length>128){status('Confira o nickname, o PIN e a senha.');return;}
   lock(true);status('Validando PIN…');
   try{
     const r=await request('confirm-pin',nick+'\n'+pin+'\n'+password);
     if(r.ok&&r.value==='OK'){$('activate').reset();$('nick').value=nick;mode(false);status('Conta confirmada. Entre com seu nickname e sua senha.');}
     else status(r.code===429?'Muitas tentativas. Aguarde um minuto.':'Confira a senha e o PIN. Se o PIN venceu ou atingiu o limite de tentativas, gere outro no Minecraft.');
   }catch{status('Conexão indisponível. Tente novamente.');}
   finally{$('activation-password').value='';lock(false);}
 };
 $('login').onsubmit=async e=>{e.preventDefault();if(busy)return;const nick=$('nick').value.trim(),password=$('password').value;if(!nick||/[\r\n]/.test(nick)||!password)return;lock(true);status('Consultando o reino…');try{const r=await request('login',nick+'\n'+password);if(r.ok&&validToken.test(r.value)){token=r.value;if(await verify()){$('account-forms').hidden=true;$('signed-in').hidden=false;$('identity').textContent='Bem-vindo, '+nick+'.';playerNick=nick;renderPortal();status('');timer=setInterval(()=>{void verify();},30000);}}else status(r.code===429?'Muitas tentativas. Aguarde um minuto.':'Confira os dados. Se a ativação venceu, gere um PIN pelo /site no Minecraft.');}catch{status('Conexão indisponível. Tente novamente.');}finally{$('password').value='';lock(false);}};
 $('logout').onclick=async()=>{if(busy)return;lock(true);const current=token;clearSession();try{const r=await request('logout',current);status(r.ok?'Sessão encerrada.':'Sessão local encerrada; servidor não confirmou a revogação.');}catch{status('Sessão local encerrada; servidor não confirmou a revogação.');}finally{lock(false);}};
 addEventListener('pagehide',()=>{const current=token;token=null;clearInterval(timer);if(current)fetch(api+'logout',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:current,credentials:'omit',keepalive:true,redirect:'error'}).catch(()=>{});});
 addEventListener('pageshow',e=>{if(e.persisted){clearSession();lock(false);}});

 const areas=['Meu personagem','Gazeta','Instituições','Legislação','Segurança'];
 function renderPortal(){
   const nav=$('portal-nav'),view=$('portal-view');
   const node=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
   function show(area){
     for(const b of nav.children)b.setAttribute('aria-pressed',String(b.textContent===area));
     view.replaceChildren(node('h3',area));
     const p=t=>view.append(node('p',t));
     const link=(label,url)=>{const a=node('a',label);a.href=url;a.className='text-link';view.append(a);};
     if(area===areas[0]){p('Nickname: '+playerNick);p('Identificador da conta: '+playerId);p('Raça, reino, cargos e atributos ainda aguardam integração com o servidor.');}
     if(area===areas[1]){p('A leitura pública está disponível. A redação aguarda uma API de permissões e publicação autenticada.');link('Ler a Gazeta','noticias.html');}
     if(area===areas[2])p('A composição real das instituições ainda não está disponível pela API.');
     if(area===areas[3])p('A consulta de leis e as votações aguardam integração com o sistema legislativo.');
     if(area===areas[4]){p('Sessão verificada pelo TD-Central.');p('Para alterar a senha ou renovar a ativação, utilize /site no Minecraft.');p('As configurações de privacidade ainda aguardam integração.');}
   }
   nav.replaceChildren(...areas.map(area=>{const b=node('button',area);b.type='button';b.onclick=()=>show(area);return b;}));show(areas[0]);
 }
 $('account-forms').hidden=false;
})();