// Lista única de tipos de informe, compartida entre Sidebar.jsx (arma el
// submenú) y Reportspage.jsx (decide qué contenido renderizar), así ambos
// quedan sincronizados por construcción en vez de mantener dos listas que
// se puedan desincronizar.
// - `kind` le dice a ReportsPage qué tipo de contenido renderizar:
//   "table"               -> tabla simple (sin selección de dispositivo)
//   "aggregate-pie"       -> MiniPieChart agregando todos los clientes/dispositivos filtrados
//   "aggregate-line"      -> MiniLineChart agregando todos los dispositivos filtrados
//   "per-device-line"     -> MiniLineChart, requiere un dispositivo específico seleccionado
//   "per-device-histogram"-> ProgramHistogram, requiere un dispositivo específico seleccionado
// - Se omiten a propósito "Consumo de energía" y "Conductividad": CM2W los
//   muestra, pero el proyecto no tiene ningún dato de sensores de energía
//   ni conductividad en ningún lado del modelo; construir esos informes
//   sería inventar datos sin respaldo real, igual que se evitó el diagrama
//   de tuberías en Datos en Vivo.
import {
  MdViewList, MdLayers, MdOpacity, MdLocalLaundryService, MdWaterDrop,
  MdLocationOn, MdTimeline, MdTrendingUp, MdErrorOutline, MdRemoveCircleOutline,
} from "react-icons/md";

export const REPORT_TYPES = [
  { slug: "detallado", label: "Detallado", icon: MdViewList, kind: "table" },
  { slug: "cantidad-total", label: "Cantidad Total", icon: MdLayers, kind: "table" },
  { slug: "consumo", label: "Consumo", icon: MdOpacity, kind: "aggregate-pie" },
  { slug: "flujo-lavadora", label: "Flujo por Lavadora", icon: MdLocalLaundryService, kind: "per-device-line" },
  { slug: "flujo-bomba", label: "Flujo por Bomba", icon: MdWaterDrop, kind: "per-device-line" },
  { slug: "ubicacion", label: "Ubicación", icon: MdLocationOn, kind: "table" },
  { slug: "histograma", label: "Histograma", icon: MdTimeline, kind: "per-device-histogram" },
  { slug: "seguimiento-errores", label: "Seguimiento de errores", icon: MdTrendingUp, kind: "aggregate-line" },
  { slug: "errores-activos", label: "Errores activos", icon: MdErrorOutline, kind: "table" },
  { slug: "sin-consumo", label: "Sin consumo", icon: MdRemoveCircleOutline, kind: "table" },
];

export const DEFAULT_REPORT_SLUG = "detallado";
