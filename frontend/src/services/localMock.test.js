import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getClients,
  saveClients,
  deleteClient,
  getDevicesForClient,
  saveDevicesForClient,
  getDeviceCounts,
  getProductsForClient,
  saveProductsForClient,
  getProgramsForDevice,
  saveProgramsForDevice,
  deleteProgramsForDevice,
  getCalibracionConfig,
  saveCalibracionConfig,
  deleteCalibracionConfig,
  getRegisteredDeviceSerials,
  getRawItem,
  setRawItem,
  removeRawItem,
} from './localMock';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('localMock.js - Persistence Layer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ============================================================================
  // CLIENTES (Clients)
  // ============================================================================
  describe('Clientes - saveClients & getClients', () => {
    it('should save and retrieve clients', () => {
      const clients = [
        { nombre: 'Cliente 1', serial: 'DQ-001', ciudad: 'Bogotá' },
        { nombre: 'Cliente 2', serial: 'DQ-002', ciudad: 'Medellín' },
      ];
      saveClients(clients);
      const retrieved = getClients();
      expect(retrieved).toEqual(clients);
    });

    it('should return empty array when no clients exist', () => {
      const clients = getClients();
      expect(clients).toEqual([]);
    });

    it('should overwrite existing clients', () => {
      const clients1 = [{ nombre: 'A', serial: 'A1' }];
      saveClients(clients1);
      expect(getClients()).toEqual(clients1);

      const clients2 = [{ nombre: 'B', serial: 'B1' }, { nombre: 'C', serial: 'C1' }];
      saveClients(clients2);
      expect(getClients()).toEqual(clients2);
    });

    it('should handle empty array', () => {
      saveClients([]);
      expect(getClients()).toEqual([]);
    });

    it('should handle malformed JSON gracefully', () => {
      localStorage.setItem('clientes', 'invalid json {]');
      const clients = getClients();
      expect(clients).toEqual([]);
    });

    it('should preserve client properties', () => {
      const client = {
        nombre: 'Test Client',
        serial: 'DQ-12345',
        ciudad: 'Bogotá',
        pais: 'Colombia',
        tipo: 'empresa',
        fechaInstalacion: '2025-01-15',
      };
      saveClients([client]);
      const retrieved = getClients();
      expect(retrieved[0]).toEqual(client);
    });
  });

  describe('Clientes - deleteClient', () => {
    it('should delete client at specified index', () => {
      const clients = [
        { nombre: 'A', serial: 'A1' },
        { nombre: 'B', serial: 'B1' },
        { nombre: 'C', serial: 'C1' },
      ];
      saveClients(clients);
      deleteClient(1);
      const remaining = getClients();
      expect(remaining).toEqual([
        { nombre: 'A', serial: 'A1' },
        { nombre: 'C', serial: 'C1' },
      ]);
    });

    it('should remove associated devices key when deleting client', () => {
      saveClients([{ nombre: 'A', serial: 'A1' }]);
      saveDevicesForClient(0, [{ nombre: 'Device 1', serial: 'DEV1' }]);
      deleteClient(0);
      // Key should be removed or at least not accessible
      const devs = getDevicesForClient(0);
      expect(devs).toEqual([]);
    });

    it('should reindex devices and products of clients after the deleted index, not just remove the deleted slot', () => {
      // Reproduce el bug original: borrar un cliente que no es el último
      // desalineaba los dispositivos (y ahora también los productos) de
      // todos los clientes posteriores, porque ambos se guardan bajo
      // `..._cliente_${indice}` y el índice cambia para todos al recorrerse
      // el arreglo.
      const clients = [
        { nombre: 'A', serial: 'A1' },
        { nombre: 'B', serial: 'B1' },
        { nombre: 'C', serial: 'C1' },
        { nombre: 'D', serial: 'D1' },
      ];
      saveClients(clients);

      const devicesA = [{ nombre: 'Dev A', serial: 'DA1' }];
      const devicesB = [{ nombre: 'Dev B', serial: 'DB1' }];
      const devicesC = [{ nombre: 'Dev C', serial: 'DC1' }];
      const devicesD = [{ nombre: 'Dev D', serial: 'DD1' }];
      saveDevicesForClient(0, devicesA);
      saveDevicesForClient(1, devicesB);
      saveDevicesForClient(2, devicesC);
      saveDevicesForClient(3, devicesD);

      const productsA = [{ nombre: 'Prod A' }];
      const productsB = [{ nombre: 'Prod B' }];
      const productsC = [{ nombre: 'Prod C' }];
      const productsD = [{ nombre: 'Prod D' }];
      saveProductsForClient(0, productsA);
      saveProductsForClient(1, productsB);
      saveProductsForClient(2, productsC);
      saveProductsForClient(3, productsD);

      // Borrar a B (índice 1). C pasa a índice 1 y D pasa a índice 2.
      deleteClient(1);

      expect(getClients()).toEqual([
        { nombre: 'A', serial: 'A1' },
        { nombre: 'C', serial: 'C1' },
        { nombre: 'D', serial: 'D1' },
      ]);
      expect(getDevicesForClient(0)).toEqual(devicesA); // A no se mueve
      expect(getDevicesForClient(1)).toEqual(devicesC); // dispositivos de C siguen a C
      expect(getDevicesForClient(2)).toEqual(devicesD); // dispositivos de D siguen a D
      expect(getDevicesForClient(3)).toEqual([]); // última clave no queda huérfana

      expect(getProductsForClient(0)).toEqual(productsA); // A no se mueve
      expect(getProductsForClient(1)).toEqual(productsC); // productos de C siguen a C
      expect(getProductsForClient(2)).toEqual(productsD); // productos de D siguen a D
      expect(getProductsForClient(3)).toEqual([]); // última clave no queda huérfana
    });

    it('should handle invalid index gracefully', () => {
      saveClients([{ nombre: 'A', serial: 'A1' }]);
      deleteClient(5);
      expect(getClients()).toEqual([{ nombre: 'A', serial: 'A1' }]);
    });

    it('should return updated clients array', () => {
      const original = [{ nombre: 'A', serial: 'A1' }, { nombre: 'B', serial: 'B1' }];
      saveClients(original);
      const result = deleteClient(0);
      expect(result).toEqual([{ nombre: 'B', serial: 'B1' }]);
    });
  });

  // ============================================================================
  // DISPOSITIVOS (Devices)
  // ============================================================================
  describe('Dispositivos - saveDevicesForClient & getDevicesForClient', () => {
    it('should save and retrieve devices for a client', () => {
      const devices = [
        { nombre: 'Device 1', serial: 'DEV1', estado: 'activo' },
        { nombre: 'Device 2', serial: 'DEV2', estado: 'inactivo' },
      ];
      saveDevicesForClient(0, devices);
      const retrieved = getDevicesForClient(0);
      expect(retrieved).toEqual(devices);
    });

    it('should return empty array when no devices exist', () => {
      const devices = getDevicesForClient(0);
      expect(devices).toEqual([]);
    });

    it('should isolate devices between clients', () => {
      const devices0 = [{ nombre: 'A', serial: 'A1' }];
      const devices1 = [{ nombre: 'B', serial: 'B1' }, { nombre: 'C', serial: 'C1' }];
      saveDevicesForClient(0, devices0);
      saveDevicesForClient(1, devices1);

      expect(getDevicesForClient(0)).toEqual(devices0);
      expect(getDevicesForClient(1)).toEqual(devices1);
    });

    it('should overwrite existing devices', () => {
      const devices1 = [{ nombre: 'Old', serial: 'OLD1' }];
      saveDevicesForClient(0, devices1);
      expect(getDevicesForClient(0)).toEqual(devices1);

      const devices2 = [{ nombre: 'New', serial: 'NEW1' }, { nombre: 'New2', serial: 'NEW2' }];
      saveDevicesForClient(0, devices2);
      expect(getDevicesForClient(0)).toEqual(devices2);
    });

    it('should handle empty device array', () => {
      saveDevicesForClient(0, []);
      expect(getDevicesForClient(0)).toEqual([]);
    });

    it('should handle malformed device JSON', () => {
      localStorage.setItem('dispositivos_cliente_0', 'invalid json [}');
      const devices = getDevicesForClient(0);
      expect(devices).toEqual([]);
    });

    it('should preserve device properties', () => {
      const device = {
        id: 12345,
        nombre: 'Dosificador Principal',
        serial: 'DQ-456',
        tipo: 'Dosificador',
        ubicacion: 'Lavandería Piso 1',
        estado: 'activo',
      };
      saveDevicesForClient(2, [device]);
      const retrieved = getDevicesForClient(2);
      expect(retrieved[0]).toEqual(device);
    });
  });

  // ============================================================================
  // CONTEOS (Counts)
  // ============================================================================
  describe('Dispositivos - getDeviceCounts', () => {
    it('should count total and active devices', () => {
      const devices = [
        { nombre: 'A', serial: 'A1', estado: 'activo' },
        { nombre: 'B', serial: 'B1', estado: 'activo' },
        { nombre: 'C', serial: 'C1', estado: 'inactivo' },
      ];
      saveDevicesForClient(0, devices);
      const { total, activos } = getDeviceCounts(0);
      expect(total).toBe(3);
      expect(activos).toBe(2);
    });

    it('should return 0 when no devices exist', () => {
      const { total, activos } = getDeviceCounts(0);
      expect(total).toBe(0);
      expect(activos).toBe(0);
    });

    it('should handle all devices inactive', () => {
      const devices = [
        { nombre: 'A', serial: 'A1', estado: 'inactivo' },
        { nombre: 'B', serial: 'B1', estado: 'inactivo' },
      ];
      saveDevicesForClient(1, devices);
      const { total, activos } = getDeviceCounts(1);
      expect(total).toBe(2);
      expect(activos).toBe(0);
    });

    it('should handle all devices active', () => {
      const devices = [
        { nombre: 'A', serial: 'A1', estado: 'activo' },
        { nombre: 'B', serial: 'B1', estado: 'activo' },
      ];
      saveDevicesForClient(2, devices);
      const { total, activos } = getDeviceCounts(2);
      expect(total).toBe(2);
      expect(activos).toBe(2);
    });
  });

  // ============================================================================
  // PRODUCTOS QUÍMICOS (Chemical products per client)
  // ============================================================================
  describe('Productos - saveProductsForClient & getProductsForClient', () => {
    it('should save and retrieve products for a client', () => {
      const productos = [
        { nombre: 'BUSTER 40', precio: 0.68, cantidadRestante: 145, consumoDiario: 7.45 },
        { nombre: 'PROCIGEN 60', precio: 1.58, cantidadRestante: 80, consumoDiario: 11.75 },
      ];
      saveProductsForClient(0, productos);
      expect(getProductsForClient(0)).toEqual(productos);
    });

    it('should return empty array when no products exist', () => {
      expect(getProductsForClient(0)).toEqual([]);
    });

    it('should isolate products between clients', () => {
      const productos0 = [{ nombre: 'A', precio: 1 }];
      const productos1 = [{ nombre: 'B', precio: 2 }];
      saveProductsForClient(0, productos0);
      saveProductsForClient(1, productos1);

      expect(getProductsForClient(0)).toEqual(productos0);
      expect(getProductsForClient(1)).toEqual(productos1);
    });

    it('should handle malformed product JSON', () => {
      localStorage.setItem('productos_cliente_0', 'invalid json [}');
      expect(getProductsForClient(0)).toEqual([]);
    });
  });

  // ============================================================================
  // PROGRAMAS (Wash programs per device)
  // ============================================================================
  describe('Programas - saveProgramsForDevice & getProgramsForDevice', () => {
    it('should save and retrieve programs for a device', () => {
      const programas = [
        { id: 1, nombre: 'C1 - TOALLA BLANCA', numero: '1', arranqueAutomatico: true, senales: [1, 2] },
        { id: 2, nombre: 'C2 - FUNDAS', numero: '2', arranqueAutomatico: false, senales: [] },
      ];
      saveProgramsForDevice('device-123', programas);
      expect(getProgramsForDevice('device-123')).toEqual(programas);
    });

    it('should return empty array when no programs exist', () => {
      expect(getProgramsForDevice('device-sin-programas')).toEqual([]);
    });

    it('should isolate programs between devices using their id', () => {
      const programasA = [{ id: 1, nombre: 'A', numero: '1' }];
      const programasB = [{ id: 2, nombre: 'B', numero: '1' }]; // mismo "numero" en otro dispositivo, no debe chocar
      saveProgramsForDevice('device-A', programasA);
      saveProgramsForDevice('device-B', programasB);

      expect(getProgramsForDevice('device-A')).toEqual(programasA);
      expect(getProgramsForDevice('device-B')).toEqual(programasB);
    });

    it('should handle malformed program JSON', () => {
      localStorage.setItem('programas_dispositivo_device-123', 'invalid json [}');
      expect(getProgramsForDevice('device-123')).toEqual([]);
    });

    it('should remove programs key on deleteProgramsForDevice', () => {
      saveProgramsForDevice('device-456', [{ id: 1, nombre: 'X', numero: '1' }]);
      deleteProgramsForDevice('device-456');
      expect(getProgramsForDevice('device-456')).toEqual([]);
    });

    it('should not throw when deleting programs for a device that never had any', () => {
      expect(() => deleteProgramsForDevice('device-nunca-existio')).not.toThrow();
    });
  });

  // ============================================================================
  // CALIBRACIÓN REMOTA (Grupos de dosificación, lavadoras y bombas por dispositivo)
  // ============================================================================
  describe('Calibración remota - getCalibracionConfig & saveCalibracionConfig', () => {
    it('should return a seeded default config when none exists yet', () => {
      const config = getCalibracionConfig('device-nuevo');
      expect(config.grupos.length).toBe(1);
      expect(config.lavadoras.length).toBe(1);
      expect(config.bombas).toEqual([]); // las bombas NO se seedean, dependen de productos reales
    });

    it('should save and retrieve a custom config for a device', () => {
      const config = {
        grupos: [{ id: 1, nombre: 'Grupo Dosificación 1' }, { id: 2, nombre: 'Grupo Dosificación 2' }],
        lavadoras: [{ id: 1, nombre: 'Lavadora 1' }],
        bombas: [
          { id: 10, nombre: 'Bomba 1', productoId: 555, cantidadCalibrada: 12.5, objetivoMl: 15 },
        ],
      };
      saveCalibracionConfig('device-123', config);
      expect(getCalibracionConfig('device-123')).toEqual(config);
    });

    it('should isolate calibration config between devices using their id', () => {
      const configA = { grupos: [{ id: 1, nombre: 'A' }], lavadoras: [], bombas: [] };
      const configB = { grupos: [{ id: 1, nombre: 'B' }], lavadoras: [], bombas: [] };
      saveCalibracionConfig('device-A', configA);
      saveCalibracionConfig('device-B', configB);

      expect(getCalibracionConfig('device-A')).toEqual(configA);
      expect(getCalibracionConfig('device-B')).toEqual(configB);
    });

    it('should handle malformed calibration JSON by falling back to defaults', () => {
      localStorage.setItem('calibracion_dispositivo_device-123', 'invalid json [}');
      const config = getCalibracionConfig('device-123');
      expect(config.grupos.length).toBe(1);
      expect(config.lavadoras.length).toBe(1);
      expect(config.bombas).toEqual([]);
    });

    it('should remove calibration config key on deleteCalibracionConfig', () => {
      saveCalibracionConfig('device-456', { grupos: [], lavadoras: [], bombas: [{ id: 1, nombre: 'X' }] });
      deleteCalibracionConfig('device-456');
      // Tras borrar, vuelve a verse el default seedeado (no la config previa)
      const config = getCalibracionConfig('device-456');
      expect(config.bombas).toEqual([]);
    });

    it('should not throw when deleting calibration config for a device that never had any', () => {
      expect(() => deleteCalibracionConfig('device-nunca-existio')).not.toThrow();
    });
  });

  // ============================================================================
  // SERIALES (Device Serials)
  // ============================================================================
  describe('Seriales - getRegisteredDeviceSerials', () => {
    it('should collect all unique device serials', () => {
      saveClients([
        { nombre: 'Client1', serial: 'C1' },
        { nombre: 'Client2', serial: 'C2' },
      ]);
      saveDevicesForClient(0, [
        { nombre: 'Dev1', serial: 'DEV1' },
        { nombre: 'Dev2', serial: 'DEV2' },
      ]);
      saveDevicesForClient(1, [
        { nombre: 'Dev3', serial: 'DEV3' },
      ]);

      const serials = getRegisteredDeviceSerials();
      expect(serials).toContain('C1');
      expect(serials).toContain('C2');
      expect(serials).toContain('DEV1');
      expect(serials).toContain('DEV2');
      expect(serials).toContain('DEV3');
      expect(serials.length).toBe(5);
    });

    it('should avoid duplicates', () => {
      saveClients([
        { nombre: 'Client1', serial: 'SHARED' },
      ]);
      saveDevicesForClient(0, [
        { nombre: 'Dev1', serial: 'SHARED' },
        { nombre: 'Dev2', serial: 'DEV2' },
      ]);

      const serials = getRegisteredDeviceSerials();
      const sharedCount = serials.filter(s => s === 'SHARED').length;
      expect(sharedCount).toBe(1);
    });

    it('should return empty array when no data exists', () => {
      const serials = getRegisteredDeviceSerials();
      expect(serials).toEqual([]);
    });

    it('should filter out empty/null serials', () => {
      saveClients([
        { nombre: 'Client1', serial: '' },
        { nombre: 'Client2', serial: null },
        { nombre: 'Client3', serial: 'VALID' },
      ]);
      saveDevicesForClient(2, [
        { nombre: 'Dev1', serial: undefined },
        { nombre: 'Dev2', serial: 'DEV2' },
      ]);

      const serials = getRegisteredDeviceSerials();
      expect(serials).toContain('VALID');
      expect(serials).toContain('DEV2');
      expect(serials.filter(s => !s || s === '' || s === null || s === undefined).length).toBe(0);
    });
  });

  // ============================================================================
  // RAW ACCESSORS (for non-client/device keys)
  // ============================================================================
  describe('Raw Accessors - getRawItem, setRawItem, removeRawItem', () => {
    it('should get raw item by key', () => {
      localStorage.setItem('testKey', 'testValue');
      expect(getRawItem('testKey')).toBe('testValue');
    });

    it('should return null for non-existent key', () => {
      expect(getRawItem('nonExistent')).toBeNull();
    });

    it('should set raw item', () => {
      setRawItem('myKey', 'myValue');
      expect(localStorage.getItem('myKey')).toBe('myValue');
    });

    it('should remove raw item', () => {
      setRawItem('toDelete', 'value');
      removeRawItem('toDelete');
      expect(getRawItem('toDelete')).toBeNull();
    });

    it('should handle authentication-related keys', () => {
      const authKeys = ['loggedIn', 'userEmail', 'userRole', 'userName'];
      authKeys.forEach(key => {
        setRawItem(key, `value_${key}`);
        expect(getRawItem(key)).toBe(`value_${key}`);
      });

      authKeys.forEach(key => {
        removeRawItem(key);
        expect(getRawItem(key)).toBeNull();
      });
    });

    it('should handle error gracefully when getting invalid key', () => {
      // Should not throw
      expect(() => getRawItem('anyKey')).not.toThrow();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================
  describe('Integration - Full workflow', () => {
    it('should support complete CRUD cycle', () => {
      // Create clients
      const clients = [
        { nombre: 'Client A', serial: 'CA1', ciudad: 'Bogotá' },
        { nombre: 'Client B', serial: 'CB1', ciudad: 'Medellín' },
      ];
      saveClients(clients);
      expect(getClients()).toEqual(clients);

      // Create devices for client 0
      const devicesClient0 = [
        { id: 1, nombre: 'Dev A1', serial: 'DA1', estado: 'activo' },
        { id: 2, nombre: 'Dev A2', serial: 'DA2', estado: 'inactivo' },
      ];
      saveDevicesForClient(0, devicesClient0);
      expect(getDevicesForClient(0)).toEqual(devicesClient0);

      // Create devices for client 1
      const devicesClient1 = [
        { id: 3, nombre: 'Dev B1', serial: 'DB1', estado: 'activo' },
      ];
      saveDevicesForClient(1, devicesClient1);
      expect(getDevicesForClient(1)).toEqual(devicesClient1);

      // Verify counts
      const counts0 = getDeviceCounts(0);
      expect(counts0.total).toBe(2);
      expect(counts0.activos).toBe(1);

      const counts1 = getDeviceCounts(1);
      expect(counts1.total).toBe(1);
      expect(counts1.activos).toBe(1);

      // Verify serials
      const serials = getRegisteredDeviceSerials();
      expect(serials).toContain('CA1');
      expect(serials).toContain('CB1');
      expect(serials).toContain('DA1');
      expect(serials).toContain('DA2');
      expect(serials).toContain('DB1');

      // Update devices for client 0
      const updatedDevices = [
        { id: 1, nombre: 'Dev A1 Updated', serial: 'DA1', estado: 'activo' },
      ];
      saveDevicesForClient(0, updatedDevices);
      expect(getDevicesForClient(0)).toEqual(updatedDevices);
      expect(getDeviceCounts(0).total).toBe(1);

      // Delete client A (índice 0). Client B pasa a ocupar el índice 0
      // y debe conservar sus propios dispositivos (no quedar vacío).
      deleteClient(0);
      expect(getClients()).toEqual([clients[1]]);
      expect(getDevicesForClient(0)).toEqual(devicesClient1); // Dispositivos de B siguieron a B
    });

    it('should maintain data isolation across multiple operations', () => {
      // Setup
      const clients = Array.from({ length: 5 }, (_, i) => ({
        nombre: `Client ${i}`,
        serial: `C${i}`,
      }));
      saveClients(clients);

      // Add devices to each client
      clients.forEach((_, idx) => {
        const devices = Array.from({ length: 3 }, (_, dIdx) => ({
          id: idx * 100 + dIdx,
          nombre: `Device ${idx}-${dIdx}`,
          serial: `D${idx}-${dIdx}`,
          estado: dIdx % 2 === 0 ? 'activo' : 'inactivo',
        }));
        saveDevicesForClient(idx, devices);
      });

      // Verify isolation
      clients.forEach((_, idx) => {
        const devices = getDevicesForClient(idx);
        expect(devices.length).toBe(3);
        expect(devices.every(d => d.nombre.startsWith(`Device ${idx}`))).toBe(true);
        const { total, activos } = getDeviceCounts(idx);
        expect(total).toBe(3);
        expect(activos).toBe(2); // indices 0, 2 are activos
      });
    });
  });
});
