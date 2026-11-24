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
