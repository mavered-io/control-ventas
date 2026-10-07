// ===================================================
// CONTROL DE VENTAS & LIQUIDACIÓN MÓVIL
// Lógica de Cliente y Comunicación con NestJS API
// ===================================================

const API_BASE = '/api/sales';
const PRODUCTS_API = '/api/products';

// Denominaciones de Efectivo (Billetes y Monedas en México)
const DENOMINACIONES = [
  { key: 'b500', label: '$500', value: 500, type: 'bill' },
  { key: 'b200', label: '$200', value: 200, type: 'bill' },
  { key: 'b100', label: '$100', value: 100, type: 'bill' },
  { key: 'b50',  label: '$50',  value: 50,  type: 'bill' },
  { key: 'b20',  label: '$20',  value: 20,  type: 'bill' },
  { key: 'm10',  label: '$10',  value: 10,  type: 'coin' },
  { key: 'm5',   label: '$5',   value: 5,   type: 'coin' },
  { key: 'm2',   label: '$2',   value: 2,   type: 'coin' },
  { key: 'm1',   label: '$1',   value: 1,   type: 'coin' },
  { key: 'm05',  label: '$0.50',value: 0.5, type: 'coin' },
];

// Función para obtener fecha de mañana
function getTomorrowDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Folio inicial secuencial (inicia en 0001)
const initialFolio = localStorage.getItem('cv_folio_current') || '0001';
const initialDate = getTomorrowDateStr();

// Estado Inicial de la Aplicación (Inicia siempre en CEROS con folio 0001)
let appState = {
  currentRecordId: null,
  folio: initialFolio,
  fecha: initialDate,
  vendedor: 'Ruta 1',
  rutaOUnidad: 'Unidad de Reparto',
  cambioInicial: 0,
  enviados: [
    { id: '1', producto: 'Campechano', cantidad: 0, real: 0, precioUnitario: 160, neto: 0 },
    { id: '2', producto: 'Pollo', cantidad: 0, real: 0, precioUnitario: 160, neto: 0 },
    { id: '3', producto: 'Costilla', cantidad: 0, real: 0, precioUnitario: 160, neto: 0 },
    { id: '4', producto: 'Familiar', cantidad: 0, real: 0, precioUnitario: 270, neto: 0 },
    { id: '5', producto: 'Chamorro', cantidad: 0, real: 0, precioUnitario: 270, neto: 0 },
  ],
  movimientos: [
    { id: 'm1', producto: 'Campechano', entradas: 0, salidas: 0 },
    { id: 'm2', producto: 'Pollo', entradas: 0, salidas: 0 },
    { id: 'm3', producto: 'Costilla', entradas: 0, salidas: 0 },
    { id: 'm4', producto: 'Familiar', entradas: 0, salidas: 0 },
    { id: 'm5', producto: 'Chamorro', entradas: 0, salidas: 0 },
  ],
  vendidos: [
    { id: 'v1', producto: 'Campechano', cantidad: 0, precioUnitario: 160, neto: 0 },
    { id: 'v2', producto: 'Pollo', cantidad: 0, precioUnitario: 160, neto: 0 },
    { id: 'v3', producto: 'Costilla', cantidad: 0, precioUnitario: 160, neto: 0 },
    { id: 'v4', producto: 'Familiar', cantidad: 0, precioUnitario: 270, neto: 0 },
    { id: 'v5', producto: 'Chamorro', cantidad: 0, precioUnitario: 270, neto: 0 },
  ],
  otrosPreciosVenta: 0,
  devoluciones: [
    { id: 'd1', producto: 'Campechano', devueltoReal: 0, esperado: 0, diferencia: 0 },
    { id: 'd2', producto: 'Pollo', devueltoReal: 0, esperado: 0, diferencia: 0 },
    { id: 'd3', producto: 'Costilla', devueltoReal: 0, esperado: 0, diferencia: 0 },
    { id: 'd4', producto: 'Familiar', devueltoReal: 0, esperado: 0, diferencia: 0 },
    { id: 'd5', producto: 'Chamorro', devueltoReal: 0, esperado: 0, diferencia: 0 },
  ],
  gastos: [],
  billetes: {
    b500: 0,
    b200: 0,
    b100: 0,
    b50: 0,
    b20: 0,
    m10: 0,
    m5: 0,
    m2: 0,
    m1: 0,
    m05: 0,
  },
  ajusteAdicional: 0,
  notas: '',
  resumen: null,
};

// ===================================================
// INICIALIZACIÓN
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupEventListeners();
  renderAll();
  calculateAndRender();
});

// ===================================================
// NAVEGACIÓN ENTRE PESTAÑAS (Bottom Nav)
// ===================================================
function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const targetId = tab.getAttribute('data-tab');
      document.querySelectorAll('.view-panel').forEach((panel) => {
        panel.classList.remove('active');
      });

      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Haptic feedback si está disponible
      if (navigator.vibrate) navigator.vibrate(10);
    });
  });
}

