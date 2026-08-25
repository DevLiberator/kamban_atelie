/* ========================= */
/* DATA STORE (localStorage) */
/* ========================= */

const STORE_KEY = 'atelie_kacia_data';

function loadData() {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    const data = JSON.parse(raw);
    migrateOrders(data);
    return data;
  }
  return {
    orders: [],
    clients: [],
    materials: [],
    agenda: { prazos: [], retiradas: [], compras: [], compromissos: [] },
    despesas: []
  };
}

function migrateOrders(data) {
  if (!data.orders) return;
  const stageMap = {
    ideias: 'orcamento',
    aprovacao: 'orcamento',
    material: 'producao'
  };
  data.orders.forEach(o => {
    if (stageMap[o.stage]) o.stage = stageMap[o.stage];
    if (!Array.isArray(o.provas)) o.provas = [false, false, false];
  });
}

function saveData(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
  if (!isOnline) {
    addToSyncQueue({ type: 'save', key: STORE_KEY });
  }
}

let appData = loadData();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ========================= */
/* ONLINE / OFFLINE          */
/* ========================= */

const SYNC_KEY = 'atelie_kacia_sync_queue';
let isOnline = navigator.onLine;

function getSyncQueue() {
  try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || []; }
  catch { return []; }
}

function addToSyncQueue(action) {
  const queue = getSyncQueue();
  queue.push({ ...action, timestamp: new Date().toISOString() });
  localStorage.setItem(SYNC_KEY, JSON.stringify(queue));
}

function processSyncQueue() {
  const queue = getSyncQueue();
  if (queue.length === 0) return;
  localStorage.removeItem(SYNC_KEY);
  showToast(queue.length + ' ação(ões) sincronizada(s)!');
}

function updateOnlineStatus() {
  isOnline = navigator.onLine;
  const banner = document.getElementById('offlineBanner');
  if (banner) {
    banner.classList.toggle('visible', !isOnline);
  }
  if (isOnline) {
    processSyncQueue();
  }
}

function setupOfflineDetection() {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
}

/* ========================= */
/* NAVIGATION                */
/* ========================= */

const BOTTOM_NAV_MAP = {
  'dashboard': 'dashboard',
  'kanban': 'kanban',
  'encomendas-todas': 'encomendas',
  'encomendas-andamento': 'encomendas',
  'encomendas-entregues': 'encomendas',
  'encomendas-canceladas': 'encomendas',
  'clientes-cadastro': null,
  'clientes-historico': null,
  'clientes-contatos': null,
  'materiais-tecidos': null,
  'materiais-aviamentos': null,
  'materiais-geral': null,
  'materiais-estoque-baixo': null,
  'agenda-prazos': 'agenda',
  'agenda-retiradas': 'agenda',
  'agenda-compras': 'agenda',
  'agenda-compromissos': 'agenda',
  'financeiro-receber': null,
  'financeiro-recebido': null,
  'financeiro-despesas': null,
  'financeiro-lucro': null
};

function toggleMais() {
  const overlay = document.getElementById('maisOverlay');
  if (overlay) overlay.classList.toggle('open');
}

function toggleFabMenu() {
  const menu = document.getElementById('fabMenu');
  if (menu) menu.classList.toggle('open');
}

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.submenu-item').forEach(s => s.classList.remove('active-sub'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));

  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  const subBtn = document.querySelector(`[data-page="${page}"]`);
  if (subBtn) subBtn.classList.add('active-sub');

  document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  const navKey = BOTTOM_NAV_MAP[page];
  if (navKey) {
    const btn = document.querySelector(`.bottom-nav-item[data-nav="${navKey}"]`);
    if (btn) btn.classList.add('active');
  }

  const maisOverlay = document.getElementById('maisOverlay');
  if (maisOverlay) maisOverlay.classList.remove('open');

  const fabMenu = document.getElementById('fabMenu');
  if (fabMenu) fabMenu.classList.remove('open');

  refreshPage(page);
}

function toggleSubmenu(id) {
  const sub = document.getElementById(id);
  if (sub) sub.classList.toggle('open');
}

function refreshPage() {
  renderAll();
}

/* ========================= */
/* MODAL                     */
/* ========================= */

