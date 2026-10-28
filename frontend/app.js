const API_BASE = "http://127.0.0.1:8000";

const state = {
  portfolioMeta: null,
  history: null,
  summary: null,
  portfolioChart: null,
  assetChart: null,
  pieChart: null
};

function entrarAlSistema() {
  document.getElementById("landing-screen").style.display = "none";
  document.getElementById("dashboard-screen").style.display = "block";
}

function volverAPortada() {
  document.getElementById("dashboard-screen").style.display = "none";
  document.getElementById("landing-screen").style.display = "flex";
}

function cambiarTab(tabKey, element) {
  document.querySelectorAll(".nav-tab").forEach(tab => tab.classList.remove("is-active"));
  document.querySelectorAll(".tab-pane-view").forEach(pane => pane.style.display = "none");

  element.classList.add("is-active");
  document.getElementById(`tab-${tabKey}`).style.display = "block";
}

// FORMATOS
const currencyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const currencyFmtDec = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function formatMoney(val, dec = 0) {
  return dec === 0 ? currencyFmt.format(val) : currencyFmtDec.format(val);
}

function formatPercent(val) {
  const sign = val > 0 ? "+" : val < 0 ? "\u2212" : "";
  return `${sign}${Math.abs(val).toFixed(2)}%`;
}

// COMPOSICIÓN INICIAL DEL PORTAFOLIO (31/07/2026)
const COMPOSICION_INICIAL = [
  { nombre: "GBP/USD (Libras)", tipo: "Divisa", precio: 1.3482, decimales: 4, cantidad: "£111,259.46", inversion: 150000 },
  { nombre: "Oro", tipo: "Commodity", precio: 4042.67, decimales: 2, cantidad: "49.47 oz", inversion: 200000 },
  { nombre: "Plata", tipo: "Commodity", precio: 57.6569, decimales: 4, cantidad: "867.20 oz", inversion: 50000 },
  { nombre: "Adobe", tipo: "Acción", precio: 250.41, decimales: 2, cantidad: "599 acciones", inversion: 150000 },
  { nombre: "Coca-Cola", tipo: "Acción", precio: 87.59, decimales: 2, cantidad: "1,712.52 acciones", inversion: 150000 },
  { nombre: "Nvidia", tipo: "Acción", precio: 200.75, decimales: 2, cantidad: "747.20 acciones", inversion: 150000 },
  { nombre: "Johnson & Johnson", tipo: "Acción", precio: 256.35, decimales: 2, cantidad: "585.14 acciones", inversion: 150000 }
];

// Precio con los decimales exactos del registro (formatMoney solo maneja 0 o 2)
function formatPrecio(val, dec) {
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

const ACTIVOS_4_DECIMALES = ["gbpusd", "plata"];
function decimalesPrecio(id) {
  return ACTIVOS_4_DECIMALES.includes(id) ? 4 : 2;
}

function renderComposicionInicial() {
  const total = COMPOSICION_INICIAL.reduce((acc, a) => acc + a.inversion, 0);

  document.getElementById("initial-composition-body").innerHTML = COMPOSICION_INICIAL.map(a => `
    <tr>
      <td class="col-left fw-bold">${a.nombre}</td>
      <td class="col-left text-secondary">${a.tipo}</td>
      <td class="col-right">${formatPrecio(a.precio, a.decimales)}</td>
      <td class="col-right">${a.cantidad}</td>
      <td class="col-right">${formatMoney(a.inversion)}</td>
      <td class="col-right">${parseFloat(((a.inversion / total) * 100).toFixed(1))}%</td>
    </tr>
  `).join("");

  document.getElementById("initial-composition-foot").innerHTML = `
    <tr>
      <td class="col-left" colspan="4">Total invertido</td>
      <td class="col-right">${formatMoney(total)}</td>
      <td class="col-right">100%</td>
    </tr>
  `;
}

// Enlace desde el Panel Macro hacia la tabla de composición inicial
function irAComposicionInicial() {
  document.getElementById("composicion-inicial").scrollIntoView({ behavior: "smooth" });
}

// GRÁFICO PORTADA
function initLandingPieChart() {
  const ctx = document.getElementById("landing-pie-chart").getContext("2d");
  state.pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Divisas (GBP)", "Metales (Oro/Plata)", "Acciones"],
      datasets: [{
        data: [150000, 250000, 600000],
        backgroundColor: ["#1D4ED8", "#6B7280", "#111827"],
        borderWidth: 2,
        borderColor: "#FFFFFF"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      cutout: "68%"
    }
  });
}

// LLAMADA AL BACKEND FASTAPI
async function cargarDatos() {
  try {
    const [meta, history, summary] = await Promise.all([
      fetch(`${API_BASE}/api/portfolio`).then(r => r.json()),
      fetch(`${API_BASE}/api/history`).then(r => r.json()),
      fetch(`${API_BASE}/api/summary`).then(r => r.json()).catch(() => null)
    ]);

    state.portfolioMeta = meta;
    state.history = history;
    state.summary = summary;

    if (history.semanas && history.semanas.length > 0) {
      renderDashboard();
    }
  } catch (err) {
    console.error("Error al cargar datos de FastAPI:", err);
  }
}

