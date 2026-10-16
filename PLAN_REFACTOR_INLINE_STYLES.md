# Plan de Refactorización: Eliminación de Estilos Inline

## 1. Objetivo
Migrar todos los estilos inline (`style="..."`) hardcodeados en plantillas JavaScript hacia hojas de estilo CSS dedicadas bajo la metodología del proyecto (BEM / Atomic CSS), preservando el 100% de la fidelidad visual, la funcionalidad existente y documentando evidencia gráfica antes y después de cada cambio.

---

## 2. Regla de Excepción Técnica Fuerte
Solo se mantendrán atributos `style` cuando el valor sea estrictamente dinámico y dependa de datos en tiempo de ejecución de la API:
- Colores variables calculados por estación/serie (ej. `background-color: ${dotColor}`).
- Posicionamiento o coordenadas dinámicas absolutas si aplicara.

Todo lo demás (márgenes, paddings, flexbox, fuentes, colores fijos, bordes, fondos fijos) debe vivir en CSS.

---

## 3. Alcance y Diagnóstico de Archivos

| Archivo JS | Ubicación en UI | Archivo CSS Destino |
| :--- | :--- | :--- |
| `src/js/pages/periodo.js` | Modal de series, tabla preview de muestra de datos, mensajes de error/vacío. | `src/css/organisms/periodo-view.css` |
| `src/js/pages/tiempo-real.js` | Modal en vivo, KPIs de último dato/máx/mín, badge de transmisión, tabla en vivo. | `src/css/organisms/tiempo-real.css` (o modular correspondiente) |
| `src/js/pages/estaciones.js` | Tablas de preview y modales de estación. | `src/css/organisms/estaciones.css` |
| `src/js/pages/anuario.js` | Tablas de preview y controles de descarga. | `src/css/organisms/anuario.css` |
| `src/js/molecules/map/leaflet-map.js` | Popups de Leaflet y badges informativos. | `src/css/molecules/map.css` |

---

## 4. Metodología de Validación y Pruebas (Zero Regressions)

### Fase A: Baseline (Estado Actual - ANTES)
1. Abrir navegador en el servidor local (`http://localhost:5173/`).
2. Capturar capturas de pantalla (screenshots) de alta resolución y registrar el estado visual exacto de:
   - Tarjetas y modal de datos en `/consultas/periodo/` (incluyendo la tabla de muestra de datos).
   - Modal y KPIs en `/tiempo-real/`.
   - Popups del mapa de estaciones.
3. Guardar las imágenes como artefactos de referencia `baseline_antes_*.png`.

### Fase B: Ejecución por Bloques Controlados
Para cada módulo (iniciando por `/consultas/periodo/`):
1. **Definir Clases CSS**: Añadir las clases con **exactamente las mismas reglas CSS** que están inline (mismos valores hex, px/rem, box-shadow, display, alignment).
2. **Reemplazo en JS**: Sustituir el atributo `style="..."` por `class="..."`.
3. **Validación Visual (DESPUÉS)**:
   - Tomar capturas de pantalla `despues_*.png` en la misma resolución.
   - Comparar lado a lado para verificar coincidencia píxel a píxel.
4. **Verificación de Compilación**:
   - Ejecutar `npm run build` para garantizar cero advertencias o fallos de empaquetado.

### Fase C: Aprobación por Módulo
- No se avanza al siguiente módulo hasta presentar las pruebas y recibir la aprobación explícita.

---

## 5. Próximo Paso Inmediato
Una vez aprobado este plan:
1. Tomar las capturas baseline del estado actual de `/consultas/periodo/`.
2. Presentar el mapeo de clases CSS propuesto para `periodo.js`.