function openModal(id, preset) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    if (id === 'modalNewOrder') clearOrderForm();
    if (id === 'modalNewClient') clearClientForm();
    if (id === 'modalNewMaterial') {
      clearMaterialForm();
      if (preset) {
        document.getElementById('matCategory').value = preset;
        toggleMatColorField();
      }
    }
    if (id === 'modalNewDespesa') clearDespesaForm();
    if (id === 'modalNewAgenda') {
      clearAgendaForm();
      if (preset) appData._agendaType = preset;
    }
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('open');
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  }
});

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/* ========================= */
/* STAGE LABELS              */
/* ========================= */

const STAGE_LABELS = {
  orcamento:   'Orçamento',
  producao:    'Em produção',
  prova:       'Prova',
  acabamento:  'Acabamento',
  pronto:      'Pronto',
  entregue:    'Entregue',
  cancelado:   'Cancelado'
};

function stageLabel(key) {
  return STAGE_LABELS[key] || key;
}

function stageBadge(stage) {
  return `<span class="status status-${stage}">${stageLabel(stage)}</span>`;
}

/* ========================= */
/* ORDERS                    */
/* ========================= */

function saveOrder() {
  const client = document.getElementById('orderClient').value;
  const desc = document.getElementById('orderDesc').value.trim();
  const value = parseFloat(document.getElementById('orderValue').value) || 0;
  const deadline = document.getElementById('orderDeadline').value;
  const notes = document.getElementById('orderNotes').value.trim();

  if (!client || !desc) {
    alert('Preencha cliente e descrição.');
    return;
  }

  appData.orders.push({
    id: genId(),
    clientId: client,
    description: desc,
    value: value,
    deadline: deadline,
    stage: 'orcamento',
    notes: notes,
    provas: [false, false, false],
    createdAt: new Date().toISOString()
  });

  saveData(appData);
  closeModal('modalNewOrder');
  clearOrderForm();
  renderAll();
  showToast('Encomenda salva com sucesso!');
}

function clearOrderForm() {
  document.getElementById('orderClient').value = '';
  document.getElementById('orderDesc').value = '';
  document.getElementById('orderValue').value = '';
  document.getElementById('orderDeadline').value = '';
  document.getElementById('orderNotes').value = '';
}

function moveOrder(id, newStage) {
  const order = appData.orders.find(o => o.id === id);
  if (order) {
    order.stage = newStage;
    if (newStage === 'entregue') {
      order.deliveredAt = new Date().toISOString();
    }
    saveData(appData);
    renderAll();
  }
}

function deleteOrder(id) {
  if (!confirm('Excluir esta encomenda?')) return;
  appData.orders = appData.orders.filter(o => o.id !== id);
  saveData(appData);
  renderAll();
  showToast('Encomenda excluída.');
}

/* ========================= */
/* DRAG & DROP (KANBAN)      */
/* ========================= */

let draggedId = null;

function dragCard(e, id) {
  draggedId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.target.style.opacity = '0.5';
  setTimeout(() => { e.target.style.opacity = '1'; }, 0);
}

function dropCard(e, stage) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (draggedId) {
    moveOrder(draggedId, stage);
    draggedId = null;
  }
}

/* ========================= */
/* CLIENTS                   */
/* ========================= */

function saveClient() {
  const name = document.getElementById('clientName').value.trim();
  const phone = document.getElementById('clientPhone').value.trim();
  const email = document.getElementById('clientEmail').value.trim();
  const notes = document.getElementById('clientNotes').value.trim();

  if (!name) {
    alert('Preencha o nome do cliente.');
    return;
  }

  appData.clients.push({
    id: genId(),
    name: name,
    phone: phone,
    email: email,
    notes: notes,
    createdAt: new Date().toISOString()
  });

  saveData(appData);
  closeModal('modalNewClient');
  clearClientForm();
  renderAll();
  showToast('Cliente salvo com sucesso!');
}

function clearClientForm() {
  document.getElementById('clientName').value = '';
  document.getElementById('clientPhone').value = '';
  document.getElementById('clientEmail').value = '';
  document.getElementById('clientNotes').value = '';
}

function deleteClient(id) {
  if (!confirm('Excluir este cliente?')) return;
  appData.clients = appData.clients.filter(c => c.id !== id);
  saveData(appData);
  renderAll();
  showToast('Cliente excluído.');
}

/* ========================= */
/* MATERIALS                 */
/* ========================= */

function toggleMatColorField() {
  const cat = document.getElementById('matCategory').value;
  const field = document.getElementById('matColorField');
  field.style.display = cat === 'tecido' ? 'flex' : 'none';
}

