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
 function lock(value){busy=value;$('portal-loading').hidden=!value;document.querySelectorAll('.account-card button').forEach(b=>b.disabled=value);}
 function clearSession(){try{localStorage.removeItem('td.portal.session');}catch{}delete document.body.dataset.realm;document.body.classList.remove('portal-authenticated');playerId=null;playerNick='';$('portal-view').replaceChildren();$('portal-nav').replaceChildren();token=null;clearInterval(timer);timer=null;$('signed-in').hidden=true;$('identity').textContent='';$('account-forms').hidden=false;mode(false);}
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
     else status(r.code===429?'Muitas tentativas. Aguarde um minuto.':'Confira a senha e o PIN. Se o PIN venceu ou atingiu o limite de tentativas, gere outro dentro do servidor.');
   }catch{status('Conexão indisponível. Tente novamente.');}
   finally{$('activation-password').value='';lock(false);}
 };
 $('login').onsubmit=async e=>{e.preventDefault();if(busy)return;const nick=$('nick').value.trim(),password=$('password').value;if(!nick||/[\r\n]/.test(nick)||!password)return;lock(true);status('');try{const r=await request('login',nick+'\n'+password);if(r.ok&&validToken.test(r.value)){token=r.value;if(await verify()){$('account-forms').hidden=true;$('signed-in').hidden=false;document.body.classList.add('portal-authenticated');$('identity').textContent='Bem-vindo, '+nick+'.';playerNick=nick;try{localStorage.setItem('td.portal.session',JSON.stringify({token, nick, expires:Date.now()+28800000}));}catch{}renderPortal();status('');timer=setInterval(()=>{void verify();},30000);}}else status(r.code===429?'Muitas tentativas. Aguarde um minuto.':'Confira os dados. Se a ativação venceu, gere um PIN pelo /site dentro do servidor.');}catch{status('Conexão indisponível. Tente novamente.');}finally{$('password').value='';lock(false);}};
 $('logout').onclick=async()=>{if(busy)return;lock(true);const current=token;clearSession();try{const r=await request('logout',current);status(r.ok?'Sessão encerrada.':'Sessão local encerrada; servidor não confirmou a revogação.');}catch{status('Sessão local encerrada; servidor não confirmou a revogação.');}finally{lock(false);}};
 addEventListener('pagehide',()=>{clearInterval(timer);});
 addEventListener('pageshow',e=>{if(e.persisted){void verify();clearInterval(timer);timer=setInterval(()=>void verify(),30000);}});
 addEventListener('storage',e=>{if(e.key==='td.portal.session'&&token){try{if(JSON.parse(e.newValue||'null')?.token!==token)clearSession();}catch{clearSession();}}});
 const helpButtons=[...document.querySelectorAll('.help-trigger')];
 function closeHelp(except){for(const button of helpButtons){if(button===except)continue;button.setAttribute('aria-expanded','false');button.nextElementSibling.hidden=true;}}
 function openHelp(button){closeHelp(button);button.setAttribute('aria-expanded','true');button.nextElementSibling.hidden=false;}
 for(const button of helpButtons){const anchor=button.parentElement;anchor.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')openHelp(button);});anchor.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')closeHelp();});button.addEventListener('click',()=>{if(button.getAttribute('aria-expanded')==='true')closeHelp();else openHelp(button);});button.addEventListener('blur',()=>closeHelp());}
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.help-anchor'))closeHelp();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeHelp();});
 const areas=['Meu personagem','Gazeta','Instituições','Legislação','Segurança','Cidadãos'];
 function renderPortal(){
   const nav=$('portal-nav'),view=$('portal-view');
   const node=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
   let generation=0, preview=null;
   const themes={neutral:'Trindade',elf:'Selva',fairy:'Dragônia',colossus:'Trevas',imperial:'Imperial'};
   const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
   async function loadProfile(target,version){
     const current=token;
     try {
       const r=await request('profile',current);
       if(token!==current||version!==generation)return;
       if(!r.ok){target.textContent='Perfil ainda indisponível no servidor.';return;}
       const d=JSON.parse(r.value);
       if(d.uuid!==playerId)throw Error('Identidade inválida');
       target.replaceChildren();
       const primordial=Array.isArray(d.roles)&&d.roles.some(role=>normalize(role)==='primordial');
       const race=normalize(d.race);
       const actual=primordial?'imperial':/elf/.test(race)?'elf':/fad|fairy/.test(race)?'fairy':/coloss/.test(race)?'colossus':'neutral';
       if(!primordial)preview=null;
       document.body.dataset.realm=preview||actual;
       if(primordial){const controls=node('div','');controls.className='theme-preview';const label=node('label','Experimentar aparência');const select=document.createElement('select');select.setAttribute('aria-label','Experimentar aparência');for(const [key,name] of Object.entries(themes)){const option=node('option',name);option.value=key;select.append(option);}select.value=preview||actual;select.onchange=()=>{preview=select.value;document.body.dataset.realm=preview;const caption=target.querySelector('.realm-caption');if(caption)caption.textContent=themes[preview];};const reset=node('button','Restaurar');reset.type='button';reset.onclick=()=>{preview=null;select.value=actual;document.body.dataset.realm=actual;const caption=target.querySelector('.rpg-portrait span');if(caption)caption.textContent=themes[actual];};controls.append(label,select,reset,node('small','Somente visual, nesta sessão.'));target.append(controls);}
       const dashboard=node('div','');dashboard.className='rpg-dashboard';target.append(dashboard);const portrait=node('div','');portrait.className='rpg-portrait';portrait.append(node('span',themes[preview||actual]));const left=node('div','');left.className='rpg-column';const right=node('div','');right.className='rpg-column';dashboard.append(left,right);const add=(label,value)=>{if(value!==undefined&&value!==null)(target.querySelector('.character-details')||target).append(node('p',label+': '+String(value)));};
       const hero=node('div','');hero.className='character-hero';const crest=node('div','♜');crest.className='character-crest';const bio=node('div','');bio.append(node('h2',d.nick),node('p',(d.race||'Raça não informada')+' · '+(d.online?'Online':'Offline')));hero.append(crest,bio);portrait.replaceChildren(hero);target.insertBefore(portrait,dashboard);
       const vitals=node('section','');vitals.className='rpg-panel vitals-panel';right.append(vitals);const stats=node('div','');stats.className='character-stats';vitals.append(stats);
       const stat=(icon,label,value)=>{if(value===undefined||value===null)return;const card=node('div','');card.className='character-stat '+(label==='Vida'?'stat-health':label==='Fome'?'stat-food':'stat-secondary');card.append(node('span',icon+' '+label),node('strong',String(value)));if(label==='Vida'||label==='Fome'){const meter=node('div','');meter.className='rpg-meter';const n=label==='Vida'?d.health/d.maxHealth:d.food/20;for(let k=0;k<10;k++){const mark=node('span',label==='Vida'?'♥':'🍗');if(k>=Math.ceil(n*10))mark.className='empty-meter';meter.append(mark);}card.append(meter);const bar=document.createElement('progress');bar.max=1;bar.value=Math.max(0,Math.min(1,n||0));bar.setAttribute('aria-label',label);card.append(bar);}stats.append(card);};
       stat('♥','Vida',Number.isFinite(d.health)&&Number.isFinite(d.maxHealth)?d.health+' / '+d.maxHealth:null);stat('🍗','Fome',d.food);stat('✦','Nível',d.level);stat('◈','Saldo',d.wallet);
       if(Number.isFinite(d.xp)){const xp=node('div','');xp.className='xp-panel';const bar=document.createElement('progress');bar.max=1;bar.value=Math.max(0,Math.min(1,d.xp));xp.append(node('span','Experiência · '+Math.round(d.xp*100)+'%'),bar);vitals.append(xp);}
       const details=node('div','');details.className='character-details';left.append(details);
       add('Mundo',d.world);if([d.x,d.y,d.z].every(Number.isFinite))add('Coordenadas',[d.x,d.y,d.z].join(', '));
       
       for(const [label,key] of [['Raça','race'],['Clã','clan'],['Cargos','roles'],['Dívida','debt'],['Sexo','sex'],['Idade','age']])add(label,d[key]);
       if(Array.isArray(d.achievements)){const trophies=node('details','');trophies.className='achievement-panel';trophies.append(node('summary','🏆 Conquistas · '+d.achievements.length));const medals=node('div','');medals.className='medal-grid';const titles={'story/root':'A aventura começa','story/mine_stone':'Idade da Pedra','story/upgrade_tools':'Hora de melhorar','story/smelt_iron':'Adquirindo ferramentas','story/diamonds':'Diamantes!','story/enter_the_nether':'Precisamos ir mais fundo','nether/root':'O Nether','end/root':'O Fim','adventure/root':'Aventura','husbandry/root':'Agricultura','story/obtain_armor':'Vista-se para a batalha','story/shiny_gear':'Cubra-me de diamantes','story/iron_tools':'Não é uma picareta qualquer'};for(const a of d.achievements){const key=String(a).replace(/^minecraft:/,'');const medal=node('div','');medal.className='medal';const symbol=key.includes('diamond')?'💎':key.startsWith('nether/')?'🔥':key.startsWith('end/')?'🐉':key.startsWith('husbandry/')?'🌾':key.startsWith('adventure/')?'⚔️':'🏅';medal.append(node('span',symbol),node('strong',titles[key]||key.split('/').pop().replaceAll('_',' ')));medal.title=key;medals.append(medal);}trophies.append(medals);right.append(trophies);trophies.open=true;}
       if(Number.isFinite(d.updatedAt))portrait.title='Atualizado: '+new Date(d.updatedAt*1000).toLocaleString('pt-BR');
       for(const [label,key,count] of [['Inventário','inventory',36],['Armaduras','equipment',4]]){
         if(!Array.isArray(d[key]))continue;
         const panel=node('section','');panel.className='rpg-panel';panel.append(node('h4',key==='inventory'?'▣ Inventário · 36 slots':'♜ Equipamentos'));const grid=node('div','');grid.className='inventory-grid '+(key==='equipment'?'equipment-grid':'');
         for(let i=0;i<count;i++){const index=key==='inventory'?(i+9)%36:3-i;const item=d[key].find(x=>x&&x.slot===index);const slot=node('div',item?String(item.type).replace(/^minecraft:/,'').replaceAll('_',' ')+' ×'+item.amount:'Vazio');slot.className='inventory-slot'+(item?' filled':'')+(key==='inventory'&&i>=27?' hotbar-slot':'');if(!item)slot.textContent='';else {const id=String(item.type);slot.title=id+' ×'+item.amount;const img=document.createElement('img');img.alt=id.replace(/^minecraft:/,'').replaceAll('_',' ');img.referrerPolicy='no-referrer';const count=node('span',String(item.amount));count.className='item-count';if(/^minecraft:[a-z0-9_]+$/.test(id)){img.src='https://project-crafting.github.io/minecraft-auto-updated-textures-api/items/'+id.slice(10)+'.png';img.onerror=()=>{img.remove();slot.prepend(node('span',img.alt));};slot.replaceChildren(img,count);} }grid.append(slot);}
         panel.append(grid);if(key==='equipment')left.append(panel);else right.insertBefore(panel,right.querySelector('.achievement-panel'));
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
     if(area===areas[0]){const target=node('div','Consultando perfil…');view.append(target);void loadProfile(target,version);}
     if(area===areas[1]){p('A leitura pública está disponível. A redação aguarda uma API de permissões e publicação autenticada.');link('Ler a Gazeta','noticias.html');}
     if(area===areas[2])p('A composição real das instituições ainda não está disponível pela API.');
     if(area===areas[3])p('A consulta de leis e as votações aguardam integração com o sistema legislativo.');
     if(area===areas[4]){p('Sessão verificada pelo TD-Central.');p('Para alterar a senha ou renovar a ativação, utilize /site dentro do servidor.');void privacy(version);}
     if(area===areas[5])citizens(version);
   }
   nav.replaceChildren(...areas.map(area=>{const b=node('button',area);b.type='button';b.onclick=()=>show(area);return b;}));show(areas[0]);
 }
 $('account-forms').hidden=false;
 (async()=>{let saved;try{saved=JSON.parse(localStorage.getItem('td.portal.session')||'null');}catch{return;}if(!saved||!validToken.test(saved.token)||!Number.isFinite(saved.expires)||saved.expires<=Date.now()){try{localStorage.removeItem('td.portal.session');}catch{}return;}token=saved.token;lock(true);try{if(await verify()){playerNick=String(saved.nick||'');$('account-forms').hidden=true;$('signed-in').hidden=false;document.body.classList.add('portal-authenticated');$('identity').textContent='Bem-vindo, '+playerNick+'.';renderPortal();timer=setInterval(()=>void verify(),30000);}}finally{lock(false);}})();
})();