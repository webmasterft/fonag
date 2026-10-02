/**
 * Service: Anuario Hidroclimático
 * Datos reales del anuario desde SEDC (POST /hydro_annual): tablas, figuras y Excel oficial.
 */

/**
 * Consulta el anuario hidroclimático real de SEDC (mismo endpoint que la web Django).
 * Endpoint: POST /api/sedc/hydro_annual
 * @param {Object} estacion Estación normalizada (id, codigo, tipo)
 * @param {number|string} year
 * @returns {Promise<{ tables: Object<string, Object> } | null>} null si no hay información
 */
export async function fetchAnuarioSedc(estacion, year) {
  const res = await postHydroAnnual([estacion], year, false);
  return res.json();
}

/**
 * Descarga el Excel oficial del anuario generado por SEDC (igual que "Exportar" en Django).
 * @param {Array<Object>} estaciones Una o varias estaciones normalizadas
 * @param {number|string} year
 * @returns {Promise<void>}
 */
export async function downloadAnuarioExcel(estaciones, year) {
  const res = await postHydroAnnual(estaciones, year, true);
  const blob = await res.blob();
  // Django names the file (Anuario_<fecha>.xlsx) in Content-Disposition
  const disposition = res.headers.get('content-disposition') || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = match ? match[1] : `Anuario_${year}.xlsx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * POST /api/sedc/hydro_annual con las filas completas de las estaciones.
 * The Excel export fails (HTTP 500) unless SEDC receives the full /estacion/list/ row.
 */
async function postHydroAnnual(estaciones, year, isExport) {
  const res = await fetch('/api/sedc/hydro_annual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stations: estaciones.map((e) => e.raw || { est_id: e.id, est_codigo: e.codigo, tipo: e.tipo }),
      year: Number(year),
      export: isExport
    })
  });
  if (!res.ok) throw new Error(`Anuario SEDC no disponible (${res.status})`);
  return res;
}