function saveMaterial() {
  const category = document.getElementById('matCategory').value;
  const name = document.getElementById('matName').value.trim();
  const color = document.getElementById('matColor').value.trim();
  const qty = parseFloat(document.getElementById('matQty').value) || 0;
  const unit = document.getElementById('matUnit').value;
  const price = parseFloat(document.getElementById('matPrice').value) || 0;
  const minStock = parseFloat(document.getElementById('matMinStock').value) || 0;

  if (!name) {
    alert('Preencha o nome do material.');
    return;
  }

  appData.materials.push({
    id: genId(),
    category: category,
    name: name,
    color: category === 'tecido' ? color : '',
    quantity: qty,
    unit: unit,
    price: price,
    minStock: minStock
  });

  saveData(appData);
  closeModal('modalNewMaterial');
  clearMaterialForm();
  renderAll();
  showToast('Material salvo com sucesso!');
}

function clearMaterialForm() {
  document.getElementById('matCategory').value = 'tecido';
  document.getElementById('matName').value = '';
  document.getElementById('matColor').value = '';
  document.getElementById('matQty').value = '';
  document.getElementById('matUnit').value = 'm';
  document.getElementById('matPrice').value = '';
  document.getElementById('matMinStock').value = '';
  toggleMatColorField();
}

function deleteMaterial(id) {
  if (!confirm('Excluir este material?')) return;
  appData.materials = appData.materials.filter(m => m.id !== id);
  saveData(appData);
  renderAll();
  showToast('Material excluído.');
}

/* ========================= */
/* AGENDA                    */
/* ========================= */

function saveAgenda() {
  const type = appData._agendaType || 'prazos';
  const title = document.getElementById('agendaTitle').value.trim();
  const date = document.getElementById('agendaDate').value;
  const notes = document.getElementById('agendaNotes').value.trim();

  if (!title || !date) {
    alert('Preencha título e data.');
    return;
  }

  if (!appData.agenda) appData.agenda = { prazos: [], retiradas: [], compras: [], compromissos: [] };
  if (!appData.agenda[type]) appData.agenda[type] = [];

  appData.agenda[type].push({
    id: genId(),
    title: title,
    date: date,
    notes: notes
  });

  saveData(appData);
  closeModal('modalNewAgenda');
  clearAgendaForm();
  renderAll();
  showToast('Item adicionado à agenda!');
}

function clearAgendaForm() {
  document.getElementById('agendaTitle').value = '';
  document.getElementById('agendaDate').value = '';
  document.getElementById('agendaNotes').value = '';
}

function deleteAgenda(type, id) {
  if (!confirm('Excluir este item?')) return;
  appData.agenda[type] = appData.agenda[type].filter(a => a.id !== id);
  saveData(appData);
  renderAll();
  showToast('Item removido da agenda.');
}

/* ========================= */
/* DESPESAS                  */
/* ========================= */

function saveDespesa() {
  const desc = document.getElementById('despDesc').value.trim();
  const category = document.getElementById('despCategory').value;
  const value = parseFloat(document.getElementById('despValue').value) || 0;
  const date = document.getElementById('despDate').value;

  if (!desc || !value) {
    alert('Preencha descrição e valor.');
    return;
  }

  appData.despesas.push({
    id: genId(),
    description: desc,
    category: category,
    value: value,
    date: date || new Date().toISOString().slice(0, 10)
  });

  saveData(appData);
  closeModal('modalNewDespesa');
  clearDespesaForm();
  renderAll();
  showToast('Despesa registrada!');
}

function clearDespesaForm() {
  document.getElementById('despDesc').value = '';
  document.getElementById('despCategory').value = 'fixa';
  document.getElementById('despValue').value = '';
  document.getElementById('despDate').value = '';
}

function deleteDespesa(id) {
  if (!confirm('Excluir esta despesa?')) return;
  appData.despesas = appData.despesas.filter(d => d.id !== id);
  saveData(appData);
  renderAll();
  showToast('Despesa excluída.');
}

/* ========================= */
/* RENDER FUNCTIONS          */
/* ========================= */

function getClientName(id) {
  const c = appData.clients.find(cl => cl.id === id);
  return c ? c.name : '(cliente removido)';
}