// ===================================================
// EVENT LISTENERS GENERALES
// ===================================================
function setupEventListeners() {
  // Cambio de fecha y vendedor
  const recordDateInput = document.getElementById('recordDate');
  recordDateInput.value = appState.fecha;
  recordDateInput.addEventListener('change', (e) => {
    appState.fecha = e.target.value;
  });

  const recordSellerInput = document.getElementById('recordSeller');
  recordSellerInput.value = appState.vendedor;
  recordSellerInput.addEventListener('input', (e) => {
    appState.vendedor = e.target.value;
  });

  // Cambio Inicial
  const inputCambio = document.getElementById('inputCambioInicial');
  inputCambio.value = appState.cambioInicial;
  inputCambio.addEventListener('input', (e) => {
    appState.cambioInicial = parseFloat(e.target.value) || 0;
    const desk = document.getElementById('deskCambioInicial');
    if (desk && document.activeElement !== desk) desk.value = appState.cambioInicial;
    calculateAndRender();
  });

  // Otros Precios
  const inputOtros = document.getElementById('inputOtrosPrecios');
  inputOtros.value = appState.otrosPreciosVenta;
  inputOtros.addEventListener('input', (e) => {
    appState.otrosPreciosVenta = parseFloat(e.target.value) || 0;
    const desk = document.getElementById('deskOtrosPrecios');
    if (desk && document.activeElement !== desk) desk.value = appState.otrosPreciosVenta;
    calculateAndRender();
  });

  // Notas
  const inputNotas = document.getElementById('inputRecordNotas');
  inputNotas.addEventListener('input', (e) => {
    appState.notas = e.target.value;
  });

  // Folio editable
  const recordFolioInput = document.getElementById('recordFolioInput');
  if (recordFolioInput) {
    recordFolioInput.value = appState.folio;
    recordFolioInput.addEventListener('input', (e) => {
      appState.folio = e.target.value.trim() || '0001';
      localStorage.setItem('cv_folio_current', appState.folio);
      const hFolio = document.getElementById('headerFolio');
      if (hFolio) hFolio.textContent = `Folio: ${appState.folio}`;
    });
  }

  // Botón Nueva Hoja en Cabecera
  const btnHeaderReset = document.getElementById('btnHeaderReset');
  if (btnHeaderReset) {
    btnHeaderReset.addEventListener('click', resetAllForm);
  }

  // Botón Agregar Fila Enviado
  document.getElementById('btnAddEnviadoRow').addEventListener('click', addCustomProductRow);

  // Toggle Salidas/Entradas
  document.getElementById('btnToggleMovimientos').addEventListener('click', () => {
    const cont = document.getElementById('movimientosContainer');
    cont.style.display = cont.style.display === 'none' ? 'block' : 'none';
  });

  // Agregar Gasto
  document.getElementById('btnAgregarGasto').addEventListener('click', handleAddGasto);

  // Limpiar Billetes
  document.getElementById('btnClearBilletes').addEventListener('click', () => {
    Object.keys(appState.billetes).forEach((k) => (appState.billetes[k] = 0));
    renderBilletes();
    calculateAndRender();
    showToast('Conteo de billetes reiniciado a $0');
  });

  // Guardar Corte (Botón en tarjeta y Botón en cabecera desktop)
  document.getElementById('btnSaveRecord').addEventListener('click', saveRecordToBackend);
  document.getElementById('btnHeaderSave')?.addEventListener('click', saveRecordToBackend);

  // Enviar Ticket PDF por WhatsApp
  document.getElementById('btnShareWhatsApp').addEventListener('click', shareTicketViaWhatsApp);

  // Ver e Imprimir Ticket
  document.getElementById('btnPrintTicket').addEventListener('click', openTicketModal);
  document.getElementById('btnCloseTicket').addEventListener('click', closeTicketModal);
  document.getElementById('btnPrintNow').addEventListener('click', printTicket);
  document.getElementById('btnModalSharePdf')?.addEventListener('click', shareTicketViaWhatsApp);
  document.getElementById('btnModalDownloadPdf')?.addEventListener('click', downloadTicketPDF);

  // Historial Modal
  document.getElementById('btnOpenHistory').addEventListener('click', openHistoryModal);
  document.getElementById('btnCloseHistory').addEventListener('click', closeHistoryModal);

  // Limpiar Todo / Nuevo
  document.getElementById('btnResetAll').addEventListener('click', resetAllForm);

  // Tema Dark / Light
  document.getElementById('btnToggleTheme').addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
  });

  // Alternar Modo Escritorio (Hoja Maestra) vs Modo Móvil (Pestañas)
  const btnToggleDashboard = document.getElementById('btnToggleDashboard');
  const savedMode = localStorage.getItem('cv_view_mode') || (window.innerWidth >= 992 ? 'desktop' : 'tabs');
  if (savedMode === 'tabs') {
    document.body.classList.add('tabs-view');
    if (btnToggleDashboard) btnToggleDashboard.textContent = '🖥️ Vista Escritorio';
  } else {
    document.body.classList.remove('tabs-view');
    if (btnToggleDashboard) btnToggleDashboard.textContent = '📱 Vista Pestañas';
  }

  if (btnToggleDashboard) {
    btnToggleDashboard.addEventListener('click', () => {
      const isTabs = document.body.classList.toggle('tabs-view');
      btnToggleDashboard.textContent = isTabs ? '🖥️ Vista Escritorio' : '📱 Vista Pestañas';
      localStorage.setItem('cv_view_mode', isTabs ? 'tabs' : 'desktop');
      showToast(isTabs ? 'Modo Móvil: Vista por pestañas' : 'Modo Escritorio: Hoja Maestra de Cálculo');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- LISTENERS DE LA VISTA ESCRITORIO ---
  const deskCambio = document.getElementById('deskCambioInicial');
  if (deskCambio) {
    deskCambio.value = appState.cambioInicial;
    deskCambio.addEventListener('input', (e) => {
      appState.cambioInicial = parseFloat(e.target.value) || 0;
      const mob = document.getElementById('inputCambioInicial');
      if (mob) mob.value = appState.cambioInicial;
      calculateAndRender();
    });
  }

  const deskOtros = document.getElementById('deskOtrosPrecios');
  if (deskOtros) {
    deskOtros.value = appState.otrosPreciosVenta;
    deskOtros.addEventListener('input', (e) => {
      appState.otrosPreciosVenta = parseFloat(e.target.value) || 0;
      const mob = document.getElementById('inputOtrosPrecios');
      if (mob) mob.value = appState.otrosPreciosVenta;
      calculateAndRender();
    });
  }

  const deskNotas = document.getElementById('deskNotas');
  if (deskNotas) {
    deskNotas.value = appState.notas || '';
    deskNotas.addEventListener('input', (e) => {
      appState.notas = e.target.value;
      const mob = document.getElementById('inputRecordNotas');
      if (mob) mob.value = appState.notas;
    });
  }

  // Botón añadir gasto en escritorio
  const deskBtnAddGasto = document.getElementById('deskBtnAddGasto');
  if (deskBtnAddGasto) {
    deskBtnAddGasto.addEventListener('click', handleAddDesktopGasto);
  }

  // Botón limpiar billetes en escritorio
  const deskBtnClearBilletes = document.getElementById('deskBtnClearBilletes');
  if (deskBtnClearBilletes) {
    deskBtnClearBilletes.addEventListener('click', () => {
      DENOMINACIONES.forEach(d => appState.billetes[d.key] = 0);
      renderBilletes();
      renderDesktopBilletes();
      calculateAndRender();
      showToast('Conteo de billetes reiniciado a 0');
    });
  }

  // Botones de acción en escritorio
  const deskBtnSave = document.getElementById('deskBtnSaveRecord');
  if (deskBtnSave) deskBtnSave.addEventListener('click', saveRecordToBackend);

  const deskBtnWA = document.getElementById('deskBtnShareWhatsApp');
  if (deskBtnWA) deskBtnWA.addEventListener('click', shareTicketViaWhatsApp);

  const deskBtnPrint = document.getElementById('deskBtnPrintTicket');
  if (deskBtnPrint) deskBtnPrint.addEventListener('click', openTicketModal);

  const deskBtnReset = document.getElementById('deskBtnResetAll');
  if (deskBtnReset) deskBtnReset.addEventListener('click', resetAllForm);
}

// ===================================================
// RENDERIZADO DE VISTAS Y COMPONENTES
// ===================================================
function renderAll() {
  const hFolio = document.getElementById('headerFolio');
  if (hFolio) hFolio.textContent = `Folio: ${appState.folio}`;
  const rFolio = document.getElementById('recordFolioInput');
  if (rFolio && document.activeElement !== rFolio) rFolio.value = appState.folio;
  const rDate = document.getElementById('recordDate');
  if (rDate && document.activeElement !== rDate) rDate.value = appState.fecha;
  renderEnviados();
  renderMovimientos();
  renderVendidos();
  renderDevoluciones();
  renderGastos();
  renderBilletes();
  renderDesktopMasterTable();
  renderDesktopGastos();
  renderDesktopBilletes();
}

// --- 1. ENVIADOS ---
function renderEnviados() {
  const container = document.getElementById('enviadosList');
  container.innerHTML = '';

  appState.enviados.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item-row-card';
    card.innerHTML = `
      <div class="item-header-line">
        <span class="item-name">${item.producto}</span>
        <span class="item-unit-price">$${item.precioUnitario.toFixed(2)} c/u</span>
      </div>
      <div class="item-controls-line">
        <div class="stepper-wrap">
          <button class="stepper-btn" onclick="stepEnviado(${index}, -1)">−</button>
          <input type="number" class="stepper-input" value="${item.real}" min="0" onchange="updateEnviadoReal(${index}, this.value)">
          <button class="stepper-btn" onclick="stepEnviado(${index}, 1)">+</button>
        </div>
        <span class="item-neto">$${(item.real * item.precioUnitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

window.stepEnviado = (index, delta) => {
  const current = appState.enviados[index].real;
  const next = Math.max(0, current + delta);
  appState.enviados[index].real = next;
  if (next === 0) {
    const item = appState.enviados[index];
    const k = (item.producto || '').trim().toLowerCase();
    const ven = appState.vendidos.find((v) => (v.producto || '').trim().toLowerCase() === k);
    if (ven) ven.cantidad = 0;
    const dev = appState.devoluciones.find((d) => (d.producto || '').trim().toLowerCase() === k);
    if (dev) dev.devueltoReal = 0;
    const mov = appState.movimientos.find((m) => (m.producto || '').trim().toLowerCase() === k);
    if (mov) { mov.entradas = 0; mov.salidas = 0; }
  }
  syncProductsToAllTables();
  renderEnviados();
  renderVendidos();
  renderDevoluciones();
  renderMovimientos();
  calculateAndRender();
};

window.updateEnviadoReal = (index, val) => {
  const num = parseInt(val);
  const realVal = isNaN(num) || num < 0 ? 0 : num;
  appState.enviados[index].real = realVal;
  if (realVal === 0) {
    const item = appState.enviados[index];
    const k = (item.producto || '').trim().toLowerCase();
    const ven = appState.vendidos.find((v) => (v.producto || '').trim().toLowerCase() === k);
    if (ven) ven.cantidad = 0;
    const dev = appState.devoluciones.find((d) => (d.producto || '').trim().toLowerCase() === k);
    if (dev) dev.devueltoReal = 0;
    const mov = appState.movimientos.find((m) => (m.producto || '').trim().toLowerCase() === k);
    if (mov) { mov.entradas = 0; mov.salidas = 0; }
  }
  syncProductsToAllTables();
  renderEnviados();
  renderVendidos();
  renderDevoluciones();
  renderMovimientos();
  calculateAndRender();
};

// --- 2. MOVIMIENTOS (Salidas / Entradas) ---
function renderMovimientos() {
  const container = document.getElementById('movimientosList');
  container.innerHTML = '';

  appState.movimientos.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item-row-card';
    card.innerHTML = `
      <div class="item-header-line">
        <span class="item-name">${item.producto}</span>
        <small style="color:var(--text-dim)">Entradas (+) / Salidas (-)</small>
      </div>
      <div class="item-controls-line" style="gap:8px;">
        <div style="display:flex;align-items:center;gap:4px;">
          <span style="color:var(--emerald-500);font-weight:700;">+</span>
          <input type="number" class="styled-input" style="width:65px;padding:4px 8px;" value="${item.entradas}" min="0" onchange="updateMovEntrada(${index}, this.value)">
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <span style="color:var(--rose-500);font-weight:700;">-</span>
          <input type="number" class="styled-input" style="width:65px;padding:4px 8px;" value="${item.salidas}" min="0" onchange="updateMovSalida(${index}, this.value)">
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

window.updateMovEntrada = (index, val) => {
  appState.movimientos[index].entradas = Math.max(0, parseInt(val) || 0);
  calculateAndRender();
};

window.updateMovSalida = (index, val) => {
  appState.movimientos[index].salidas = Math.max(0, parseInt(val) || 0);
  calculateAndRender();
};

// --- 3. VENDIDOS ---
function renderVendidos() {
  const container = document.getElementById('vendidosList');
  container.innerHTML = '';

  appState.vendidos.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item-row-card';
    card.innerHTML = `
      <div class="item-header-line">
        <span class="item-name">${item.producto}</span>
        <span class="item-unit-price">$${item.precioUnitario.toFixed(2)} c/u</span>
      </div>
      <div class="item-controls-line">
        <div class="stepper-wrap">
          <button class="stepper-btn" onclick="stepVendido(${index}, -1)">−</button>
          <input type="number" class="stepper-input" value="${item.cantidad}" min="0" onchange="updateVendidoQty(${index}, this.value)">
          <button class="stepper-btn" onclick="stepVendido(${index}, 1)">+</button>
        </div>
        <span class="item-neto">$${(item.cantidad * item.precioUnitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

window.stepVendido = (index, delta) => {
  const current = appState.vendidos[index].cantidad;
  const next = Math.max(0, current + delta);
  appState.vendidos[index].cantidad = next;
  renderVendidos();
  calculateAndRender();
};

window.updateVendidoQty = (index, val) => {
  appState.vendidos[index].cantidad = Math.max(0, parseInt(val) || 0);
  renderVendidos();
  calculateAndRender();
};

// --- 4. DEVOLUCIONES ---
function renderDevoluciones() {
  const container = document.getElementById('devolucionesList');
  container.innerHTML = '';

  appState.devoluciones.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item-row-card';

    let diffTag = '';
    if (item.diferencia === 0) {
      diffTag = `<span class="dev-status-tag ok">✓ Cuadra (${item.devueltoReal})</span>`;
    } else if (item.diferencia < 0) {
      diffTag = `<span class="dev-status-tag missing">⚠ Faltan ${Math.abs(item.diferencia)} pzs</span>`;
    } else {
      diffTag = `<span class="dev-status-tag extra">Sobran +${item.diferencia} pzs</span>`;
    }

    card.innerHTML = `
      <div class="dev-card-row">
        <div class="dev-info">
          <strong class="item-name">${item.producto}</strong>
          <small>Esperado: ${item.esperado} pzs</small>
        </div>
        <div class="stepper-wrap">
          <button class="stepper-btn" onclick="stepDevuelto(${index}, -1)">−</button>
          <input type="number" class="stepper-input" value="${item.devueltoReal}" min="0" onchange="updateDevueltoQty(${index}, this.value)">
          <button class="stepper-btn" onclick="stepDevuelto(${index}, 1)">+</button>
        </div>
        <div>${diffTag}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

window.stepDevuelto = (index, delta) => {
  const current = appState.devoluciones[index].devueltoReal;
  const next = Math.max(0, current + delta);
  appState.devoluciones[index].devueltoReal = next;
  calculateAndRender();
};

window.updateDevueltoQty = (index, val) => {
  appState.devoluciones[index].devueltoReal = Math.max(0, parseInt(val) || 0);
  calculateAndRender();
};

// --- 5. GASTOS ---
function renderGastos() {
  const container = document.getElementById('gastosList');
  container.innerHTML = '';

  if (appState.gastos.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:var(--text-dim);font-size:0.85rem;padding:12px;">No hay gastos registrados hoy.</p>`;
    return;
  }

  appState.gastos.forEach((g, index) => {
    const item = document.createElement('div');
    item.className = 'gasto-item';
    const tagClass = g.tipo === 'transferencia' ? 'transferencia' : 'efectivo';
    const tagLabel = g.tipo === 'transferencia' ? '💳 Transferencia' : '💵 Efectivo';

    item.innerHTML = `
      <div class="gasto-left">
        <span class="gasto-tag ${tagClass}">${tagLabel}</span>
        <div>
          <span class="gasto-title">${g.concepto}</span>
          ${g.notas ? `<small style="display:block;color:var(--text-dim);font-size:0.7rem;">${g.notas}</small>` : ''}
        </div>
      </div>
      <div class="gasto-right">
        <span class="gasto-amount">$${g.monto.toFixed(2)}</span>
        <button class="btn-delete" data-index="${index}" onclick="deleteGasto(${index})" title="Eliminar gasto">🗑️</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function handleAddGasto() {
  const conceptoInput = document.getElementById('newGastoConcepto');
  const montoInput = document.getElementById('newGastoMonto');
  const tipoSelect = document.getElementById('newGastoTipo');

  const concepto = conceptoInput.value.trim();
  const monto = parseFloat(montoInput.value);

  if (!concepto || isNaN(monto) || monto <= 0) {
    showToast('Ingresa un concepto y un monto válido');
    return;
  }

  appState.gastos.push({
    id: `g_${Date.now()}`,
    concepto,
    monto,
    tipo: tipoSelect.value,
  });

  conceptoInput.value = '';
  montoInput.value = '';
  renderGastos();
  renderDesktopGastos();
  calculateAndRender();
  showToast(`Gasto agregado: ${concepto} ($${monto.toFixed(2)})`);
}

window.deleteGasto = (index) => {
  const i = parseInt(index);
  if (!isNaN(i) && i >= 0 && i < appState.gastos.length) {
    const deleted = appState.gastos.splice(i, 1)[0];
    renderGastos();
    renderDesktopGastos();
    calculateAndRender();
    showToast(`Gasto eliminado: ${deleted.concepto}`);
  }
};

window.promptAddTransferencia = () => {
  const montoStr = prompt('Ingresa el monto de la transferencia bancaria ($):');
  if (!montoStr) return;
  const monto = parseFloat(montoStr);
  if (isNaN(monto) || monto <= 0) {
    showToast('Ingresa un monto válido mayor a 0');
    return;
  }
  const concepto = prompt('Referencia / Banco / Cliente (opcional):', 'Transferencia Bancaria') || 'Transferencia Bancaria';
  appState.gastos.push({
    id: `g_${Date.now()}`,
    concepto: concepto.trim(),
    monto,
    tipo: 'transferencia',
  });
  renderGastos();
  renderDesktopGastos();
  calculateAndRender();
  showToast(`✓ Transferencia agregada al arqueo: $${monto.toFixed(2)}`);
};

// --- 6. ARQUEO DE BILLETES ---
function renderBilletes() {
  const grid = document.getElementById('billetesGrid');
  grid.innerHTML = '';

  DENOMINACIONES.forEach((d) => {
    const count = appState.billetes[d.key] || 0;
    const subtotal = count * d.value;

    const row = document.createElement('div');
    row.className = 'billete-card';
    row.innerHTML = `
      <div class="denom-tag ${d.type}">${d.label}</div>
      <div class="quick-stepper">
        <button class="btn-denom-fast" onclick="stepDenom('${d.key}', -1)">-1</button>
        <input type="number" class="denom-count-input" value="${count}" min="0" onchange="updateDenom('${d.key}', this.value)">
        <button class="btn-denom-fast" onclick="stepDenom('${d.key}', 1)">+1</button>
        <button class="btn-denom-fast" onclick="stepDenom('${d.key}', 5)">+5</button>
        <button class="btn-denom-fast" onclick="stepDenom('${d.key}', 10)">+10</button>
      </div>
      <div class="denom-subtotal">$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
    `;
    grid.appendChild(row);
  });
}

window.stepDenom = (key, delta) => {
  const current = appState.billetes[key] || 0;
  appState.billetes[key] = Math.max(0, current + delta);
  renderBilletes();
  renderDesktopBilletes();
  calculateAndRender();
};

window.updateDenom = (key, val) => {
  appState.billetes[key] = Math.max(0, parseInt(val) || 0);
  renderBilletes();
  renderDesktopBilletes();
  calculateAndRender();
};

// --- 7. VISTA ESCRITORIO: TABLA MAESTRA EXCEL ---
function renderDesktopMasterTable() {
  const tbody = document.getElementById('deskMasterTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  appState.enviados.forEach((item, index) => {
    const k = (item.producto || '').trim().toLowerCase();
    const ven = appState.vendidos.find(v => (v.producto || '').trim().toLowerCase() === k);
    const cantVendida = ven ? ven.cantidad : 0;
    const subtotalVendido = cantVendida * item.precioUnitario;

    const mov = appState.movimientos.find(m => (m.producto || '').trim().toLowerCase() === k) || { entradas: 0, salidas: 0 };
    const dev = appState.devoluciones.find(d => (d.producto || '').trim().toLowerCase() === k);

    const totalDisp = Math.max(0, item.real + (mov.entradas || 0) - (mov.salidas || 0));
    const esperadoDev = Math.max(0, totalDisp - cantVendida);
    const devReal = dev ? dev.devueltoReal : esperadoDev;
    const dif = devReal - esperadoDev;

    let auditTag = '<span class="desk-audit-tag ok">✅ Cuadrado</span>';
    if (dif < 0) {
      auditTag = `<span class="desk-audit-tag missing">⚠️ Faltan ${Math.abs(dif)}</span>`;
    } else if (dif > 0) {
      auditTag = `<span class="desk-audit-tag extra">➕ Sobran ${dif}</span>`;
    }

    const tr = document.createElement('tr');
    tr.id = `deskRow_${index}`;
    tr.innerHTML = `
      <td class="cell-prod">
        <span class="prod-dot"></span>
        <span>${item.producto}</span>
      </td>
      <td class="cell-price tac">$${item.precioUnitario.toFixed(2)}</td>
      <td class="tac">
        <input type="number" id="deskEnvReal_${index}" class="desk-table-num" value="${item.real}" min="0" 
          oninput="deskOnInputEnviado(${index}, this.value)"
          onblur="if(this.value==='' || isNaN(this.value)) { this.value = 0; deskOnInputEnviado(${index}, 0); }"
          title="Paquetes despachados reales">
      </td>
      <td class="tac">
        <div class="desk-mov-pair">
          <span class="mov-label in" title="Entradas / Reabastecimiento">+</span>
          <input type="number" id="deskMovIn_${index}" class="desk-mov-input" value="${mov.entradas || 0}" min="0" 
            oninput="deskOnInputMov(${index}, 'entradas', this.value)" 
            onblur="if(this.value==='' || isNaN(this.value)) { this.value = 0; deskOnInputMov(${index}, 'entradas', 0); }"
            title="Entradas (+)">
          <span class="mov-label out" title="Salidas / Mermas / Traspasos">-</span>
          <input type="number" id="deskMovOut_${index}" class="desk-mov-input" value="${mov.salidas || 0}" min="0" 
            oninput="deskOnInputMov(${index}, 'salidas', this.value)" 
            onblur="if(this.value==='' || isNaN(this.value)) { this.value = 0; deskOnInputMov(${index}, 'salidas', 0); }"
            title="Salidas (-)">
        </div>
      </td>
      <td class="tac"><strong id="deskDisp_${index}" class="font-tabular">${totalDisp} pzs</strong></td>
      <td class="tac">
        <input type="number" id="deskVen_${index}" class="desk-table-num highlight-vendido" value="${cantVendida}" min="0" 
          oninput="deskOnInputVendido(${index}, this.value)"
          onblur="if(this.value==='' || isNaN(this.value)) { this.value = 0; deskOnInputVendido(${index}, 0); }"
          title="Paquetes cobrados">
      </td>
      <td class="tar"><strong id="deskNeto_${index}" class="font-tabular highlight-emerald">$${subtotalVendido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></td>
      <td class="tac"><span id="deskEspDev_${index}" class="font-tabular">${esperadoDev} pzs</span></td>
      <td class="tac">
        <input type="number" id="deskDevReal_${index}" class="desk-table-num highlight-devuelto" value="${devReal}" min="0" 
          oninput="deskOnInputDevuelto(${index}, this.value)"
          onblur="if(this.value==='' || isNaN(this.value)) { this.value = 0; deskOnInputDevuelto(${index}, 0); }"
          title="Paquetes devueltos físicos">
      </td>
      <td class="tac" id="deskAuditCell_${index}">${auditTag}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.deskOnInputEnviado = (index, val) => {
  const num = parseInt(val);
  const realVal = isNaN(num) || num < 0 ? 0 : num;
  appState.enviados[index].real = realVal;
  if (realVal === 0) {
    const item = appState.enviados[index];
    const k = (item.producto || '').trim().toLowerCase();
    const ven = appState.vendidos.find((v) => (v.producto || '').trim().toLowerCase() === k);
    if (ven) ven.cantidad = 0;
    const dev = appState.devoluciones.find((d) => (d.producto || '').trim().toLowerCase() === k);
    if (dev) dev.devueltoReal = 0;
    const mov = appState.movimientos.find((m) => (m.producto || '').trim().toLowerCase() === k);
    if (mov) { mov.entradas = 0; mov.salidas = 0; }
  }
  renderEnviados();
  renderVendidos();
  renderDevoluciones();
  renderMovimientos();
  calculateAndRender();
};

window.deskOnInputMov = (index, type, val) => {
  const item = appState.enviados[index];
  if (!item) return;
  const k = (item.producto || '').trim().toLowerCase();
  let mov = appState.movimientos.find(m => (m.producto || '').trim().toLowerCase() === k);
  if (!mov) {
    mov = { id: `m_${Date.now()}`, producto: item.producto, entradas: 0, salidas: 0 };
    appState.movimientos.push(mov);
  }
  mov[type] = Math.max(0, parseInt(val) || 0);
  renderMovimientos();
  calculateAndRender();
};

window.deskOnInputVendido = (index, val) => {
  const item = appState.enviados[index];
  if (!item) return;
  const k = (item.producto || '').trim().toLowerCase();
  let ven = appState.vendidos.find(v => (v.producto || '').trim().toLowerCase() === k);
  if (ven) {
    ven.cantidad = Math.max(0, parseInt(val) || 0);
  }
  renderVendidos();
  calculateAndRender();
};

window.deskOnInputDevuelto = (index, val) => {
  const item = appState.enviados[index];
  if (!item) return;
  const k = (item.producto || '').trim().toLowerCase();
  let dev = appState.devoluciones.find(d => (d.producto || '').trim().toLowerCase() === k);
  if (dev) {
    dev.devueltoReal = Math.max(0, parseInt(val) || 0);
  }
  renderDevoluciones();
  calculateAndRender();
};

// --- 8. VISTA ESCRITORIO: GASTOS ---
function renderDesktopGastos() {
  const container = document.getElementById('deskGastosList');
  if (!container) return;
  container.innerHTML = '';

  if (appState.gastos.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:var(--text-dim);font-size:0.8rem;padding:24px;">Sin gastos registrados hoy.</p>`;
    return;
  }

  appState.gastos.forEach((g, index) => {
    const item = document.createElement('div');
    item.className = 'desk-gasto-item';
    const tagClass = g.tipo === 'transferencia' ? 'transferencia' : 'efectivo';
    const tagLabel = g.tipo === 'transferencia' ? '💳 Transf' : '💵 Efec';

    item.innerHTML = `
      <div class="desk-gasto-info">
        <span class="desk-gasto-tag ${tagClass}">${tagLabel}</span>
        <span class="desk-gasto-name">${g.concepto}</span>
      </div>
      <div class="desk-gasto-right">
        <span class="desk-gasto-amount">$${g.monto.toFixed(2)}</span>
        <button class="desk-btn-del" data-index="${index}" onclick="deleteGasto(${index})" title="Eliminar gasto">🗑️</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function handleAddDesktopGasto() {
  const conceptoInput = document.getElementById('deskNewGastoConcepto');
  const montoInput = document.getElementById('deskNewGastoMonto');
  const tipoSelect = document.getElementById('deskNewGastoTipo');

  const concepto = conceptoInput.value.trim();
  const monto = parseFloat(montoInput.value);

  if (!concepto || isNaN(monto) || monto <= 0) {
    showToast('Ingresa concepto y monto válido');
    return;
  }

  appState.gastos.push({
    id: `g_${Date.now()}`,
    concepto,
    monto,
    tipo: tipoSelect.value,
  });

  conceptoInput.value = '';
  montoInput.value = '';
  renderGastos();
  renderDesktopGastos();
  calculateAndRender();
  showToast(`Gasto añadido: ${concepto} ($${monto.toFixed(2)})`);
}

// --- 9. VISTA ESCRITORIO: BILLETES ---
function renderDesktopBilletes() {
  const grid = document.getElementById('deskBilletesList');
  if (!grid) return;
  grid.innerHTML = '';

  DENOMINACIONES.forEach((d) => {
    const count = appState.billetes[d.key] || 0;
    const subtotal = count * d.value;

    const row = document.createElement('div');
    row.className = 'desk-denom-row';
    row.innerHTML = `
      <span class="desk-denom-badge ${d.type}">${d.label}</span>
      <div class="desk-denom-controls">
        <button class="desk-btn-step" onclick="deskStepDenom('${d.key}', -1)">−</button>
        <input type="number" id="deskDenomInput_${d.key}" class="desk-denom-input" value="${count}" min="0" oninput="deskUpdateDenom('${d.key}', this.value)">
        <button class="desk-btn-step" onclick="deskStepDenom('${d.key}', 1)">+</button>
      </div>
      <span class="desk-denom-subtotal" id="deskDenomSub_${d.key}">$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
    `;
    grid.appendChild(row);
  });
}

window.deskStepDenom = (key, delta) => {
  const current = appState.billetes[key] || 0;
  appState.billetes[key] = Math.max(0, current + delta);
  renderBilletes();
  renderDesktopBilletes();
  calculateAndRender();
};

window.deskUpdateDenom = (key, val) => {
  appState.billetes[key] = Math.max(0, parseInt(val) || 0);
  renderBilletes();
  calculateAndRender();
};

// ===================================================
// MOTOR DE CÁLCULO Y SINCRONIZACIÓN MATEMÁTICA
// ===================================================
function calculateAndRender() {
  // 1. Cálculos de Enviado
  let totalEnviadosQty = 0;
  let totalEnviadosNeto = 0;
  appState.enviados.forEach((item) => {
    item.real = Number(item.real) || 0;
    item.precioUnitario = Number(item.precioUnitario) || 0;
    item.neto = Number((item.real * item.precioUnitario).toFixed(2));
    totalEnviadosQty += item.real;
    totalEnviadosNeto += item.neto;
  });

  // 2. Movimientos Map
  const movMap = new Map();
  appState.movimientos.forEach((m) => {
    const k = (m.producto || '').trim().toLowerCase();
    const cur = movMap.get(k) || { entradas: 0, salidas: 0 };
    cur.entradas += Number(m.entradas) || 0;
    cur.salidas += Number(m.salidas) || 0;
    movMap.set(k, cur);
  });

  // 3. Cálculos de Vendido
  let totalVendidosQty = 0;
  let totalVendidoNeto = 0;
  appState.vendidos.forEach((item) => {
    item.cantidad = Number(item.cantidad) || 0;
    item.precioUnitario = Number(item.precioUnitario) || 0;
    item.neto = Number((item.cantidad * item.precioUnitario).toFixed(2));
    totalVendidosQty += item.cantidad;
    totalVendidoNeto += item.neto;
  });

  const otrosPrecios = Number(appState.otrosPreciosVenta) || 0;
  const totalVendidoFinal = Number((totalVendidoNeto + otrosPrecios).toFixed(2));

  // 4. Devoluciones esperadas
  let totalDevueltosEsperado = 0;
  let totalDevueltosQty = 0;
  let totalDiferenciaPiezas = 0;

  appState.devoluciones = appState.enviados.map((env) => {
    const k = (env.producto || '').trim().toLowerCase();
    const ven = appState.vendidos.find((v) => (v.producto || '').trim().toLowerCase() === k);
    const cantVendida = ven ? (Number(ven.cantidad) || 0) : 0;
    const mov = movMap.get(k) || { entradas: 0, salidas: 0 };

    const esperado = Math.max(0, env.real + mov.entradas - mov.salidas - cantVendida);
    const existingDev = appState.devoluciones.find((d) => (d.producto || '').trim().toLowerCase() === k);
    const devueltoReal = existingDev ? (Number(existingDev.devueltoReal) || 0) : esperado;
    const diferencia = devueltoReal - esperado;

    totalDevueltosEsperado += esperado;
    totalDevueltosQty += devueltoReal;
    totalDiferenciaPiezas += diferencia;

    return {
      id: env.id,
      producto: env.producto,
      devueltoReal,
      esperado,
      diferencia,
    };
  });

  // 5. Gastos
  let totalGastosEfectivo = 0;
  let totalTransferencias = 0;
  appState.gastos.forEach((g) => {
    const monto = Number(g.monto) || 0;
    if (g.tipo === 'transferencia') {
      totalTransferencias += monto;
    } else {
      totalGastosEfectivo += monto;
    }
  });
  totalGastosEfectivo = Number(totalGastosEfectivo.toFixed(2));
  totalTransferencias = Number(totalTransferencias.toFixed(2));
  const totalGastosGeneral = Number((totalGastosEfectivo + totalTransferencias).toFixed(2));

  // 6. Arqueo Efectivo Físico
  let totalEfectivoFisico = 0;
  DENOMINACIONES.forEach((d) => {
    const count = Number(appState.billetes[d.key]) || 0;
    totalEfectivoFisico += count * d.value;
  });
  totalEfectivoFisico = Number(totalEfectivoFisico.toFixed(2));

  // 7. FÓRMULAS EXACTAS DE LA HOJA DE EXCEL
  const cambioInicial = Number(appState.cambioInicial) || 0;
  const ajusteAdicional = Number(appState.ajusteAdicional) || 0;

  // Saldo con Transferencia = Total Vendido - Gastos en Efectivo
  const saldoConTransferencia = Number((totalVendidoFinal - totalGastosEfectivo).toFixed(2));

  // Saldo sin Cambio = Saldo con Transferencia - Total Transferencias
  const saldoSinCambio = Number((saldoConTransferencia - totalTransferencias).toFixed(2));

  // Efectivo Esperado en Caja = Saldo sin Cambio + Fondo de Cambio Inicial (suma numérica estricta)
  const efectivoEsperadoEnCaja = Number((saldoSinCambio + cambioInicial).toFixed(2));

  // Falta / Sobra = Efectivo Contado - Efectivo Esperado
  const faltaSobra = Number((totalEfectivoFisico - efectivoEsperadoEnCaja).toFixed(2));

  // Saldo Final = Saldo sin Cambio (+ ajuste si aplica)
  const saldoFinal = Number((saldoSinCambio + ajusteAdicional).toFixed(2));

  const estaCuadrado = Math.abs(faltaSobra) < 0.01 && totalDiferenciaPiezas === 0;

  // Guardar en Estado Resumen
  appState.resumen = {
    totalPaquetesEnviadosReal: totalEnviadosQty,
    totalValorEnviado: Number(totalEnviadosNeto.toFixed(2)),
    totalPaquetesVendidos: totalVendidosQty,
    totalVendidoNeto: Number(totalVendidoNeto.toFixed(2)),
    otrosPreciosVenta: otrosPrecios,
    totalVendidoFinal,
    totalPaquetesDevueltos: totalDevueltosQty,
    totalPaquetesEsperadosDevueltos: totalDevueltosEsperado,
    diferenciaPaquetesTotal: totalDiferenciaPiezas,
    cambioInicial,
    totalGastosEfectivo,
    totalTransferencias,
    totalGastosGeneral,
    saldoConTransferencia,
    saldoSinCambio,
    efectivoEsperadoEnCaja,
    totalEfectivoFisico,
    faltaSobra,
    ajusteAdicional,
    saldoFinal,
    estaCuadrado,
  };

  // Actualizar UI de Textos e Indicadores
  updateUIDisplays(appState.resumen);
}

function updateUIDisplays(res) {
  const formatMoney = (n) => `$${(Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Header KPIs
  document.getElementById('kpiVendido').textContent = formatMoney(res.totalVendidoFinal);
  document.getElementById('kpiGastos').textContent = formatMoney(res.totalGastosGeneral);
  document.getElementById('kpiEsperado').textContent = formatMoney(res.efectivoEsperadoEnCaja);
  
  const diffFormatted = (res.faltaSobra >= 0 ? '+' : '') + formatMoney(res.faltaSobra);
  const kpiDifElem = document.getElementById('kpiDiferencia');
  kpiDifElem.textContent = diffFormatted;
  if (Math.abs(res.faltaSobra) < 0.01) {
    kpiDifElem.className = 'kpi-value highlight-emerald';
  } else if (res.faltaSobra < 0) {
    kpiDifElem.className = 'kpi-value highlight-rose';
  } else {
    kpiDifElem.className = 'kpi-value highlight-amber';
  }

  // Enviado Resumen
  document.getElementById('totalEnviadosQty').textContent = `${res.totalPaquetesEnviadosReal} pzs`;
  document.getElementById('totalEnviadosNeto').textContent = formatMoney(res.totalValorEnviado);

  // Vendido Resumen
  document.getElementById('badgeTotalVendidosCount').textContent = `${res.totalPaquetesVendidos} pzs`;
  document.getElementById('totalVendidosQty').textContent = `${res.totalPaquetesVendidos} pzs`;
  document.getElementById('totalVendidosNeto').textContent = formatMoney(res.totalVendidoFinal);

  // Devoluciones Resumen
  document.getElementById('totalDevueltosEsperado').textContent = `${res.totalPaquetesEsperadosDevueltos} pzs`;
  document.getElementById('totalDevueltosQty').textContent = `${res.totalPaquetesDevueltos} pzs`;
  
  const devDifElem = document.getElementById('totalDevueltosDif');
  const badgeAudit = document.getElementById('badgeStockAuditStatus');
  if (res.diferenciaPaquetesTotal === 0) {
    devDifElem.textContent = `0 pzs (Cuadrado ✓)`;
    devDifElem.style.color = 'var(--emerald-500)';
    badgeAudit.textContent = 'Stock Cuadrado ✓';
    badgeAudit.className = 'badge-status ok';
  } else if (res.diferenciaPaquetesTotal < 0) {
    devDifElem.textContent = `${res.diferenciaPaquetesTotal} pzs (Faltante ⚠)`;
    devDifElem.style.color = 'var(--rose-500)';
    badgeAudit.textContent = `Faltan ${Math.abs(res.diferenciaPaquetesTotal)} pzs`;
    badgeAudit.className = 'badge-status warning';
  } else {
    devDifElem.textContent = `+${res.diferenciaPaquetesTotal} pzs (Sobrante)`;
    devDifElem.style.color = 'var(--amber-500)';
    badgeAudit.textContent = `Sobran +${res.diferenciaPaquetesTotal} pzs`;
    badgeAudit.className = 'badge-status warning';
  }

  // Gastos Resumen
  document.getElementById('totalGastosEfectivoText').textContent = formatMoney(res.totalGastosEfectivo);
  document.getElementById('totalTransferenciasText').textContent = formatMoney(res.totalTransferencias);
  document.getElementById('totalGastosGeneralText').textContent = formatMoney(res.totalGastosGeneral);

  // Billetes Resumen
  document.getElementById('totalEfectivoFisicoText').textContent = formatMoney(res.totalEfectivoFisico);

  // Liquidación Maestra
  document.getElementById('liqTotalVendido').textContent = formatMoney(res.totalVendidoFinal);
  document.getElementById('liqGastosEfectivo').textContent = `-${formatMoney(res.totalGastosEfectivo)}`;
  document.getElementById('liqSaldoConTransf').textContent = formatMoney(res.saldoConTransferencia);
  document.getElementById('liqTransferencias').textContent = `-${formatMoney(res.totalTransferencias)}`;
  document.getElementById('liqSaldoSinCambio').textContent = formatMoney(res.saldoSinCambio);
  document.getElementById('liqCambioInicial').textContent = `+${formatMoney(res.cambioInicial)}`;
  document.getElementById('liqEsperadoEnCaja').textContent = formatMoney(res.efectivoEsperadoEnCaja);
  document.getElementById('liqEfectivoContado').textContent = formatMoney(res.totalEfectivoFisico);
  document.getElementById('liqFaltaSobra').textContent = diffFormatted;
  document.getElementById('liqSaldoFinal').textContent = formatMoney(res.saldoFinal);

  // Hero Status Card
  const heroCard = document.getElementById('cuadreHero');
  const heroIcon = document.getElementById('heroStatusIcon');
  const heroTag = document.getElementById('heroStatusTag');
  const heroDiff = document.getElementById('heroDiffAmount');
  const heroMsg = document.getElementById('heroStatusMsg');
  const navIndicator = document.getElementById('navCuadreIndicator');
  const liqDiffRow = document.getElementById('liqDiffRow');

  heroDiff.textContent = diffFormatted;

  if (res.estaCuadrado) {
    heroCard.className = 'cuadre-status-hero cuadrado';
    heroIcon.textContent = '🎉';
    heroTag.textContent = '¡CAJA CUADRADA AL 100%!';
    heroMsg.textContent = 'El efectivo físico y los paquetes devueltos coinciden con exactitud.';
    navIndicator.className = 'nav-indicator cuadrado';
    liqDiffRow.className = 'liq-row diff-row cuadrado';
  } else if (res.faltaSobra < 0) {
    heroCard.className = 'cuadre-status-hero falta';
    heroIcon.textContent = '🚨';
    heroTag.textContent = 'FALTANTE DE EFECTIVO EN CAJA';
    heroMsg.textContent = `Faltan ${formatMoney(Math.abs(res.faltaSobra))} respecto al efectivo esperado.`;
    navIndicator.className = 'nav-indicator';
    liqDiffRow.className = 'liq-row diff-row';
  } else {
    heroCard.className = 'cuadre-status-hero sobra';
    heroIcon.textContent = '💰';
    heroTag.textContent = 'SOBRANTE DE EFECTIVO';
    heroMsg.textContent = `Sobran ${formatMoney(res.faltaSobra)} en el conteo de billetes.`;
    navIndicator.className = 'nav-indicator';
    liqDiffRow.className = 'liq-row diff-row';
  }

  // ===================================================
  // ACTUALIZACIÓN DE VALORES EN VISTA ESCRITORIO
  // ===================================================
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // 1. Filas de la Tabla Maestra de Productos
  appState.enviados.forEach((item, index) => {
    const k = (item.producto || '').trim().toLowerCase();
    const ven = appState.vendidos.find(v => (v.producto || '').trim().toLowerCase() === k);
    const cantVendida = ven ? ven.cantidad : 0;
    const subtotalVendido = cantVendida * item.precioUnitario;

    const mov = appState.movimientos.find(m => (m.producto || '').trim().toLowerCase() === k) || { entradas: 0, salidas: 0 };
    const dev = appState.devoluciones.find(d => (d.producto || '').trim().toLowerCase() === k);

    const totalDisp = Math.max(0, item.real + (mov.entradas || 0) - (mov.salidas || 0));
    const esperadoDev = Math.max(0, totalDisp - cantVendida);
    const devReal = dev ? dev.devueltoReal : esperadoDev;
    const dif = devReal - esperadoDev;

    // Actualizar celdas calculadas sin tocar los inputs enfocados
    setEl(`deskDisp_${index}`, `${totalDisp} pzs`);
    setEl(`deskNeto_${index}`, `$${subtotalVendido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
    setEl(`deskEspDev_${index}`, `${esperadoDev} pzs`);

    const auditCell = document.getElementById(`deskAuditCell_${index}`);
    if (auditCell) {
      if (dif === 0) {
        auditCell.innerHTML = '<span class="desk-audit-tag ok">✅ Cuadrado</span>';
      } else if (dif < 0) {
        auditCell.innerHTML = `<span class="desk-audit-tag missing">⚠️ Faltan ${Math.abs(dif)}</span>`;
      } else {
        auditCell.innerHTML = `<span class="desk-audit-tag extra">➕ Sobran ${dif}</span>`;
      }
    }

    // Si los inputs no están activos, sincronizar valores
    const inputEnv = document.getElementById(`deskEnvReal_${index}`);
    if (inputEnv && document.activeElement !== inputEnv) inputEnv.value = item.real;

    const inputVen = document.getElementById(`deskVen_${index}`);
    if (inputVen && document.activeElement !== inputVen) inputVen.value = cantVendida;

    const inputDev = document.getElementById(`deskDevReal_${index}`);
    if (inputDev && document.activeElement !== inputDev) inputDev.value = devReal;
  });

  // 2. Totales de pie de tabla maestra
  setEl('deskTotalEnviadosQty', `${res.totalPaquetesEnviadosReal} pzs`);

  let totalMovsNet = 0;
  appState.movimientos.forEach(m => totalMovsNet += ((m.entradas || 0) - (m.salidas || 0)));
  setEl('deskTotalMovimientos', `${totalMovsNet >= 0 ? '+' : ''}${totalMovsNet} pzs`);
  setEl('deskTotalDisponibles', `${Math.max(0, res.totalPaquetesEnviadosReal + totalMovsNet)} pzs`);
  setEl('deskTotalVendidosQty', `${res.totalPaquetesVendidos} pzs`);
  setEl('deskTotalVendidosNeto', formatMoney(res.totalVendidoFinal));
  setEl('deskTotalDevueltosEsperado', `${res.totalPaquetesEsperadosDevueltos} pzs`);
  setEl('deskTotalDevueltosReal', `${res.totalPaquetesDevueltos} pzs`);

  const dAuditBadge = document.getElementById('deskStockAuditBadge');
  if (dAuditBadge) {
    if (res.diferenciaPaquetesTotal === 0) {
      dAuditBadge.className = 'desk-audit-tag ok';
      dAuditBadge.textContent = '✅ Cuadrado (0 pzs)';
    } else if (res.diferenciaPaquetesTotal < 0) {
      dAuditBadge.className = 'desk-audit-tag missing';
      dAuditBadge.textContent = `⚠️ Faltan ${Math.abs(res.diferenciaPaquetesTotal)} pzs`;
    } else {
      dAuditBadge.className = 'desk-audit-tag extra';
      dAuditBadge.textContent = `➕ Sobran ${res.diferenciaPaquetesTotal} pzs`;
    }
  }

  // 3. Columna 1: Gastos
  setEl('deskTotalGastosEfectivo', formatMoney(res.totalGastosEfectivo));
  setEl('deskTotalTransferencias', formatMoney(res.totalTransferencias));
  setEl('deskTotalGastosGeneral', formatMoney(res.totalGastosGeneral));

  // 4. Columna 2: Arqueo de Efectivo & Transferencias
  setEl('deskTotalEfectivoFisico', formatMoney(res.totalEfectivoFisico));

  const transfList = appState.gastos.filter(g => g.tipo === 'transferencia');
  const countLabel = `${transfList.length} ${transfList.length === 1 ? 'comprobante' : 'comprobantes'}`;
  const totalArqueadoGlobal = res.totalEfectivoFisico + res.totalTransferencias;

  setEl('deskArqueoTransfDisplay', formatMoney(res.totalTransferencias));
  setEl('deskTransfCountTag', countLabel);
  setEl('deskTotalTransfArqueo', formatMoney(res.totalTransferencias));
  setEl('deskTotalArqueoGlobal', formatMoney(totalArqueadoGlobal));

  setEl('mobArqueoTransfDisplay', formatMoney(res.totalTransferencias));
  setEl('mobTransfCountTag', countLabel);
  setEl('mobTotalTransfArqueo', formatMoney(res.totalTransferencias));
  setEl('mobTotalArqueoGlobal', formatMoney(totalArqueadoGlobal));

  // Actualizar subtotales individuales de billetes en escritorio
  DENOMINACIONES.forEach(d => {
    const c = appState.billetes[d.key] || 0;
    setEl(`deskDenomSub_${d.key}`, `$${(c * d.value).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`);
    const inputD = document.getElementById(`deskDenomInput_${d.key}`);
    if (inputD && document.activeElement !== inputD) inputD.value = c;
  });

  // 5. Columna 3: Liquidación Maestra
  setEl('deskLiqTotalVendido', formatMoney(res.totalVendidoFinal));
  setEl('deskLiqGastosEfectivo', `-${formatMoney(res.totalGastosEfectivo)}`);
  setEl('deskLiqSaldoConTransf', formatMoney(res.saldoConTransferencia));
  setEl('deskLiqTransferencias', `-${formatMoney(res.totalTransferencias)}`);
  setEl('deskLiqSaldoSinCambio', formatMoney(res.saldoSinCambio));
  setEl('deskLiqCambioInicial', `+${formatMoney(res.cambioInicial)}`);
  setEl('deskLiqEsperadoEnCaja', formatMoney(res.efectivoEsperadoEnCaja));
  setEl('deskLiqEfectivoContado', formatMoney(res.totalEfectivoFisico));
  setEl('deskLiqFaltaSobra', diffFormatted);
  setEl('deskLiqSaldoFinal', formatMoney(res.saldoFinal));

  const dDiffRow = document.getElementById('deskLiqDiffRow');
  if (dDiffRow) {
    dDiffRow.className = `desk-liq-row diff ${res.estaCuadrado ? 'cuadrado' : ''}`;
  }

  // 6. Hero Status en Escritorio
  const dHero = document.getElementById('deskCuadreHero');
  const dHeroIcon = document.getElementById('deskHeroIcon');
  const dHeroLabel = document.getElementById('deskHeroLabel');
  const dHeroAmount = document.getElementById('deskHeroAmount');
  const dHeroBadge = document.getElementById('deskHeroBadge');

  if (dHero) {
    dHeroAmount.textContent = diffFormatted;
    if (res.estaCuadrado) {
      dHero.className = 'desk-hero-status cuadrado';
      dHeroIcon.textContent = '🎉';
      dHeroLabel.textContent = 'CAJA CUADRADA AL 100%';
      dHeroBadge.className = 'hero-badge ok';
      dHeroBadge.textContent = 'CUADRADO ✓';
    } else if (res.faltaSobra < 0) {
      dHero.className = 'desk-hero-status descuadrado';
      dHeroIcon.textContent = '🚨';
      dHeroLabel.textContent = 'FALTANTE DE EFECTIVO';
      dHeroBadge.className = 'hero-badge error';
      dHeroBadge.textContent = 'FALTA DINERO';
    } else {
      dHero.className = 'desk-hero-status descuadrado';
      dHeroIcon.textContent = '💰';
      dHeroLabel.textContent = 'SOBRANTE DE EFECTIVO';
      dHeroBadge.className = 'hero-badge error';
      dHeroBadge.textContent = 'SOBRA DINERO';
    }
  }

  // Sincronizar inputs de cabecera si no están activos
  const dCambio = document.getElementById('deskCambioInicial');
  if (dCambio && document.activeElement !== dCambio) dCambio.value = appState.cambioInicial;

  const dOtros = document.getElementById('deskOtrosPrecios');
  if (dOtros && document.activeElement !== dOtros) dOtros.value = appState.otrosPreciosVenta;

  const dNotas = document.getElementById('deskNotas');
  if (dNotas && document.activeElement !== dNotas) dNotas.value = appState.notas || '';

  // Re-renderizar devoluciones para actualizar badges de diferencias
  renderDevoluciones();
}

function syncProductsToAllTables() {
  // Asegura que los productos en Enviados estén presentes en Vendidos y Movimientos
  appState.enviados.forEach((env) => {
    if (!appState.vendidos.some((v) => v.producto === env.producto)) {
      appState.vendidos.push({
        id: `v_${Date.now()}_${Math.random()}`,
        producto: env.producto,
        cantidad: 0,
        precioUnitario: env.precioUnitario,
        neto: 0,
      });
    }
    if (!appState.movimientos.some((m) => m.producto === env.producto)) {
      appState.movimientos.push({
        id: `m_${Date.now()}_${Math.random()}`,
        producto: env.producto,
        entradas: 0,
        salidas: 0,
      });
    }
  });
  renderVendidos();
  renderMovimientos();
}

// ===================================================
// ACCIONES Y LLAMADAS API (NestJS Backend)
// ===================================================

// Cargar Ejemplo del Excel original
async function loadExampleData() {
  try {
    const res = await fetch(`${API_BASE}/sample/image`);
    if (!res.ok) throw new Error('Error al obtener datos');
    const data = await res.json();
    
    appState = {
      ...appState,
      ...data,
      currentRecordId: null,
      folio: `CV-EXCEL-${Date.now().toString().slice(-4)}`,
    };

    document.getElementById('inputCambioInicial').value = appState.cambioInicial;
    document.getElementById('inputOtrosPrecios').value = appState.otrosPreciosVenta;
    document.getElementById('inputRecordNotas').value = appState.notas || '';
    document.getElementById('recordSeller').value = appState.vendedor;

    const dCambio = document.getElementById('deskCambioInicial');
    if (dCambio) dCambio.value = appState.cambioInicial;
    const dOtros = document.getElementById('deskOtrosPrecios');
    if (dOtros) dOtros.value = appState.otrosPreciosVenta;
    const dNotas = document.getElementById('deskNotas');
    if (dNotas) dNotas.value = appState.notas || '';

    appState.ajusteAdicional = 0;

    renderAll();
    calculateAndRender();
    showToast('¡Datos del Excel cargados con éxito!');
  } catch (err) {
    console.error(err);
    showToast('No se pudo conectar con el servidor NestJS');
  }
}

// Agregar producto personalizado
function addCustomProductRow() {
  const nombre = prompt('Nombre del nuevo producto (ej: Especial, Costilla BBQ):');
  if (!nombre) return;
  const precio = parseFloat(prompt('Precio Unitario ($):', '160')) || 0;

  const id = `prod_${Date.now()}`;
  appState.enviados.push({
    id,
    producto: nombre,
    cantidad: 0,
    real: 0,
    precioUnitario: precio,
    neto: 0,
  });

  syncProductsToAllTables();
  renderEnviados();
  renderDesktopMasterTable();
  calculateAndRender();
  showToast(`Producto agregado: ${nombre}`);
}

// Guardar Registro en NestJS Backend
async function saveRecordToBackend() {
  try {
    showToast('Guardando corte en el servidor...');
    const payload = {
      ...appState,
      id: appState.currentRecordId || undefined,
    };

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Error al guardar');
    const saved = await res.json();
    appState.currentRecordId = saved.id;
    appState.folio = saved.folio;
    document.getElementById('headerFolio').textContent = `Folio: ${saved.folio}`;

    showToast(`✓ Corte guardado exitosamente: ${saved.folio}`);
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  } catch (err) {
    console.error(err);
    showToast('Error al guardar el corte en el servidor');
  }
}

// ===================================================
// TICKET DIGITAL Y GENERACIÓN DE PDF
// ===================================================

// Generador del HTML del Ticket Clásico / Térmico Real (Simple, sobrio y sin adornos)
function buildTicketHTML(state) {
  const r = state.resumen;
  if (!r) return '';

  const formatMoney = (n) => `$${(Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Filas de productos vendidos
  let rowsVendidos = '';
  state.vendidos.forEach((v) => {
    if (v.cantidad > 0) {
      rowsVendidos += `
        <tr>
          <td>${v.producto}</td>
          <td class="tac">${v.cantidad}</td>
          <td class="tar">${formatMoney(v.precioUnitario)}</td>
          <td class="tar">${formatMoney(v.neto)}</td>
        </tr>`;
    }
  });

  if (state.otrosPreciosVenta > 0) {
    rowsVendidos += `
      <tr>
        <td>Otros Precios / Ajuste</td>
        <td class="tac">-</td>
        <td class="tar">-</td>
        <td class="tar">${formatMoney(state.otrosPreciosVenta)}</td>
      </tr>`;
  }

  if (!rowsVendidos) {
    rowsVendidos = `<tr><td colspan="4" class="tac" style="padding:4px 0;">Sin ventas registradas ($0.00)</td></tr>`;
  }

  // Filas de gastos y transferencias
  let rowsGastos = '';
  state.gastos.forEach((g) => {
    const isTransf = g.tipo === 'transferencia';
    const tag = isTransf ? '[Transf]' : '[Efec]';
    rowsGastos += `
      <tr>
        <td>${tag} ${g.concepto}</td>
        <td class="tar">${formatMoney(g.monto)}</td>
      </tr>`;
  });

  if (!rowsGastos) {
    rowsGastos = `<tr><td colspan="2" class="tac" style="padding:4px 0;">Sin gastos registrados ($0.00)</td></tr>`;
  }

  // Desglose de billetes contados
  const countedDenoms = DENOMINACIONES
    .filter(d => (state.billetes[d.key] || 0) > 0)
    .map(d => `${d.label} × ${state.billetes[d.key]} = ${formatMoney(state.billetes[d.key] * d.value)}`);

  const arqueoText = countedDenoms.length > 0
    ? countedDenoms.join('<br>')
    : 'Sin desglose capturado ($0.00)';

  // Texto simple de estado / diferencia
  let statusText = 'CAJA CUADRADA ($0.00)';
  if (!r.estaCuadrado) {
    if (r.faltaSobra < 0) {
      statusText = `FALTANTE EN CAJA: -${formatMoney(Math.abs(r.faltaSobra))}`;
    } else {
      statusText = `SOBRANTE EN CAJA: +${formatMoney(r.faltaSobra)}`;
    }
  }

  const diffSign = r.faltaSobra >= 0 ? '+' : '';

  return `
    <div class="ticket-real" id="ticketRealPrint">
      <!-- Encabezado simple de ticket real -->
      <div class="ticket-header">
        <div class="ticket-title">CONTROL DE VENTAS</div>
        <div style="font-size: 11px; margin-top: 2px;">Comprobante de Liquidación</div>
        <div class="ticket-divider"></div>
        <div style="text-align: left; font-size: 11px; line-height: 1.4;">
          <div><strong>FOLIO:</strong> #${state.folio}</div>
          <div><strong>FECHA:</strong> ${state.fecha}</div>
          <div><strong>VENDEDOR:</strong> ${state.vendedor || 'Ruta 1'}</div>
          <div><strong>UNIDAD/RUTA:</strong> ${state.rutaOUnidad || 'Reparto'}</div>
        </div>
      </div>

      <!-- Estado de Caja -->
      <div style="text-align: center; font-weight: bold; margin: 4px 0 6px; font-size: 11.5px;">
        * ${statusText} *
      </div>
      <div class="ticket-divider"></div>

      <!-- 1. Resumen de Mercancía -->
      <div style="font-weight: bold; margin: 2px 0 4px; font-size: 11px;">1. RESUMEN DE MERCANCÍA</div>
      <div class="ticket-row">
        <span>Despachado:</span>
        <span>${r.totalPaquetesEnviadosReal} pzs (${formatMoney(r.totalValorEnviado)})</span>
      </div>
      <div class="ticket-row">
        <span>Vendido:</span>
        <span>${r.totalPaquetesVendidos} pzs (${formatMoney(r.totalVendidoFinal)})</span>
      </div>
      <div class="ticket-row">
        <span>Devuelto:</span>
        <span>${r.totalPaquetesDevueltos} pzs (Dif: ${r.diferenciaPaquetesTotal} pzs)</span>
      </div>
      <div class="ticket-divider"></div>

      <!-- 2. Detalle de Ventas -->
      <div style="font-weight: bold; margin: 2px 0 4px; font-size: 11px;">2. DETALLE DE VENTAS</div>
      <table class="ticket-table">
        <thead>
          <tr style="border-bottom: 1px dashed #000;">
            <th>Prod</th>
            <th class="tac">Cant</th>
            <th class="tar">P.U.</th>
            <th class="tar">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rowsVendidos}
        </tbody>
      </table>
      <div class="ticket-row bold" style="border-top: 1px dashed #000; padding-top: 2px;">
        <span>Total Ventas:</span>
        <span>${formatMoney(r.totalVendidoFinal)}</span>
      </div>
      <div class="ticket-divider"></div>

      <!-- 3. Gastos y Deducciones -->
      <div style="font-weight: bold; margin: 2px 0 4px; font-size: 11px;">3. GASTOS Y DEDUCCIONES</div>
      <table class="ticket-table">
        <tbody>
          ${rowsGastos}
        </tbody>
      </table>
      <div class="ticket-row">
        <span>Gastos en Efectivo:</span>
        <span>${formatMoney(r.totalGastosEfectivo)}</span>
      </div>
      <div class="ticket-row">
        <span>Cobros por Transferencia:</span>
        <span>${formatMoney(r.totalTransferencias)}</span>
      </div>
      <div class="ticket-divider"></div>

      <!-- 4. Arqueo de Efectivo Físico -->
      <div style="font-weight: bold; margin: 2px 0 4px; font-size: 11px;">4. ARQUEO DE EFECTIVO FÍSICO</div>
      <div style="font-size: 11px; margin-bottom: 4px; line-height: 1.35;">
        ${arqueoText}
      </div>
      <div class="ticket-divider"></div>

      <!-- 5. Liquidación de Caja -->
      <div style="font-weight: bold; margin: 2px 0 4px; font-size: 11px;">5. LIQUIDACIÓN DE CAJA</div>
      <div class="ticket-row">
        <span>Total Vendido:</span>
        <span>${formatMoney(r.totalVendidoFinal)}</span>
      </div>
      <div class="ticket-row">
        <span>(-) Gastos en Efectivo:</span>
        <span>-${formatMoney(r.totalGastosEfectivo)}</span>
      </div>
      <div class="ticket-row bold">
        <span>(=) Saldo con Transf:</span>
        <span>${formatMoney(r.saldoConTransferencia)}</span>
      </div>
      <div class="ticket-row">
        <span>(-) Transferencias:</span>
        <span>-${formatMoney(r.totalTransferencias)}</span>
      </div>
      <div class="ticket-row bold">
        <span>(=) Saldo sin Cambio:</span>
        <span>${formatMoney(r.saldoSinCambio)}</span>
      </div>
      <div class="ticket-row">
        <span>(+) Fondo de Cambio:</span>
        <span>+${formatMoney(r.cambioInicial)}</span>
      </div>
      <div class="ticket-divider"></div>
      <div class="ticket-row expected">
        <span>(=) EFECTIVO ESPERADO:</span>
        <span>${formatMoney(r.efectivoEsperadoEnCaja)}</span>
      </div>
      <div class="ticket-row expected">
        <span>💵 EFECTIVO CONTADO:</span>
        <span>${formatMoney(r.totalEfectivoFisico)}</span>
      </div>
      <div class="ticket-row bold">
        <span>⚖️ DIFERENCIA EN CAJA:</span>
        <span>${diffSign}${formatMoney(r.faltaSobra)}</span>
      </div>
      <div class="ticket-divider-double"></div>

      <!-- Saldo Final -->
      <div class="ticket-final-total">
        <div style="font-size: 11px; text-transform: uppercase;">SALDO FINAL A ENTREGAR</div>
        <div style="font-size: 18px; margin-top: 2px;">${formatMoney(r.saldoFinal)}</div>
      </div>
      <div class="ticket-divider-double"></div>

      <!-- Notas si existen -->
      ${state.notas ? `
        <div style="font-size: 11px; margin: 4px 0;">
          <strong>Notas:</strong> ${state.notas}
        </div>
        <div class="ticket-divider"></div>
      ` : ''}

      <!-- Firmas -->
      <div class="ticket-signatures">
        <div class="ticket-sig-col">
          <div class="ticket-sig-line"></div>
          <div>Firma Entrega<br>(Vendedor)</div>
        </div>
        <div class="ticket-sig-col">
          <div class="ticket-sig-line"></div>
          <div>Firma Recibe<br>(Supervisor)</div>
        </div>
      </div>

      <!-- Pie de Ticket -->
      <div class="ticket-footer-text">
        Folio #${state.folio} • Generado: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  `;
}

// Texto de Resumen para WhatsApp (Companion message)
function getWhatsAppSummaryText() {
  const r = appState.resumen;
  if (!r) return '';

  const statusText = r.estaCuadrado
    ? '✅ CAJA PERFECTAMENTE CUADRADA'
    : r.faltaSobra < 0
    ? `🚨 FALTANTE EN CAJA: -$${Math.abs(r.faltaSobra).toFixed(2)}`
    : `⚠️ SOBRANTE: +$${r.faltaSobra.toFixed(2)}`;

  let text = `*📊 CORTE Y CONTROL DE VENTAS*\n`;
  text += `*Folio:* #${appState.folio}\n`;
  text += `*Fecha:* ${appState.fecha}\n`;
  text += `*Ruta/Vendedor:* ${appState.vendedor}\n`;
  text += `──────────────────────\n`;
  text += `*📦 DESPACHADO:* ${r.totalPaquetesEnviadosReal} pzs ($${r.totalValorEnviado.toFixed(2)})\n`;
  text += `*🍗 VENDIDO:* ${r.totalPaquetesVendidos} pzs ($${r.totalVendidoFinal.toFixed(2)})\n`;
  text += `*🔄 DEVUELTO:* ${r.totalPaquetesDevueltos} pzs (Dif: ${r.diferenciaPaquetesTotal} pzs)\n`;
  text += `──────────────────────\n`;
  text += `*🧾 GASTOS DEDUCIBLES:* $${r.totalGastosEfectivo.toFixed(2)}\n`;
  if (appState.gastos.length > 0) {
    appState.gastos.forEach((g) => {
      text += `  • ${g.concepto} (${g.tipo}): $${g.monto.toFixed(2)}\n`;
    });
  }
  text += `*💳 TRANSFERENCIAS:* $${r.totalTransferencias.toFixed(2)}\n`;
  text += `*💵 CAMBIO INICIAL:* $${r.cambioInicial.toFixed(2)}\n`;
  text += `──────────────────────\n`;
  text += `*💰 EFECTIVO ESPERADO:* $${r.efectivoEsperadoEnCaja.toFixed(2)}\n`;
  text += `*💵 EFECTIVO CONTADO:* $${r.totalEfectivoFisico.toFixed(2)}\n`;
  text += `*⚖️ DIFERENCIA:* ${r.faltaSobra >= 0 ? '+' : ''}$${r.faltaSobra.toFixed(2)}\n`;
  text += `*${statusText}*\n`;
  text += `──────────────────────\n`;
  text += `*🎯 SALDO FINAL A ENTREGAR:* $${r.saldoFinal.toFixed(2)}\n`;
  if (appState.notas) text += `*Notas:* ${appState.notas}\n`;
  text += `\n📄 *Comprobante en PDF adjunto.*`;

  return text;
}

// Abrir WhatsApp: En PC abre WhatsApp Web directamente en el navegador sin requerir la app de Windows; en móvil abre la app nativa
function openWhatsAppWithText(text) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  let waUrl = '';

  if (isMobile) {
    // Móvil: abre la app de WhatsApp
    waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  } else {
    // Computadora de escritorio: abre directamente WhatsApp Web en el navegador
    // Evita el protocolo whatsapp:// y no pide abrir/instalar la app de escritorio
    waUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

// Compartir Ticket PDF por WhatsApp (o Web Share API en móvil)
async function shareTicketViaWhatsApp() {
  if (!appState.resumen) {
    calculateAndRender();
  }

  showToast('📄 Preparando Ticket PDF...');

  const summaryText = getWhatsAppSummaryText();
  const filename = `Ticket_Corte_${appState.folio}_${appState.fecha}.pdf`;

  // Renderizar a contenedor temporal para exportar PDF idéntico al ticket real
  const tempContainer = document.createElement('div');
  tempContainer.className = 'digital-ticket-pdf-export';
  tempContainer.innerHTML = buildTicketHTML(appState);
  document.body.appendChild(tempContainer);

  const containerHeight = tempContainer.offsetHeight || 650;
  const pdfHeightMm = Math.max(140, Math.ceil((containerHeight / 340) * 88) + 12);

  const opt = {
    margin: [4, 4, 6, 4],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollY: 0,
      windowWidth: 360,
    },
    jsPDF: {
      unit: 'mm',
      format: [88, pdfHeightMm],
      orientation: 'portrait',
    },
  };

  try {
    if (typeof html2pdf !== 'undefined') {
      const pdfBlob = await html2pdf().set(opt).from(tempContainer).output('blob');
      if (tempContainer.parentNode) document.body.removeChild(tempContainer);

      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      // Si el navegador soporta compartir archivos nativamente (móviles Android / iOS)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Ticket Corte Folio ${appState.folio}`,
          text: summaryText,
        });
        showToast('✅ ¡Ticket PDF compartido exitosamente!');
        return;
      }

      // En PC de escritorio (o navegadores sin soporte Web Share de archivos):
      // 1. Descarga el archivo PDF automáticamente
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

      // 2. Abre WhatsApp Web (en PC) o WhatsApp (en móvil) con el texto prellenado
      openWhatsAppWithText(summaryText);

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      showToast(isMobile ? '📄 ¡PDF descargado! Abriendo WhatsApp...' : '📄 ¡PDF descargado! Abriendo WhatsApp Web...');
    } else {
      if (tempContainer.parentNode) document.body.removeChild(tempContainer);
      openWhatsAppWithText(summaryText);
      showToast('📲 Abriendo WhatsApp con el resumen del corte.');
    }
  } catch (err) {
    if (tempContainer.parentNode) document.body.removeChild(tempContainer);
    if (err.name === 'AbortError') return;
    console.error('Error al generar o compartir PDF:', err);

    // Respaldo abriendo WhatsApp
    openWhatsAppWithText(summaryText);
    showToast('📲 Abriendo WhatsApp con resumen.');
  }
}

// Descargar Ticket en PDF
async function downloadTicketPDF() {
  if (!appState.resumen) {
    calculateAndRender();
  }

  showToast('📥 Generando PDF del ticket...');

  const filename = `Ticket_Corte_${appState.folio}_${appState.fecha}.pdf`;
  const tempContainer = document.createElement('div');
  tempContainer.className = 'digital-ticket-pdf-export';
  tempContainer.innerHTML = buildTicketHTML(appState);
  document.body.appendChild(tempContainer);

  const containerHeight = tempContainer.offsetHeight || 650;
  const pdfHeightMm = Math.max(140, Math.ceil((containerHeight / 340) * 88) + 12);

  const opt = {
    margin: [4, 4, 6, 4],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollY: 0,
      windowWidth: 360,
    },
    jsPDF: {
      unit: 'mm',
      format: [88, pdfHeightMm],
      orientation: 'portrait',
    },
  };

  try {
    if (typeof html2pdf !== 'undefined') {
      await html2pdf().set(opt).from(tempContainer).save();
      if (tempContainer.parentNode) document.body.removeChild(tempContainer);
      showToast('✅ ¡Ticket PDF descargado exitosamente!');
    } else {
      if (tempContainer.parentNode) document.body.removeChild(tempContainer);
      window.print();
    }
  } catch (err) {
    if (tempContainer.parentNode) document.body.removeChild(tempContainer);
    console.error('Error al descargar PDF:', err);
    showToast('Error al generar el PDF. Abriendo opción de impresión...');
    window.print();
  }
}

// Imprimir Ticket
function printTicket() {
  window.print();
}

// Modal de Ticket Digital
function openTicketModal() {
  if (!appState.resumen) {
    calculateAndRender();
  }

  const modal = document.getElementById('modalTicket');
  const container = document.getElementById('ticketContent');

  container.innerHTML = buildTicketHTML(appState);
  modal.classList.add('open');
}

function closeTicketModal() {
  document.getElementById('modalTicket').classList.remove('open');
}

// Alias de retrocompatibilidad
const shareViaWhatsApp = shareTicketViaWhatsApp;

// Modal de Historial
async function openHistoryModal() {
  const modal = document.getElementById('modalHistory');
  const container = document.getElementById('historyListContainer');
  modal.classList.add('open');
  container.innerHTML = '<p class="empty-state">Cargando cortes...</p>';

  try {
    const res = await fetch(API_BASE);
    const records = await res.json();

    if (!records || records.length === 0) {
      container.innerHTML = '<p class="empty-state">Aún no hay cortes guardados en el historial.</p>';
      return;
    }

    container.innerHTML = '';
    records.forEach((rec) => {
      const item = document.createElement('div');
      item.className = 'item-row-card';
      item.style.marginBottom = '10px';
      item.style.cursor = 'pointer';

      const diff = rec.resumen.faltaSobra;
      const diffBadge = diff === 0
        ? `<span class="badge-status ok">✓ Cuadrado</span>`
        : `<span class="badge-status warning">${diff < 0 ? '-' : '+'}$${Math.abs(diff).toFixed(2)}</span>`;

      item.innerHTML = `
        <div class="item-header-line">
          <div>
            <strong>${rec.folio}</strong>
            <small style="display:block;color:var(--text-dim)">${rec.fecha} • ${rec.vendedor}</small>
          </div>
          ${diffBadge}
        </div>
        <div class="item-controls-line" style="margin-top:6px;">
          <span style="font-size:0.85rem;color:var(--text-muted)">Vendido: <strong>$${rec.resumen.totalVendidoFinal.toFixed(2)}</strong></span>
          <span style="font-size:0.95rem;font-weight:800;color:var(--orange-primary)">Final: $${rec.resumen.saldoFinal.toFixed(2)}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        appState = {
          ...rec,
          currentRecordId: rec.id,
        };
        document.getElementById('inputCambioInicial').value = appState.cambioInicial;
        document.getElementById('inputOtrosPrecios').value = appState.otrosPreciosVenta;
        document.getElementById('inputRecordNotas').value = appState.notas || '';
        document.getElementById('recordSeller').value = appState.vendedor;
        document.getElementById('recordDate').value = appState.fecha;

        const dCambio = document.getElementById('deskCambioInicial');
        if (dCambio) dCambio.value = appState.cambioInicial;
        const dOtros = document.getElementById('deskOtrosPrecios');
        if (dOtros) dOtros.value = appState.otrosPreciosVenta;
        const dNotas = document.getElementById('deskNotas');
        if (dNotas) dNotas.value = appState.notas || '';

        renderAll();
        calculateAndRender();
        closeHistoryModal();
        showToast(`Corte cargado: ${rec.folio}`);
      });

      container.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="empty-state">Error al cargar historial desde el servidor.</p>';
  }
}

function closeHistoryModal() {
  document.getElementById('modalHistory').classList.remove('open');
}

// Limpiar todo y nuevo corte (Reinicia todo en CEROS con folio formal de 4 dígitos)
function resetAllForm() {
  if (!confirm('¿Deseas iniciar una nueva hoja de ventas en blanco?')) return;

  let nextFolio = '0001';
  const curNum = parseInt(appState.folio, 10);
  if (!isNaN(curNum) && curNum >= 1) {
    nextFolio = String(curNum + 1).padStart(4, '0');
  }
  localStorage.setItem('cv_folio_current', nextFolio);

  appState = {
    currentRecordId: null,
    folio: nextFolio,
    fecha: getTomorrowDateStr(),
    vendedor: 'Ruta 1',
    rutaOUnidad: 'Unidad de Reparto',
    cambioInicial: 0,
    enviados: [
      { id: '1', producto: 'Campechano', cantidad: 0, real: 0, precioUnitario: 160, neto: 0 },
      { id: '2', producto: 'Pollo', cantidad: 0, real: 0, precioUnitario: 160, neto: 0 },
      { id: '3', producto: 'Costilla', cantidad: 0, real: 0, precioUnitario: 160, neto: 0 },
      { id: '4', producto: 'Familiar', cantidad: 0, real: 0, precioUnitario: 270, neto: 0 },
      { id: '5', producto: 'Chamorro', cantidad: 0, real: 0, precioUnitario: 270, neto: 0 },
    ],
    movimientos: [
      { id: 'm1', producto: 'Campechano', entradas: 0, salidas: 0 },
      { id: 'm2', producto: 'Pollo', entradas: 0, salidas: 0 },
      { id: 'm3', producto: 'Costilla', entradas: 0, salidas: 0 },
      { id: 'm4', producto: 'Familiar', entradas: 0, salidas: 0 },
      { id: 'm5', producto: 'Chamorro', entradas: 0, salidas: 0 },
    ],
    vendidos: [
      { id: 'v1', producto: 'Campechano', cantidad: 0, precioUnitario: 160, neto: 0 },
      { id: 'v2', producto: 'Pollo', cantidad: 0, precioUnitario: 160, neto: 0 },
      { id: 'v3', producto: 'Costilla', cantidad: 0, precioUnitario: 160, neto: 0 },
      { id: 'v4', producto: 'Familiar', cantidad: 0, precioUnitario: 270, neto: 0 },
      { id: 'v5', producto: 'Chamorro', cantidad: 0, precioUnitario: 270, neto: 0 },
    ],
    otrosPreciosVenta: 0,
    devoluciones: [
      { id: 'd1', producto: 'Campechano', devueltoReal: 0, esperado: 0, diferencia: 0 },
      { id: 'd2', producto: 'Pollo', devueltoReal: 0, esperado: 0, diferencia: 0 },
      { id: 'd3', producto: 'Costilla', devueltoReal: 0, esperado: 0, diferencia: 0 },
      { id: 'd4', producto: 'Familiar', devueltoReal: 0, esperado: 0, diferencia: 0 },
      { id: 'd5', producto: 'Chamorro', devueltoReal: 0, esperado: 0, diferencia: 0 },
    ],
    gastos: [],
    billetes: {
      b500: 0,
      b200: 0,
      b100: 0,
      b50: 0,
      b20: 0,
      m10: 0,
      m5: 0,
      m2: 0,
      m1: 0,
      m05: 0,
    },
    ajusteAdicional: 0,
    notas: '',
    resumen: null,
  };

  document.getElementById('inputCambioInicial').value = 0;
  document.getElementById('inputOtrosPrecios').value = 0;
  document.getElementById('inputRecordNotas').value = '';
  document.getElementById('recordDate').value = appState.fecha;

  const rFolio = document.getElementById('recordFolioInput');
  if (rFolio) rFolio.value = appState.folio;

  const dCambio = document.getElementById('deskCambioInicial');
  if (dCambio) dCambio.value = 0;
  const dOtros = document.getElementById('deskOtrosPrecios');
  if (dOtros) dOtros.value = 0;
  const dNotas = document.getElementById('deskNotas');
  if (dNotas) dNotas.value = '';

  renderAll();
  calculateAndRender();
  showToast(`Nueva hoja lista • Folio ${appState.folio} (Todo en ceros)`);
}

// Toast Notification
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}
