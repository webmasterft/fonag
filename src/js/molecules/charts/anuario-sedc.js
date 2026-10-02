/**
 * Molecule: Anuario Hidroclimático (SEDC)
 * Renders the response of POST /hydro_annual exactly as the Django app does:
 * the monthly tables and the Plotly figure(s) sent by the server, shown in separate views.
 */
import { loadPlotly } from '../../atoms/plotly-loader.js';

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const RAD_HOURS = Array.from({ length: 14 }, (_, i) => String(i + 5)); // 5..18 h

let renderedPlots = [];

/** Django sends missing values as the string "nan". */
function formatValue(value) {
  if (value === null || value === undefined || value === 'nan' || value === '') return '-';
  return String(value);
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Column layout per variable, mirroring getColumnsBase / getColumnsWind / getColumnsRadiation
 * from SEDC's hydro_annual.js.
 * @returns {{ headers: Array<Array<{ title: string, colspan?: number, rowspan?: number }>>, fields: string[] }}
 */
function getColumns(variable, block) {
  const { title, subtitle } = block;

  if (variable === 'PRE') {
    return {
      headers: [
        [{ title, colspan: 5 }],
        [{ title: 'MES', rowspan: 3 }, { title: subtitle, colspan: 3 }, { title: 'No. de días<br>con<br>precipitación', rowspan: 3 }],
        [{ title: 'Mensual', rowspan: 2 }, { title: 'Máxima en', colspan: 2 }],
        [{ title: '24 H' }, { title: 'Día' }]
      ],
      fields: ['month_name', 'sum_month', 'valor_value', 'valor_day', 'day_rain']
    };
  }

  if (variable === 'TAI') {
    return {
      headers: [
        [{ title, colspan: 8 }],
        [{ title: 'MES', rowspan: 3 }, { title: subtitle, colspan: 7 }],
        [{ title: 'Absoluta', colspan: 4 }, { title: 'Media', colspan: 3 }],
        ['Max', 'Día', 'Min', 'Día', 'Max', 'Min', 'Mensual'].map((t) => ({ title: t }))
      ],
      fields: ['month_name', 'max_abs_value', 'max_abs_day', 'min_abs_value', 'min_abs_day', 'max_avg', 'min_avg', 'average']
    };
  }

  if (variable === 'HAI') {
    return {
      headers: [
        [{ title, colspan: 6 }],
        [{ title: 'MES', rowspan: 2 }, { title: subtitle, colspan: 5 }],
        ['Max', 'Día', 'Min', 'Día', 'Mensual'].map((t) => ({ title: t }))
      ],
      fields: ['month_name', 'max_abs_value', 'max_abs_day', 'min_abs_value', 'min_abs_day', 'average']
    };
  }

  if (variable === 'VVI') {
    return {
      headers: [
        [{ title, colspan: 22 }],
        [
          { title: 'MES', rowspan: 2 },
          ...WIND_DIRECTIONS.map((d) => ({ title: d, colspan: 2 })),
          { title: 'Calma' }, { title: 'Nº' }, { title: 'Velocidad Mayor', colspan: 2 }, { title: 'Velocidad Media' }
        ],
        [
          ...WIND_DIRECTIONS.flatMap(() => [{ title: 'm/s' }, { title: '%' }]),
          { title: '%' }, { title: 'Obs' }, { title: 'm/s' }, { title: 'DIR' }, { title: 'km/h' }
        ]
      ],
      fields: [
        'month_name',
        ...WIND_DIRECTIONS.flatMap((d) => [`vel_${d}`, `por_${d}`]),
        'calm', 'obs', 'vel_max', 'vel_dir', 'vel_med'
      ]
    };
  }

  return {
    headers: [
      [{ title, colspan: 4 }],
      [{ title: 'MES', rowspan: 2 }, { title: subtitle, colspan: 3 }],
      [{ title: 'Max' }, { title: 'Min' }, { title: 'Media' }]
    ],
    fields: ['month_name', 'max_abs', 'min_abs', 'average']
  };
}

function getRadiationColumns(block, factor) {
  return {
    headers: [
      [{ title: block.title, colspan: 17 }],
      [{ title: block.subtitle, colspan: 17 }],
      [{ title: 'Mes/Hora' }, ...RAD_HOURS.map((h) => ({ title: h })), { title: factor === 'maximum' ? 'Max' : 'Min' }, { title: 'Hora' }]
    ],
    fields: ['month_name', ...RAD_HOURS, 'value', 'hour']
  };
}

function buildTable({ headers, fields }, rows) {
  // Header titles come from SEDC and may contain <br>; everything else is escaped
  const thead = headers.map((row) => `<tr>${row.map((c) => `
    <th${c.colspan ? ` colspan="${c.colspan}"` : ''}${c.rowspan ? ` rowspan="${c.rowspan}"` : ''}>${c.title ?? ''}</th>`).join('')}
  </tr>`).join('');

  const tbody = (rows || []).map((r) => `<tr>${fields.map((f) => `<td>${escapeHtml(formatValue(r[f]))}</td>`).join('')}</tr>`).join('');

  return `<table class="anuario-sedc-table">${thead ? `<thead>${thead}</thead>` : ''}<tbody>${tbody}</tbody></table>`;
}

/**
 * Destroys the Plotly figures created by the last render.
 */
export function destroyAnuarioSedc() {
  if (!renderedPlots.length) return;
  const plots = renderedPlots;
  renderedPlots = [];
  loadPlotly().then((Plotly) => plots.forEach((el) => Plotly.purge(el))).catch(() => {});
}

/**
 * Renders the hydro_annual response into the container.
 * @param {HTMLElement} container
 * @param {{ tables: Object<string, Object> }} data
 * @param {{ view?: 'charts' | 'table' }} [options] 'charts' renders only the figures, 'table' only the tables
 * @returns {Promise<void>} Resolves when every figure has been drawn
 */
export async function renderAnuarioSedc(container, data, { view = 'charts' } = {}) {
  if (!container) return;
  destroyAnuarioSedc();

  const entries = Object.entries(data?.tables || {});
  const html = view === 'table' ? buildTablesView(entries) : buildChartsView(entries);

  if (!html.markup) {
    container.innerHTML = `
      <div class="anuario-sedc-empty">No existe información para el periodo y estación seleccionada.</div>
    `;
    return;
  }

  container.innerHTML = `<div class="anuario-sedc">${html.markup}</div>`;
  if (!html.figures.length) return;

  const Plotly = await loadPlotly();
  await Promise.all(html.figures.map(({ id, figure }) => {
    const el = container.querySelector(`#${CSS.escape(id)}`);
    if (!el) return null;
    renderedPlots.push(el);
    // Django layouts carry a fixed height; let the block size the figure
    const layout = { ...figure.layout, height: undefined, autosize: true };
    return Plotly.newPlot(el, figure.data, layout, { responsive: true, displaylogo: false });
  }));
}

/** "Tabla de datos": only the monthly tables of every variable. */
function buildTablesView(entries) {
  const markup = entries.map(([variable, block]) => {
    if (variable === 'RAD') {
      return ['maximum', 'minimum']
        .filter((factor) => block[factor])
        .map((factor) => `
          <section class="anuario-sedc-table-wrap">${buildTable(getRadiationColumns(block[factor], factor), block[factor].table)}</section>
        `).join('');
    }
    return `<section class="anuario-sedc-table-wrap">${buildTable(getColumns(variable, block), block.table)}</section>`;
  }).join('');

  return { markup, figures: [] };
}

/** "Gráficas estadísticas": only the Plotly figures sent by SEDC (RAD has none). */
function buildChartsView(entries) {
  const figures = []; // [{ id, figure }]

  entries.forEach(([variable, block]) => {
    const graph = block.graph;
    if (!graph) return;
    if (variable === 'VVI') {
      ['speed', 'frequency', 'both']
        .filter((f) => graph[f])
        .forEach((f) => figures.push({ id: `anuario-graph-${variable}-${f}`, figure: graph[f] }));
      return;
    }
    if (graph.data) figures.push({ id: `anuario-graph-${variable}`, figure: graph });
  });

  const markup = figures.length
    ? `<div class="anuario-sedc-graphs">${figures.map(({ id }) => `<div class="anuario-sedc-graph" id="${id}"></div>`).join('')}</div>`
    : '';

  return { markup, figures };
}