function formatCurrency(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '-';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function renderAll() {
  renderDashboard();
  renderKanban();
  renderOrdersTables();
  renderClients();
  renderContacts();
  renderMaterials();
  renderEstoqueBaixo();
  renderAgenda();
  renderFinanceiro();
  populateClientSelect();
}

/* --- Dashboard --- */

function renderDashboard() {
  const andamento = appData.orders.filter(o => !['entregue', 'cancelado'].includes(o.stage));
  const today = new Date();
  const next7 = new Date(today);
  next7.setDate(next7.getDate() + 7);
  const prazos = appData.orders.filter(o => {
    if (!o.deadline || ['entregue', 'cancelado'].includes(o.stage)) return false;
    const d = new Date(o.deadline);
    return d >= today && d <= next7;
  });
  const receber = appData.orders.filter(o => !['entregue', 'cancelado'].includes(o.stage));
  const estoqueBaixo = appData.materials.filter(m => m.minStock > 0 && m.quantity <= m.minStock);

  document.getElementById('stat-andamento').textContent = andamento.length;
  document.getElementById('stat-prazos').textContent = prazos.length;

  const totalReceber = receber.reduce((s, o) => s + (o.value || 0), 0);
  document.getElementById('stat-receber').textContent = formatCurrency(totalReceber);

  const estoqueEl = document.getElementById('stat-estoqueDash');
  if (estoqueEl) {
    estoqueEl.textContent = estoqueBaixo.length;
    const estoqueCard = estoqueEl.closest('.card');
    if (estoqueCard) {
      estoqueCard.classList.toggle('alert-card', estoqueBaixo.length > 0);
    }
  }

  const andamentoEl = document.getElementById('dashboard-andamento');
  if (andamento.length) {
    andamentoEl.innerHTML = andamento.map(o => `
      <div class="order-card" style="margin-bottom:8px">
        <strong>${o.description}</strong>
        <p>${getClientName(o.clientId)} — ${formatCurrency(o.value)}</p>
        <div class="card-meta">${stageBadge(o.stage)}<span>${o.deadline ? 'Prazo: ' + formatDate(o.deadline) : ''}</span></div>
      </div>
    `).join('');
  } else {
    andamentoEl.innerHTML = '<p class="empty-msg">Nenhuma encomenda em andamento.</p>';
  }

  const prazosEl = document.getElementById('dashboard-prazos');
  if (prazos.length) {
    prazosEl.innerHTML = prazos.map(o => `
      <div class="order-card" style="margin-bottom:8px">
        <strong>${o.description}</strong>
        <p>${getClientName(o.clientId)} — ${formatDate(o.deadline)}</p>
        <div class="card-meta">${stageBadge(o.stage)}</div>
      </div>
    `).join('');
  } else {
    prazosEl.innerHTML = '<p class="empty-msg">Nenhum prazo próximo.</p>';
  }

  const estoqueDashboardEl = document.getElementById('dashboard-estoque');
  if (estoqueDashboardEl) {
    if (estoqueBaixo.length) {
      estoqueDashboardEl.innerHTML = estoqueBaixo.map(m => `
        <div class="order-card" style="margin-bottom:8px; border-left: 3px solid #f5c542;">
          <strong>${m.name}${m.color ? ' (' + m.color + ')' : ''}</strong>
          <p>${m.quantity} ${m.unit} disponível — mínimo: ${m.minStock} ${m.unit}</p>
          <div class="card-meta"><span class="status status-orcamento">${m.category}</span></div>
        </div>
      `).join('');
    } else {
      estoqueDashboardEl.innerHTML = '<p class="empty-msg">Estoque adequado.</p>';
    }
  }
}

/* --- Kanban --- */

function renderKanban() {
  const columns = document.querySelectorAll('.column');
  const today = new Date();
  const warn3 = new Date(today);
  warn3.setDate(warn3.getDate() + 3);

  columns.forEach(col => {
    const stage = col.dataset.stage;
    const cardsContainer = col.querySelector('.column-cards');
    const orders = appData.orders.filter(o => o.stage === stage);
    cardsContainer.innerHTML = orders.map(o => {
      let proveHtml = '';
      if (o.stage === 'prova') {
        const provas = o.provas || [false, false, false];
        proveHtml = '<div class="card-provas">' +
          provas.map((p, i) =>
            '<label class="prova-check" onclick="event.stopPropagation()">' +
            '<input type="checkbox"' + (p ? ' checked' : '') +
            ' onchange="toggleProva(\'' + o.id + '\', ' + i + ')">' +
            '<span>Prova ' + (i + 1) + '</span>' +
            '</label>'
          ).join('') +
          '</div>';
      }

      let advanceHtml = '';
      if (o.stage === 'prova' && allProvesDone(o)) {
        advanceHtml = '<div class="card-actions"><button class="btn-sm" onclick="event.stopPropagation(); advanceOrder(\'' + o.id + '\')">Avançar → Acabamento</button></div>';
      }

      let deadlineHtml = '';
      if (o.deadline) {
        const d = new Date(o.deadline);
        const isUrgent = d <= warn3 && !['entregue', 'cancelado'].includes(o.stage);
        const isPast = d < today && !['entregue', 'cancelado'].includes(o.stage);
        deadlineHtml = `<span style="${isPast ? 'color:#c40000;font-weight:600' : isUrgent ? 'color:#cc6600;font-weight:600' : ''}">${formatDate(o.deadline)}${isPast ? ' ⚠️' : isUrgent ? ' ⏰' : ''}</span>`;
      }

      return `
        <div class="order-card" draggable="true" ondragstart="dragCard(event, '${o.id}')">
          <strong>${o.description}</strong>
          <p>${getClientName(o.clientId)}</p>
          <div class="card-meta">
            <span>${o.value ? formatCurrency(o.value) : ''}</span>
            ${deadlineHtml}
          </div>
          ${proveHtml}
          ${advanceHtml}
        </div>
      `;
    }).join('');
  });
}

/* --- Orders Tables --- */

function renderOrdersTables() {
  renderOrdersTable('ordersBody', appData.orders, true);
  renderOrdersTable('ordersAndamento', appData.orders.filter(o => !['entregue', 'cancelado'].includes(o.stage)), false);
  renderOrdersTable('ordersEntregues', appData.orders.filter(o => o.stage === 'entregue'), false);
  renderOrdersCanceladas();
}

function renderOrdersTable(bodyId, orders, showActions) {
  const tbody = document.getElementById(bodyId);
  if (!tbody) return;
  if (orders.length === 0) {
    tbody.innerHTML = '';
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>${getClientName(o.clientId)}</td>
      <td>${o.description}</td>
      <td>${formatCurrency(o.value)}</td>
      <td>${formatDate(o.deadline)}</td>
      <td>${stageBadge(o.stage)}</td>
      ${showActions ? `<td class="actions">
        ${o.stage !== 'entregue' && o.stage !== 'cancelado' ? `<button class="btn-sm" onclick="advanceOrder('${o.id}')">Avançar</button>` : ''}
        <button class="btn-sm btn-danger-sm" onclick="deleteOrder('${o.id}')">Excluir</button>
      </td>` : ''}
    </tr>
  `).join('');
}

function renderOrdersCanceladas() {
  const tbody = document.getElementById('ordersCanceladas');
  if (!tbody) return;
  const cancelled = appData.orders.filter(o => o.stage === 'cancelado');
  tbody.innerHTML = cancelled.map(o => `
    <tr>
      <td>${getClientName(o.clientId)}</td>
      <td>${o.description}</td>
      <td>${o.notes || '-'}</td>
    </tr>
  `).join('');
}

function advanceOrder(id) {
  const order = appData.orders.find(o => o.id === id);
  if (!order) return;
  const stages = ['orcamento', 'producao', 'prova', 'acabamento', 'pronto', 'entregue'];
  const idx = stages.indexOf(order.stage);
  if (idx < stages.length - 1) {
    order.stage = stages[idx + 1];
    if (order.stage === 'entregue') {
      order.deliveredAt = new Date().toISOString();
    }
    saveData(appData);
    renderAll();
    showToast('Etapa avançada para: ' + stageLabel(order.stage));
  }
}

function allProvesDone(order) {
  return order.provas && order.provas[0] && order.provas[1] && order.provas[2];
}

function toggleProva(orderId, index) {
  const order = appData.orders.find(o => o.id === orderId);
  if (order && order.provas) {
    order.provas[index] = !order.provas[index];
    saveData(appData);
    renderAll();
  }
}

function filterOrders(query) {
  const q = query.toLowerCase();
  const filtered = appData.orders.filter(o => {
    const client = getClientName(o.clientId).toLowerCase();
    return o.description.toLowerCase().includes(q) || client.includes(q);
  });
  renderOrdersTable('ordersBody', filtered, true);
}

function filterClients(query) {
  const q = query.toLowerCase();
  const filtered = appData.clients.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.phone && c.phone.toLowerCase().includes(q)) ||
    (c.email && c.email.toLowerCase().includes(q))
  );
  const tbody = document.getElementById('clientsBody');
  if (!tbody) return;
  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.phone || '-'}</td>
      <td>${c.email || '-'}</td>
      <td class="actions">
        <button class="btn-sm btn-danger-sm" onclick="deleteClient('${c.id}')">Excluir</button>
      </td>
    </tr>
  `).join('');
}

/* --- Clients --- */

function renderClients() {
  const tbody = document.getElementById('clientsBody');
  if (!tbody) return;
  tbody.innerHTML = appData.clients.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.phone || '-'}</td>
      <td>${c.email || '-'}</td>
      <td class="actions">
        <button class="btn-sm btn-danger-sm" onclick="deleteClient('${c.id}')">Excluir</button>
      </td>
    </tr>
  `).join('');

  renderHistory();
}

function renderHistory() {
  const tbody = document.getElementById('historyBody');
  if (!tbody) return;
  const all = [...appData.orders].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  tbody.innerHTML = all.map(o => `
    <tr>
      <td>${getClientName(o.clientId)}</td>
      <td>${o.description}</td>
      <td>${formatCurrency(o.value)}</td>
      <td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
      <td>${stageBadge(o.stage)}</td>
    </tr>
  `).join('');
}

function renderContacts() {
  const grid = document.getElementById('contactsGrid');
  if (!grid) return;
  if (appData.clients.length === 0) {
    grid.innerHTML = '<p class="empty-msg">Nenhum contato cadastrado.</p>';
    return;
  }
  grid.innerHTML = appData.clients.map(c => `
    <div class="contact-card">
      <h4>${c.name}</h4>
      <p>${c.phone ? '📞 ' + c.phone : ''}</p>
      <p>${c.email ? '✉️ ' + c.email : ''}</p>
      ${c.notes ? '<p>' + c.notes + '</p>' : ''}
    </div>
  `).join('');
}

function populateClientSelect() {
  const sel = document.getElementById('orderClient');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Selecione...</option>' +
    appData.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  if (current) sel.value = current;
}

/* --- Materials --- */

function renderMaterials() {
  renderMaterialTable('tecidosBody', appData.materials.filter(m => m.category === 'tecido'), true);
  renderMaterialTable('aviamentosBody', appData.materials.filter(m => m.category === 'aviamento'), true);
  renderMaterialTable('materiaisBody', appData.materials.filter(m => m.category === 'material'), true);
}

function renderMaterialTable(bodyId, items, showActions) {
  const tbody = document.getElementById(bodyId);
  if (!tbody) return;
  tbody.innerHTML = items.map(m => `
    <tr>
      <td>${m.name}${m.color ? ' (' + m.color + ')' : ''}</td>
      <td>${m.quantity}</td>
      <td>${m.unit}</td>
      <td>${formatCurrency(m.price)}</td>
      ${showActions ? `<td class="actions">
        <button class="btn-sm btn-danger-sm" onclick="deleteMaterial('${m.id}')">Excluir</button>
      </td>` : ''}
    </tr>
  `).join('');
}

function renderEstoqueBaixo() {
  const low = appData.materials.filter(m => m.minStock > 0 && m.quantity <= m.minStock);
  document.getElementById('stat-estoqueBaixo').textContent = low.length;

  const tbody = document.getElementById('estoqueBaixoBody');
  if (!tbody) return;
  tbody.innerHTML = low.map(m => `
    <tr>
      <td>${m.name}${m.color ? ' (' + m.color + ')' : ''}</td>
      <td>${m.category}</td>
      <td>${m.quantity} ${m.unit}</td>
      <td>${m.minStock} ${m.unit}</td>
      <td><button class="btn-sm" onclick="navigateTo('materiais-${m.category === 'tecido' ? 'tecidos' : m.category === 'aviamento' ? 'aviamentos' : 'geral'}')">Ver</button></td>
    </tr>
  `).join('');
}

/* --- Agenda --- */

function renderAgenda() {
  if (!appData.agenda) appData.agenda = { prazos: [], retiradas: [], compras: [], compromissos: [] };

  renderAgendaList('prazosList', 'prazos', appData.agenda.prazos || []);
  renderAgendaList('retiradasList', 'retiradas', appData.agenda.retiradas || []);
  renderAgendaList('comprasList', 'compras', appData.agenda.compras || []);
  renderAgendaList('compromissosList', 'compromissos', appData.agenda.compromissos || []);
}

function renderAgendaList(containerId, type, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhum item na agenda.</p>';
    return;
  }

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  container.innerHTML = sorted.map(item => {
    const [y, m, d] = item.date.split('-');
    return `
      <div class="calendar-item">
        <div class="calendar-date">
          <div class="day">${parseInt(d)}</div>
          <div class="month">${months[parseInt(m) - 1]}</div>
        </div>
        <div class="calendar-info">
          <h4>${item.title}</h4>
          <p>${item.notes || ''}</p>
        </div>
        <div class="calendar-actions">
          <button class="btn-sm btn-danger-sm" onclick="deleteAgenda('${type}', '${item.id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join('');
}

