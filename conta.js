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

 const areas=['Meu personagem','Gazeta','Instituições','Legislação','Segurança','Cidadãos'];
 function renderPortal(){
   const nav=$('portal-nav'),view=$('portal-view');
   const node=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
   let generation=0;
   async function loadProfile(target,version){
     const current=token;
     try {
       const r=await request('profile',current);
       if(token!==current||version!==generation)return;
       if(!r.ok){target.textContent='Perfil ainda indisponível no servidor.';return;}
       const d=JSON.parse(r.value);
       if(d.uuid!==playerId)throw Error('Identidade inválida');
       target.replaceChildren();
       const add=(label,value)=>{if(value!==undefined&&value!==null)target.append(node('p',label+': '+String(value)));};
       add('Nickname',d.nick);add('Estado',d.online?'Online':'Offline');
       add('Mundo',d.world);if([d.x,d.y,d.z].every(Number.isFinite))add('Coordenadas',[d.x,d.y,d.z].join(', '));
       if(Number.isFinite(d.health)&&Number.isFinite(d.maxHealth))add('Vida',d.health+' / '+d.maxHealth);
       add('Fome',d.food);add('Nível',d.level);if(Number.isFinite(d.xp))add('Progresso XP',Math.round(d.xp*100)+'%');
       for(const [label,key] of [['Raça','race'],['Clã','clan'],['Cargos','roles'],['Saldo','wallet'],['Dívida','debt'],['Sexo','sex'],['Idade','age']])add(label,d[key]);
       if(Array.isArray(d.achievements)){target.append(node('h4','Conquistas'));for(const a of d.achievements)target.append(node('p',String(a)));}
       if(Number.isFinite(d.updatedAt))add('Atualizado',new Date(d.updatedAt*1000).toLocaleString('pt-BR'));
       for(const [label,key,count] of [['Inventário','inventory',36],['Armaduras','equipment',4]]){
         if(!Array.isArray(d[key]))continue;
         target.append(node('h4',label));const grid=node('div','');grid.className='inventory-grid';
         for(let i=0;i<count;i++){const item=d[key].find(x=>x&&x.slot===i);const slot=node('div',item?String(item.type).replace(/^minecraft:/,'').replaceAll('_',' ')+' ×'+item.amount:'Vazio');slot.className='inventory-slot';grid.append(slot);}
         target.append(grid);
       }
     }catch{if(token===current&&version===generation)target.textContent='Não foi possível consultar o perfil.';}
   }
   const visibility={nick:'Nickname',race:'Raça',clan:'Clã',roles:'Cargos',sex:'Sexo',age:'Idade',wallet:'Saldo',debt:'Dívida',inventory:'Inventário',equipment:'Equipamentos',location:'Localização',achievements:'Conquistas',health:'Vida',food:'Alimentação',level:'Nível e XP',online:'Status online'};
   async function privacy(version){
     const current=token, panel=node('div','Carregando privacidade…');view.append(panel);
     const active=()=>token===current&&version===generation;
     try{
       const r=await request('profile-privacy',current);if(!active())return;
       if(!r.ok)throw Error();
       panel.replaceChildren(node('h4','Visibilidade do personagem'));
       const selected=new Set(r.value.split(',')), checks=[];
       for(const [key,label] of Object.entries(visibility)){
         const row=node('label',''), check=document.createElement('input');check.type='checkbox';check.checked=selected.has(key);check.value=key;checks.push(check);row.append(check,document.createTextNode(' '+label));panel.append(row);
       }
       const save=node('button','Salvar privacidade'), feedback=node('p','');save.type='button';panel.append(save,feedback);
       save.onclick=async()=>{save.disabled=true;try{const result=await request('profile-privacy',current+'\n'+checks.filter(c=>c.checked).map(c=>c.value).join(','));if(active())feedback.textContent=result.ok?'Preferências salvas.':'Não foi possível salvar.';}catch{if(active())feedback.textContent='Conexão indisponível.';}finally{save.disabled=false;}};
     }catch{if(active())panel.textContent='Privacidade indisponível nesta versão do servidor.';}
   }
   function citizens(version){
     const current=token, input=document.createElement('input'), search=node('button','Pesquisar'), results=node('div',''), admin=node('button','Pesquisa administrativa');
     input.placeholder='Nickname';input.maxLength=64;input.setAttribute('aria-label','Nickname do cidadão');search.type=admin.type='button';view.append(input,search,admin,results);
     let sequence=0;
     async function run(mode){
       const seq=++sequence, active=()=>token===current&&version===generation&&seq===sequence;
       results.textContent='Consultando…';
       try{
         const r=await request('citizens',current+'\n'+input.value.replace(/[\r\n]/g,'')+'\n'+mode);if(!active())return;
         if(!r.ok){results.textContent=r.code===403?'Acesso não autorizado.':'Diretório indisponível.';return;}
         const entries=JSON.parse(r.value);results.replaceChildren();
         if(!entries.length)results.textContent='Nenhum cidadão encontrado.';
         for(const entry of entries){if(!uuid.test(entry.uuid))continue;const button=node('button',entry.nick);button.type='button';results.append(button);
           button.onclick=async()=>{const detailSeq=++sequence;try{const response=await request(mode==='admin'?'profile-inspect':'profile-shared',current+'\n'+entry.uuid);if(token!==current||version!==generation||sequence!==detailSeq)return;if(!response.ok){results.textContent='Perfil indisponível ou acesso não autorizado.';return;}const d=JSON.parse(response.value);results.replaceChildren(node('h4',d.nick||'Perfil'));for(const [key,value] of Object.entries(d)){if(key==='uuid'||key==='nick')continue;results.append(node('p',(visibility[key]||key)+': '+(typeof value==='object'?JSON.stringify(value):String(value))));}}catch{if(token===current&&version===generation&&sequence===detailSeq)results.textContent='Não foi possível consultar.';}};
         }
       }catch{if(active())results.textContent='Diretório indisponível.';}
     }
     search.onclick=()=>run('shared');admin.onclick=()=>run('admin');
   }
   function show(area){
     const version=++generation;
     for(const b of nav.children)b.setAttribute('aria-pressed',String(b.textContent===area));
     view.replaceChildren(node('h3',area));
     const p=t=>view.append(node('p',t));
     const link=(label,url)=>{const a=node('a',label);a.href=url;a.className='text-link';view.append(a);};
     if(area===areas[0]){p('Nickname: '+playerNick);p('Identificador da conta: '+playerId);const target=node('div','Consultando perfil…');view.append(target);void loadProfile(target,version);}
     if(area===areas[1]){p('A leitura pública está disponível. A redação aguarda uma API de permissões e publicação autenticada.');link('Ler a Gazeta','noticias.html');}
     if(area===areas[2])p('A composição real das instituições ainda não está disponível pela API.');
     if(area===areas[3])p('A consulta de leis e as votações aguardam integração com o sistema legislativo.');
     if(area===areas[4]){p('Sessão verificada pelo TD-Central.');p('Para alterar a senha ou renovar a ativação, utilize /site no Minecraft.');void privacy(version);}
     if(area===areas[5])citizens(version);
   }
   nav.replaceChildren(...areas.map(area=>{const b=node('button',area);b.type='button';b.onclick=()=>show(area);return b;}));show(areas[0]);
 }
 $('account-forms').hidden=false;
})();