// RENDER GENERAL
function renderDashboard() {
  const semanas = state.history.semanas;
  const n = semanas.length;
  const ultima = semanas[n - 1];
  const penultima = n > 1 ? semanas[n - 2] : null;

  const esCorteFinal = state.portfolioMeta && ultima.fecha === state.portfolioMeta.fecha_final_semestre;
  document.getElementById("badge-corte").textContent =
    `${esCorteFinal ? "Corte final" : "Último cierre"}: ${ultima.fecha}`;

  // Métricas Totales vs $1,000,000
  document.getElementById("hero-value").textContent = formatMoney(ultima.valor_total_portafolio);
  const deltaTotalEl = document.getElementById("hero-delta-total");
  const esPositivoTotal = ultima.ganancia_perdida_usd >= 0;
  deltaTotalEl.className = `delta-chip ${esPositivoTotal ? 'is-positive' : 'is-negative'}`;
  document.getElementById("hero-delta-total-text").textContent =
    `${esPositivoTotal ? '+' : ''}${formatMoney(ultima.ganancia_perdida_usd)} (${formatPercent(ultima.rendimiento_pct)})`;

  // Variación Semanal (Última semana vs Penúltima)
  const diffSemanal = penultima ? (ultima.valor_total_portafolio - penultima.valor_total_portafolio) : 0;
  const pctSemanal = penultima ? ((diffSemanal / penultima.valor_total_portafolio) * 100) : 0;

  document.getElementById("hero-weekly-diff").textContent = formatMoney(diffSemanal);
  const deltaWeekEl = document.getElementById("hero-delta-weekly");
  const esPositivoWeek = diffSemanal >= 0;
  deltaWeekEl.className = `delta-chip ${esPositivoWeek ? 'is-positive' : 'is-negative'}`;
  document.getElementById("hero-delta-weekly-text").textContent =
    `${esPositivoWeek ? '+' : ''}${formatMoney(diffSemanal)} (${formatPercent(pctSemanal)})`;

  // Gráfica General
  const ctx = document.getElementById("history-chart").getContext("2d");
  state.portfolioChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: semanas.map(s => s.fecha),
      datasets: [{
        data: semanas.map(s => s.valor_total_portafolio),
        borderColor: "#1D4ED8",
        backgroundColor: "rgba(29, 78, 216, 0.05)",
        fill: true,
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#F3F4F6" }, ticks: { callback: v => formatMoney(v, 0) } }
      }
    }
  });

  // 4. Tabla de Portafolio
  if (state.summary && state.summary.activos) {
    const tbodyActivos = document.getElementById("assets-table-body");
    tbodyActivos.innerHTML = state.summary.activos.map(a => `
      <tr class="clickable-row" onclick="mostrarDetalleActivo('${a.id}')">
        <td class="col-left fw-bold text-primary">${a.nombre} <small class="text-secondary d-block font-monospace">Ver evolución &rarr;</small></td>
        <td class="col-right">${formatPrecio(a.precio_inicial, decimalesPrecio(a.id))}</td>
        <td class="col-right">${formatPrecio(a.precio_actual, decimalesPrecio(a.id))}</td>
        <td class="col-right">${a.cantidad.toLocaleString()}</td>
        <td class="col-right">${formatMoney(a.valor_actual)}</td>
        <td class="col-right ${a.ganancia_perdida_usd >= 0 ? 'value-positive' : 'value-negative'}">
          ${formatMoney(a.ganancia_perdida_usd)}
        </td>
        <td class="col-right fw-bold ${a.rendimiento_pct >= 0 ? 'value-positive' : 'value-negative'}">
          ${formatPercent(a.rendimiento_pct)}
        </td>
      </tr>
    `).join("");
  }

  // 5. Tabla Histórica con Variación Semanal
  const tbodyHist = document.getElementById("history-table-body");
  tbodyHist.innerHTML = [...semanas].reverse().map((s, idx, arr) => {
    // rendimiento respecto a la semana previa en la serie cronológica
    const indexOriginal = arr.length - 1 - idx;
    const prevSemana = indexOriginal > 0 ? semanas[indexOriginal - 1] : null;
    const diffSemanaFila = prevSemana ? (s.valor_total_portafolio - prevSemana.valor_total_portafolio) : 0;
    const pctSemanaFila = prevSemana ? ((diffSemanaFila / prevSemana.valor_total_portafolio) * 100) : 0;

    return `
      <tr class="clickable-row" onclick="inspeccionarSemana('${s.fecha}')">
        <td class="col-left fw-bold text-primary">${s.fecha}</td>
        <td class="col-right">${formatMoney(s.valor_total_portafolio)}</td>
        <td class="col-right ${s.ganancia_perdida_usd >= 0 ? 'value-positive' : 'value-negative'}">
          ${formatMoney(s.ganancia_perdida_usd)}
        </td>
        <td class="col-right ${diffSemanaFila >= 0 ? 'value-positive' : 'value-negative'}">
          ${formatPercent(pctSemanaFila)}
        </td>
        <td class="col-right fw-bold ${s.rendimiento_pct >= 0 ? 'value-positive' : 'value-negative'}">
          ${formatPercent(s.rendimiento_pct)}
        </td>
        <td class="col-right text-secondary small">Explorar &rarr;</td>
      </tr>
    `;
  }).join("");
}

