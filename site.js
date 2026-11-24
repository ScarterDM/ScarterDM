'use strict';
(() => {
  const nav = document.querySelector('#navegacao');
  const menu = document.querySelector('.menu-toggle');
  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Fechar navegação' : 'Abrir navegação');
    menu.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
  };
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setMenu(false); menu.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) setMenu(false);
  });

  const toast = document.querySelector('#toast');
  let toastTimer;
  function notify(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4500);
  }
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* Try the compatible fallback. */ }
    }
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.setAttribute('aria-label', 'Texto para copiar');
    Object.assign(field.style, { position: 'fixed', left: '-9999px', top: '0' });
    document.body.append(field);
    const active = document.activeElement;
    field.select(); field.setSelectionRange(0, text.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
    field.remove();
    if (active && active.focus) active.focus({ preventScroll: true });
    return copied;
  }
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const text = button.dataset.copy;
      const success = await copyText(text);
      notify(success ? `Copiado: ${text}` : `Copie manualmente: ${text}`);
    });
  });

  function initTabs(container, onSelect) {
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    function select(tab, focus = false) {
      for (const candidate of tabs) {
        const selected = candidate === tab;
        candidate.setAttribute('aria-selected', String(selected));
        candidate.tabIndex = selected ? 0 : -1;
      }
      onSelect(tab);
      if (focus) tab.focus();
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { event.preventDefault(); select(tabs[next], true); }
      });
    });
  }
  const races = {
    fada: {
      role: 'Suporte · agilidade', title: 'Pequena no tamanho. Imensa na equipe.', glyph: '✧',
      description: 'A fada combina voo, mobilidade e cura à distância. Seu lugar é ao lado dos aliados — e, quando o perigo chega, um bom voo pode mudar o rumo da história.',
      abilities: ['Voo para explorar e escapar', 'Cura de aliados à distância', 'Tamanho reduzido e brilho mágico']
    },
    elfo: {
      role: 'Ataque · precisão', title: 'A floresta conhece sua força.', glyph: '❧',
      description: 'O elfo faz da agilidade uma vantagem. Com rajadas, alcance e saltos, encontra caminhos onde os outros enxergam obstáculos e abre espaço para sua equipe.',
      abilities: ['Rajadas para pressionar o adversário', 'Agilidade, alcance e salto', 'Afinidade com a natureza']
    },
    colosso: {
      role: 'Força · impacto', title: 'Quando você avança, o mundo percebe.', glyph: '◇',
      description: 'O colosso é presença de verdade: grande, forte e marcante. Suas investidas e impactos mudam o campo de batalha, enquanto seus aliados encontram uma oportunidade de agir.',
      abilities: ['Força e tamanho ampliados', 'Investidas de grande impacto', 'Ataques que atordoam adversários']
    }
  };
  initTabs(document.querySelector('.people-tabs'), tab => {
    const race = races[tab.dataset.race];
    document.querySelector('#race-role').textContent = race.role;
    document.querySelector('#race-name').textContent = race.title;
    document.querySelector('#race-description').textContent = race.description;
    document.querySelector('.people-glyph').textContent = race.glyph;
    document.querySelector('#people-panel').setAttribute('aria-labelledby', tab.id);
    document.querySelector('#race-abilities').replaceChildren(...race.abilities.map(text => {
      const li = document.createElement('li'); li.textContent = text; return li;
    }));
  });
  initTabs(document.querySelector('.join-tabs'), tab => {
    document.querySelectorAll('.join-panel').forEach(panel => {
      panel.hidden = panel.id !== tab.getAttribute('aria-controls');
    });
  });

  const labels = { novidade: 'Novidade', melhoria: 'Melhoria', correcao: 'Correção' };
  const updatesContainer = document.querySelector('#updates-list');
  let updates = [];
  let selectedFilter = 'todas';
  let loadFailed = false;
  function emptyState(title, description) {
    const box = document.createElement('div'); box.className = 'updates-empty';
    const content = document.createElement('div');
    const heading = document.createElement('h3'); heading.textContent = title;
    const p = document.createElement('p'); p.textContent = description;
    content.append(heading, p); box.append(content); return box;
  }
  function renderUpdates() {
    const visible = updates.filter(note => selectedFilter === 'todas' || note.categoria === selectedFilter);
    if (!visible.length) {
      const title = loadFailed ? 'As notas não puderam ser carregadas.' : updates.length ? 'Nenhuma nota nesta categoria.' : 'Os próximos capítulos ficam aqui.';
      const description = loadFailed ? 'Tente novamente mais tarde. Os endereços para entrar continuam disponíveis nesta página.' : updates.length ? 'Escolha outro filtro para acompanhar as atualizações oficiais.' : 'As primeiras notas oficiais serão publicadas após a aprovação das atualizações. Enquanto isso, conheça o universo e prepare sua chegada.';
      updatesContainer.replaceChildren(emptyState(title, description));
      return;
    }
    updatesContainer.replaceChildren(...visible.map(note => {
      const article = document.createElement('article'); article.className = 'update-entry';
      const time = document.createElement('time'); time.dateTime = note.data;
      time.textContent = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Manaus' }).format(new Date(`${note.data}T12:00:00-04:00`));
      const content = document.createElement('div');
      const type = document.createElement('span'); type.className = 'detail-chip'; type.textContent = labels[note.categoria];
      const heading = document.createElement('h3'); heading.textContent = note.titulo;
      const summary = document.createElement('p'); summary.textContent = note.resumo;
      content.append(type, heading, summary);
      if (Array.isArray(note.mudancas) && note.mudancas.length) {
        const ul = document.createElement('ul');
        note.mudancas.forEach(text => { const li = document.createElement('li'); li.textContent = text; ul.append(li); });
        content.append(ul);
      }
      article.append(time, content); return article;
    }));
  }
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      selectedFilter = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(filter => {
        const selected = filter === button;
        filter.classList.toggle('active', selected); filter.setAttribute('aria-pressed', String(selected));
      });
      renderUpdates();
    });
  });
  fetch('dados/notas.json', { cache: 'no-cache' })
    .then(response => { if (!response.ok) throw new Error('Notas indisponíveis'); return response.json(); })
    .then(data => {
      if (!Array.isArray(data.notas)) throw new Error('Formato inválido');
      updates = data.notas.filter(note => note.aprovada === true && note.oficial === true && labels[note.categoria] && /^\d{4}-\d{2}-\d{2}$/.test(note.data) && typeof note.titulo === 'string' && typeof note.resumo === 'string')
        .sort((a, b) => b.data.localeCompare(a.data));
      renderUpdates();
    })
    .catch(() => { loadFailed = window.location.protocol !== 'file:'; renderUpdates(); });
})();

