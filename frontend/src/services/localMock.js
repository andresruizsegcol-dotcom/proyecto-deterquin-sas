// Simple localStorage wrapper used as a temporary data service.
// Provides functions used by pages to read/write the demo data structure
// Key assumptions: clients are stored under 'clientes' (array) and
// devices per client use key `dispositivos_cliente_${clientIndex}`.
// This module centralizes that logic so callers don't access localStorage directly.

export function getClients() {
  try {
    const raw = localStorage.getItem("clientes");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("getClients: malformed localStorage clientes", e);
    return [];
  }
}

export function saveClients(clients) {
  try {
    localStorage.setItem("clientes", JSON.stringify(clients || []));
  } catch (e) {
    console.error("saveClients failed", e);
  }
}

// Prefijos de claves que dependen de la posición (índice) del cliente en el
// arreglo. Si en el futuro se agrega un nuevo tipo de dato "por cliente"
// (ej. categorías de programas, notas), agregar su prefijo aquí para que
// `deleteClient` lo reindexe automáticamente también.
const CLIENT_SCOPED_KEY_PREFIXES = ["dispositivos_cliente_", "productos_cliente_"];

export function deleteClient(index) {
  // Elimina el cliente en `index` y reindexa los datos "por cliente" de los
  // clientes siguientes (dispositivos, productos, etc.). Como esos datos se
  // guardan bajo claves del tipo `prefijo_${indice}` y los clientes se
  // identifican por su posición en el arreglo, al borrar uno todos los que
  // estaban después se recorren una posición hacia atrás. Si no
  // desplazáramos también sus datos asociados, cada cliente terminaría
  // mostrando los datos del cliente que originalmente estaba un índice por
  // delante.
  const clients = getClients();
  if (index < 0 || index >= clients.length) return getClients();

  const total = clients.length;
  clients.splice(index, 1);
  saveClients(clients);

  CLIENT_SCOPED_KEY_PREFIXES.forEach((prefix) => {
    for (let i = index; i < total - 1; i += 1) {
      const raw = localStorage.getItem(`${prefix}${i + 1}`);
      if (raw !== null) {
        localStorage.setItem(`${prefix}${i}`, raw);
      } else {
        localStorage.removeItem(`${prefix}${i}`);
      }
    }
    try {
      localStorage.removeItem(`${prefix}${total - 1}`);
    } catch {
      // ignore
    }
  });

  return clients;
}

export function getDevicesForClient(index) {
  try {
    const raw = localStorage.getItem(`dispositivos_cliente_${index}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("getDevicesForClient malformed", e);
    return [];
  }
}

export function saveDevicesForClient(index, devices) {
  try {
    localStorage.setItem(`dispositivos_cliente_${index}`, JSON.stringify(devices || []));
  } catch (e) {
    console.error("saveDevicesForClient failed", e);
  }
}

export function getDeviceCounts(index) {
  const devs = getDevicesForClient(index);
  const total = devs.length;
  const activos = devs.filter(d => d.estado === "activo").length;
  return { total, activos };
}

export function getProductsForClient(index) {
  try {
    const raw = localStorage.getItem(`productos_cliente_${index}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("getProductsForClient malformed", e);
    return [];
  }
}

export function saveProductsForClient(index, products) {
  try {
    localStorage.setItem(`productos_cliente_${index}`, JSON.stringify(products || []));
  } catch (e) {
    console.error("saveProductsForClient failed", e);
  }
}

// Programas de lavado por dispositivo. A diferencia de dispositivos/productos
// por cliente, aquí se usa el `id` (estable, generado con Date.now()) del
// dispositivo en vez de su posición en el arreglo, así que esta clave no
// necesita lógica de reindexado al borrar dispositivos: el id nunca se
// reutiliza, por lo que como mucho queda una clave huérfana (sin riesgo de
// mostrarle a un dispositivo los programas de otro).
export function getProgramsForDevice(deviceId) {
  try {
    const raw = localStorage.getItem(`programas_dispositivo_${deviceId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("getProgramsForDevice malformed", e);
    return [];
  }
}

export function saveProgramsForDevice(deviceId, programs) {
  try {
    localStorage.setItem(`programas_dispositivo_${deviceId}`, JSON.stringify(programs || []));
  } catch (e) {
    console.error("saveProgramsForDevice failed", e);
  }
}

export function deleteProgramsForDevice(deviceId) {
  try {
    localStorage.removeItem(`programas_dispositivo_${deviceId}`);
  } catch (e) {
    console.error("deleteProgramsForDevice failed", e);
  }
}

// Configuración de calibración remota por dispositivo: grupos de
// dosificación, lavadoras y bombas configuradas (cada bomba dosifica un
// producto químico del cliente). Igual que con programas, se usa el `id`
// estable del dispositivo como clave. Se seedean un grupo y una lavadora
// por defecto (igual que en la referencia visual) para que la modal no
// arranque completamente vacía; las bombas NO se seedean porque dependen
// de los productos reales del cliente, que varían.
function defaultCalibracionConfig() {
  return {
    grupos: [{ id: 1, nombre: "Grupo Dosificación 1" }],
    lavadoras: [{ id: 1, nombre: "Lavadora 1" }],
    bombas: [],
  };
}

export function getCalibracionConfig(deviceId) {
  try {
    const raw = localStorage.getItem(`calibracion_dispositivo_${deviceId}`);
    return raw ? JSON.parse(raw) : defaultCalibracionConfig();
  } catch (e) {
    console.error("getCalibracionConfig malformed", e);
    return defaultCalibracionConfig();
  }
}

export function saveCalibracionConfig(deviceId, config) {
  try {
    localStorage.setItem(`calibracion_dispositivo_${deviceId}`, JSON.stringify(config));
  } catch (e) {
    console.error("saveCalibracionConfig failed", e);
  }
}

export function deleteCalibracionConfig(deviceId) {
  try {
    localStorage.removeItem(`calibracion_dispositivo_${deviceId}`);
  } catch (e) {
    console.error("deleteCalibracionConfig failed", e);
  }
}

// Busca un dispositivo por su `id` (estable) recorriendo TODOS los
// clientes, sin necesitar saber de antemano a cuál cliente pertenece.
// Necesario para la página independiente /dispositivos/:deviceId, donde la
// URL solo trae el id del dispositivo. Devuelve null si no se encuentra
// (ej. el dispositivo fue borrado pero quedó un enlace antiguo guardado).
export function findDeviceById(deviceId) {
  const targetId = String(deviceId);
  const clients = getClients();
  for (let clienteIndex = 0; clienteIndex < clients.length; clienteIndex += 1) {
    const devices = getDevicesForClient(clienteIndex);
    const device = devices.find((d) => String(d.id) === targetId);
    if (device) {
      return { device, clienteIndex, clienteNombre: clients[clienteIndex]?.nombre || "Cliente sin nombre" };
    }
  }
  return null;
}

export function getRegisteredDeviceSerials() {
  const clients = getClients();
  const fromClientes = clients.map(c => c.serial).filter(Boolean);
  const fromStorage = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith("dispositivos_cliente_")) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(data)) data.forEach(d => d?.serial && fromStorage.push(d.serial));
      } catch {
        // ignore malformed storage entries
      }
    }
  }
  return Array.from(new Set([...fromClientes, ...fromStorage])).filter(Boolean);
}

// Generic raw accessors for non-client/device keys so pages don't touch localStorage
export function getRawItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`getRawItem failed for ${key}`, e);
    return null;
  }
}

export function setRawItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`setRawItem failed for ${key}`, e);
  }
}

export function removeRawItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`removeRawItem failed for ${key}`, e);
  }
}