/* --- Financeiro --- */

function renderFinanceiro() {
  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  const ordersEmAndamento = appData.orders.filter(o => !['entregue', 'cancelado'].includes(o.stage));
  const totalReceber = ordersEmAndamento.reduce((s, o) => s + (o.value || 0), 0);

  const vencidos = ordersEmAndamento.filter(o => {
    if (!o.deadline) return false;
    return new Date(o.deadline) < today;
  });
  const totalVencidos = vencidos.reduce((s, o) => s + (o.value || 0), 0);

  const entreguesMes = appData.orders.filter(o => {
    if (o.stage !== 'entregue') return false;
    const dateField = o.deliveredAt || o.createdAt;
    if (!dateField) return false;
    const d = new Date(dateField);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const totalRecebidoMes = entreguesMes.reduce((s, o) => s + (o.value || 0), 0);

  const despesasMes = appData.despesas.filter(d => {
    if (!d.date) return false;
    const dt = new Date(d.date);
    return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
  });
  const totalDespesasMes = despesasMes.reduce((s, d) => s + (d.value || 0), 0);

  const lucroMes = totalRecebidoMes - totalDespesasMes;

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('stat-totalReceber', formatCurrency(totalReceber));
  setTxt('stat-vencidos', formatCurrency(totalVencidos));
  setTxt('stat-recebidoMes', formatCurrency(totalRecebidoMes));
  setTxt('stat-despesasMes', formatCurrency(totalDespesasMes));
  setTxt('stat-receitaMes', formatCurrency(totalRecebidoMes));
  setTxt('stat-despesasLucro', formatCurrency(totalDespesasMes));
  setTxt('stat-lucroMes', formatCurrency(lucroMes));

  const lucroEl = document.getElementById('stat-lucroMes');
  if (lucroEl) {
    lucroEl.className = lucroMes >= 0 ? 'text-success' : 'text-danger';
  }

  const receberTbody = document.getElementById('receberBody');
  if (receberTbody) {
    receberTbody.innerHTML = ordersEmAndamento.map(o => `
      <tr>
        <td>${getClientName(o.clientId)}</td>
        <td>${o.description}</td>
        <td>${formatCurrency(o.value)}</td>
        <td>${formatDate(o.deadline)}</td>
        <td><button class="btn-sm" onclick="moveOrder('${o.id}', 'entregue'); renderAll();">Marcar como recebido</button></td>
      </tr>
    `).join('');
  }

  const recebidoTbody = document.getElementById('recebidoBody');
  if (recebidoTbody) {
    recebidoTbody.innerHTML = entreguesMes.map(o => `
      <tr>
        <td>${getClientName(o.clientId)}</td>
        <td>${o.description}</td>
        <td>${formatCurrency(o.value)}</td>
        <td>${o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString('pt-BR') : (o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-BR') : '-')}</td>
      </tr>
    `).join('');
  }

  const despesasTbody = document.getElementById('despesasBody');
  if (despesasTbody) {
    despesasTbody.innerHTML = appData.despesas.map(d => `
      <tr>
        <td>${d.description}</td>
        <td>${d.category}</td>
        <td>${formatCurrency(d.value)}</td>
        <td>${formatDate(d.date)}</td>
        <td class="actions">
          <button class="btn-sm btn-danger-sm" onclick="deleteDespesa('${d.id}')">Excluir</button>
        </td>
      </tr>
    `).join('');
  }
}

/* ========================= */
/* INIT                      */
/* ========================= */

setupOfflineDetection();
renderAll();