(() => {
 const hero=document.querySelector('.hero'); if(!hero)return;
 const style=document.createElement('style');style.textContent=`
 @media(pointer:fine){body{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cpath d='M2 2L25 19L14 20L18 29L12 31L8 22L2 27Z' fill='%23e6bf65' stroke='%23593a17' stroke-width='1.5'/%3E%3C/svg%3E") 2 2,auto}a,button{cursor:pointer}}
 .td-spark{position:absolute;pointer-events:none;z-index:3;border-radius:50%;background:#ffe4a0;box-shadow:0 0 8px #ffc45a;animation:td-drift 1.4s ease-out forwards}
 @keyframes td-drift{to{transform:translate(var(--dx),var(--dy));opacity:0}}
 .td-hotspot{position:absolute;z-index:4;border:0;background:transparent;color:#f9e6b6;cursor:pointer;padding:0}
 .td-hotspot span{display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);width:190px;padding:12px;background:#191b13f5;border:1px solid #e2bd6c;border-radius:8px;font:italic 16px Georgia;box-shadow:0 4px 20px #0008}
 .td-hotspot:hover span,.td-hotspot:focus span{display:block}
 @media(max-width:1100px){.td-hotspot{display:none}}
 @media(prefers-reduced-motion:reduce){.td-spark{display:none}}
 `;document.head.append(style);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function spark(x,y){if(reduced.matches||hero.querySelectorAll('.td-spark').length>=65)return;const s=document.createElement('i');s.className='td-spark';const size=2+Math.random()*3;Object.assign(s.style,{left:x+'px',top:y+'px',width:size+'px',height:size+'px'});s.style.setProperty('--dx',(Math.random()*60-30)+'px');s.style.setProperty('--dy',(-20-Math.random()*60)+'px');hero.append(s);setTimeout(()=>s.remove(),1450)}
 let last=0;hero.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||performance.now()-last<45)return;last=performance.now();const b=hero.getBoundingClientRect();spark(e.clientX-b.left,e.clientY-b.top)});
 setInterval(()=>{if(document.hidden||reduced.matches)return;const b=hero.getBoundingClientRect();if(b.bottom<0||b.top>innerHeight)return;spark(Math.random()*b.width,Math.random()*b.height)},220);
 const people=[['Fada',60,43,12,34,['Vou criar minha família e fazer nosso nome chegar ao trono.','Minha magia protegerá aqueles que amo.']],['Colosso',71,35,15,60,['Fundarei meu clã e conquistarei o império.','Minha força erguerá as muralhas de uma nova civilização.']],['Elfo',87,39,11,58,['Construirei cidades e reinos que jamais serão esquecidos.','A floresta será testemunha das minhas conquistas.']]];
 for(const [name,x,y,w,h,quotes] of people){const b=document.createElement('button');b.type='button';b.className='td-hotspot';b.setAttribute('aria-label',name+': ouvir personagem');Object.assign(b.style,{left:x+'%',top:y+'%',width:w+'%',height:h+'%'});const s=document.createElement('span');b.append(s);let i=0;const next=()=>{s.textContent=quotes[i++%quotes.length];b.setAttribute('aria-label',name+': '+s.textContent)};next();b.addEventListener('pointerenter',next);b.addEventListener('focus',next);hero.append(b)}
})();
