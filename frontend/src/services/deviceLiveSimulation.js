// Simulación de "datos en vivo" de un dispositivo.
// - No hay telemetría real conectada todavía (eso es la Fase 9, Backend),
//   así que estas funciones generan un estado plausible a partir de la
//   configuración REAL que el usuario ya creó para el dispositivo:
//   lavadoras y bombas (desde Calibración Remota) y programas de lavado
//   (desde Programas), en vez de inventar datos completamente desconectados.
// - Se usa tanto para la modal "Datos en Vivo" (ClientsDetail) como para
//   los widgets del "Dashboard del dispositivo" (DashboardStatsPage), para
//   que ambas vistas cuenten una historia consistente.
import { getCalibracionConfig, getProgramsForDevice } from "./localMock";

function parseCapacidadKg(nombre) {
  const match = /([\d.]+)\s*kg/i.exec(nombre || "");
  return match ? parseFloat(match[1]) : 80;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ORIGENES_EVENTO = [
  { label: "Programa acabado", weight: 0.78 },
  { label: "Programa con error", weight: 0.08 },
  { label: "Inicio manual", weight: 0.09 },
  { label: "Programa cancelado", weight: 0.05 },
];

function pickOrigenEvento() {
  const r = Math.random();
  let acc = 0;
  for (const o of ORIGENES_EVENTO) {
    acc += o.weight;
    if (r <= acc) return o.label;
  }
  return ORIGENES_EVENTO[0].label;
}

// Estado simulado de una sola lavadora.
export function simulateLavadoraState(lavadora, programas, bombas, productos) {
  const capacidadKg = lavadora.capacidadKg || parseCapacidadKg(lavadora.nombre);

  // Una lavadora deshabilitada desde Ajustes nunca aparece "corriendo":
  // se distingue de "sin programa asignado por azar" con `disabled: true`
  // para que Datos en Vivo pueda mostrar un estado distinto ("Deshabilitada"
  // en vez de "Not running").
  if (lavadora.habilitada === false) {
    return { lavadoraId: lavadora.id, nombre: lavadora.nombre, running: false, disabled: true, capacidadKg };
  }

  const running = programas.length > 0 && Math.random() < 0.55;

  if (!running) {
    return { lavadoraId: lavadora.id, nombre: lavadora.nombre, running: false, capacidadKg };
  }

  const programa = pick(programas);
  const pasosTotal = programa.pasos?.length > 0 ? programa.pasos.length : Math.floor(Math.random() * 4) + 1;
  const pasoActual = Math.min(pasosTotal, Math.floor(Math.random() * pasosTotal) + 1);
  const totalDurationSeconds = Math.floor(Math.random() * 2700) + 300; // 5–50 min
  const elapsedSeconds = Math.floor(Math.random() * totalDurationSeconds);
  const startTime = new Date(Date.now() - elapsedSeconds * 1000);

  const bombasActivas = bombas.filter((b) => b.activa !== false);
  const bombasEstado = bombasActivas.map((bomba) => {
    const producto = productos.find((p) => p.id === bomba.productoId);
    const totalMl = bomba.objetivoMl || Math.floor(Math.random() * 400) + 100;
    const r = Math.random();
    const estado = r < 0.08 ? "error" : r < 0.55 ? "completado" : "pendiente";
    const doneMl = estado === "completado" ? totalMl : estado === "error" ? Math.floor(totalMl * Math.random()) : 0;
    return {
      bombaId: bomba.id,
      nombre: bomba.nombre,
      productoNombre: producto?.nombre || "Sin producto asociado",
      doneMl,
      totalMl,
      estado, // 'completado' | 'pendiente' | 'error'
    };
  });

  return {
    lavadoraId: lavadora.id,
    nombre: lavadora.nombre,
    running: true,
    capacidadKg,
    programaNombre: programa.nombre,
    programaNumero: programa.numero,
    pasoActual,
    pasosTotal,
    startTime,
    elapsedSeconds,
    totalDurationSeconds,
    bombas: bombasEstado,
  };
}

// Estado simulado de todas las lavadoras configuradas de un dispositivo.
// `productos` son los productos químicos del cliente dueño del dispositivo.
export function simulateDeviceLiveState(deviceId, productos) {
  const config = getCalibracionConfig(deviceId);
  const programas = getProgramsForDevice(deviceId);
  return config.lavadoras.map((lav) => simulateLavadoraState(lav, programas, config.bombas, productos));
}

// Categorías del histograma de programas (Dashboard del dispositivo),
// inspiradas en la leyenda de la referencia visual (Programa / Turn time /
// Program with error / Empty program / Datos en vivo / Other event), con
// colores propios del proyecto en vez de copiar los de la captura.
export const HISTOGRAM_TYPES = [
  { key: "programa", label: "Programa", color: "#22c55e", weight: 0.55 },
  { key: "turno", label: "Turn time", color: "#14b8a6", weight: 0.12 },
  { key: "conError", label: "Program with error", color: "#f59e0b", weight: 0.1 },
  { key: "vacio", label: "Empty program", color: "#334155", weight: 0.08 },
  { key: "datosEnVivo", label: "Datos en vivo", color: "#3b82f6", weight: 0.08 },
  { key: "otro", label: "Other event", color: "#ec4899", weight: 0.07 },
];

function pickWeightedType() {
  const r = Math.random();
  let acc = 0;
  for (const t of HISTOGRAM_TYPES) {
    acc += t.weight;
    if (r <= acc) return t;
  }
  return HISTOGRAM_TYPES[0];
}

// Simula bloques de actividad (tipo Gantt) por lavadora dentro de una
// ventana de `windowHours` horas, para el widget "Histograma de los
// programas de lavadoras" del Dashboard del dispositivo.
export function simulateProgramHistogram(deviceId, windowHours = 8) {
  const config = getCalibracionConfig(deviceId);
  const programas = getProgramsForDevice(deviceId);
  const windowMinutes = windowHours * 60;
  const lavadorasHabilitadas = config.lavadoras.filter((l) => l.habilitada !== false);

  const lavadoras = lavadorasHabilitadas.map((lav) => {
    const blockCount = Math.floor(Math.random() * 3) + 2; // 2-4 bloques
    let cursor = Math.floor(Math.random() * 40);
    const blocks = [];
    for (let i = 0; i < blockCount && cursor < windowMinutes - 20; i++) {
      const duration = Math.floor(Math.random() * 70) + 20; // 20-90 min
      const type = pickWeightedType();
      const programa = programas.length > 0 ? pick(programas) : null;
      blocks.push({
        startMin: cursor,
        endMin: Math.min(windowMinutes, cursor + duration),
        label: type.key === "programa" && programa ? programa.nombre : type.label,
        color: type.color,
      });
      cursor += duration + Math.floor(Math.random() * 30) + 5; // hueco entre bloques
    }
    return { lavadoraId: lav.id, nombre: lav.nombre, blocks };
  });

  return { lavadoras, windowMinutes };
}

// Genera registros simulados de ciclos de lavado PASADOS, para el reporte
// "Detallado" (Informes). Igual que el resto de este archivo: a partir de
// la configuración real del dispositivo (lavadoras, bombas, programas) en
// vez de datos completamente desconectados. Si el dispositivo no tiene
// programas o lavadoras configurados todavía, no genera nada (no inventa
// programas que el usuario no creó).
export function simulateHistoricalWashEvents(device, clienteNombre, count = 6) {
  const config = getCalibracionConfig(device.id);
  const programas = getProgramsForDevice(device.id);
  if (config.lavadoras.length === 0 || programas.length === 0) return [];

  const entries = [];
  for (let i = 0; i < count; i++) {
    const lavadora = pick(config.lavadoras);
    const programa = pick(programas);
    const capacidadKg = parseCapacidadKg(lavadora.nombre);
    const detergenteMl = config.bombas.length > 0
      ? config.bombas.reduce((sum, b) => sum + (b.objetivoMl || Math.floor(Math.random() * 300) + 50), 0)
      : Math.floor(Math.random() * 800) + 200;
    const aguaL = Math.round(capacidadKg * (8 + Math.random() * 4) * 10) / 10; // ~8-12 L por kg, simulado
    const precioPorKg = Number(programa.precioPorKg) || 0.02 + Math.random() * 0.03;
    const precio = Math.round(precioPorKg * capacidadKg * 100) / 100;
    const diasAtras = Math.floor(Math.random() * 30);
    const fecha = new Date(Date.now() - diasAtras * 86400000 - Math.floor(Math.random() * 86400000));
    const duracionSegundos = Math.floor(Math.random() * 4500) + 300; // 5-80 min
    const horaInicio = new Date(fecha.getTime() - duracionSegundos * 1000);
    const origenEvento = pickOrigenEvento();

    entries.push({
      id: `${device.id}-${i}-${fecha.getTime()}`,
      fecha,
      horaInicio,
      duracionSegundos,
      origenEvento,
      client: clienteNombre,
      device: device.nombre,
      serial: device.serial,
      lavadora: lavadora.nombre,
      programa: programa.nombre,
      programaNumero: programa.numero,
      capacidadKg,
      detergenteMl,
      aguaL,
      precio,
    });
  }
  return entries;
}

// Serie de flujo (ml) por lavadora a lo largo de `days` días, para el
// informe "Flujo por Lavadora". Análogo a la serie por bomba que ya se usa
// en el Dashboard del dispositivo, pero agregada por lavadora en vez de
// por bomba.
export function simulateFlujoPorLavadora(deviceId, days = 14) {
  const config = getCalibracionConfig(deviceId);
  const today = new Date();
  const labels = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
  return config.lavadoras.filter((l) => l.habilitada !== false).map((lav) => ({
    nombre: lav.nombre,
    points: labels.map((label) => ({ label, value: Math.round(800 + Math.random() * 2500) })),
  }));
}

// Serie de flujo (ml) por bomba a lo largo de `days` días, para el
// widget "Flujo por Bomba" del Dashboard del dispositivo y el informe del
// mismo nombre en Informes (se comparte la misma función entre ambos).
export function simulateFlujoPorBomba(deviceId, days = 14) {
  const config = getCalibracionConfig(deviceId);
  const today = new Date();
  const labels = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
  return config.bombas.filter((b) => b.activa !== false).map((bomba) => ({
    nombre: bomba.nombre,
    points: labels.map((label) => ({ label, value: Math.round(500 + Math.random() * 1500) })),
  }));
}