// DETALLE INDIVIDUAL DE UN ACTIVO
function mostrarDetalleActivo(activoId) {
  const activoMeta = state.portfolioMeta.activos.find(a => a.id === activoId);
  const semanas = state.history.semanas;

  document.getElementById("portfolio-table-container").style.display = "none";
  document.getElementById("asset-detail-view").style.display = "block";

  document.getElementById("detail-asset-name").textContent = activoMeta.nombre;
  document.getElementById("detail-asset-type").textContent = `Tipo: ${activoMeta.tipo.toUpperCase()} • Cantidad fija: ${activoMeta.cantidad.toLocaleString()}`;

  // Filtrar serie de este activo
  const serie = semanas.map(s => {
    const info = s.activos[activoId];
    const valor = info ? info.valor : 0;
    const precio = info ? info.precio : 0;
    const ganancia = valor - activoMeta.inversion_inicial;
    const rend = (ganancia / activoMeta.inversion_inicial) * 100;
    return { fecha: s.fecha, precio, valor, ganancia, rend };
  });

  const ultimoDato = serie[serie.length - 1];
  document.getElementById("detail-asset-value").textContent = formatMoney(ultimoDato.valor);

  // Render gráfica del activo
  const ctx = document.getElementById("asset-history-chart").getContext("2d");
  if (state.assetChart) state.assetChart.destroy();
  state.assetChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: serie.map(d => d.fecha),
      datasets: [{
        label: "Valoración (USD)",
        data: serie.map(d => d.valor),
        borderColor: "#059669",
        backgroundColor: "rgba(5, 150, 105, 0.05)",
        fill: true,
        borderWidth: 2,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#F3F4F6" }, ticks: { callback: v => formatMoney(v, 0) } }
      }
    }
  });

  // Render tabla individual
  const tbody = document.getElementById("asset-history-table-body");
  tbody.innerHTML = [...serie].reverse().map(d => `
    <tr>
      <td class="col-left">${d.fecha}</td>
      <td class="col-right">${formatPrecio(d.precio, decimalesPrecio(activoId))}</td>
      <td class="col-right">${formatMoney(d.valor)}</td>
      <td class="col-right ${d.ganancia >= 0 ? 'value-positive' : 'value-negative'}">${formatMoney(d.ganancia)}</td>
      <td class="col-right fw-bold ${d.rend >= 0 ? 'value-positive' : 'value-negative'}">${formatPercent(d.rend)}</td>
    </tr>
  `).join("");
}

function cerrarDetalleActivo() {
  document.getElementById("asset-detail-view").style.display = "none";
  document.getElementById("portfolio-table-container").style.display = "block";
}

// dETALLES DE UNA FECHA ESPECÍFICA
function inspeccionarSemana(fecha) {
  const semana = state.history.semanas.find(s => s.fecha === fecha);
  if (!semana) return;

  const card = document.getElementById("week-snapshot-card");
  card.style.display = "block";
  document.getElementById("snapshot-title").textContent = `Desglose de Activos al Cierre del ${fecha}`;

  const tbody = document.getElementById("week-snapshot-table-body");
  tbody.innerHTML = state.portfolioMeta.activos.map(activo => {
    const datoSemana = semana.activos[activo.id];
    const precio = datoSemana ? datoSemana.precio : 0;
    const valor = datoSemana ? datoSemana.valor : 0;
    const participacion = ((valor / semana.valor_total_portafolio) * 100);

    return `
      <tr>
        <td class="col-left fw-bold">${activo.nombre}</td>
        <td class="col-right">${formatPrecio(precio, decimalesPrecio(activo.id))}</td>
        <td class="col-right">${activo.cantidad.toLocaleString()}</td>
        <td class="col-right font-monospace fw-semibold">${formatMoney(valor)}</td>
        <td class="col-right">${formatPercent(participacion)}</td>
      </tr>
    `;
  }).join("");

  card.scrollIntoView({ behavior: 'smooth' });
}

function cerrarSnapshotSemana() {
  document.getElementById("week-snapshot-card").style.display = "none";
}

window.addEventListener("DOMContentLoaded", () => {
  renderComposicionInicial();
  initLandingPieChart();
  cargarDatos();
});