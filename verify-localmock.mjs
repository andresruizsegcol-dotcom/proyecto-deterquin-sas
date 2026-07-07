// Manual verification script for localMock.js
// Run this in a browser console or with Node (with --experimental-vm-modules flag for ES modules)

// Mock localStorage for Node environment
if (typeof localStorage === 'undefined') {
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
  global.localStorage = localStorageMock;
}

// Import localMock functions
import {
  getClients,
  saveClients,
  deleteClient,
  getDevicesForClient,
  saveDevicesForClient,
  getDeviceCounts,
  getRegisteredDeviceSerials,
  getRawItem,
  setRawItem,
  removeRawItem,
} from './src/services/localMock.js';

// Test counter
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`✓ ${message}`);
  } else {
    failed++;
    console.error(`✗ ${message}`);
  }
}

function clearStorage() {
  localStorage.clear();
}

// ============================================================================
// TESTS
// ============================================================================

console.log('\n=== Testing CLIENTES (Clients) ===\n');

clearStorage();
const clients = [
  { nombre: 'Cliente 1', serial: 'DQ-001', ciudad: 'Bogotá' },
  { nombre: 'Cliente 2', serial: 'DQ-002', ciudad: 'Medellín' },
];
saveClients(clients);
assert(JSON.stringify(getClients()) === JSON.stringify(clients), 'Save and retrieve clients');
assert(getClients().length === 2, 'Should have 2 clients');

clearStorage();
assert(getClients().length === 0, 'Return empty array when no clients exist');

clearStorage();
localStorage.setItem('clientes', 'invalid json {]');
assert(getClients().length === 0, 'Handle malformed JSON gracefully');

console.log('\n=== Testing DISPOSITIVOS (Devices) ===\n');

clearStorage();
const devices = [
  { nombre: 'Device 1', serial: 'DEV1', estado: 'activo' },
  { nombre: 'Device 2', serial: 'DEV2', estado: 'inactivo' },
];
saveDevicesForClient(0, devices);
assert(JSON.stringify(getDevicesForClient(0)) === JSON.stringify(devices), 'Save and retrieve devices');

const devicesClient1 = [{ nombre: 'Device 3', serial: 'DEV3', estado: 'activo' }];
saveDevicesForClient(1, devicesClient1);
assert(getDevicesForClient(0).length === 2, 'Client 0 has 2 devices');
assert(getDevicesForClient(1).length === 1, 'Client 1 has 1 device');
assert(getDevicesForClient(0)[0].nombre === 'Device 1', 'Device isolation preserved');

console.log('\n=== Testing CONTEOS (Counts) ===\n');

clearStorage();
saveDevicesForClient(0, [
  { nombre: 'A', serial: 'A1', estado: 'activo' },
  { nombre: 'B', serial: 'B1', estado: 'activo' },
  { nombre: 'C', serial: 'C1', estado: 'inactivo' },
]);
const { total, activos } = getDeviceCounts(0);
assert(total === 3, 'Total count correct');
assert(activos === 2, 'Active count correct');

console.log('\n=== Testing SERIALES (Device Serials) ===\n');

clearStorage();
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
assert(serials.includes('C1'), 'Client serial included');
assert(serials.includes('DEV1'), 'Device serial included');
assert(new Set(serials).size === serials.length, 'No duplicates in serials');

console.log('\n=== Testing RAW ACCESSORS ===\n');

clearStorage();
setRawItem('testKey', 'testValue');
assert(getRawItem('testKey') === 'testValue', 'Set and get raw item');
removeRawItem('testKey');
assert(getRawItem('testKey') === null, 'Remove raw item');

console.log('\n=== Testing DELETE CLIENT ===\n');

clearStorage();
saveClients([
  { nombre: 'A', serial: 'A1' },
  { nombre: 'B', serial: 'B1' },
  { nombre: 'C', serial: 'C1' },
]);
deleteClient(1);
const remainingClients = getClients();
assert(remainingClients.length === 2, 'Client deleted correctly');
assert(remainingClients[0].nombre === 'A', 'First client preserved');
assert(remainingClients[1].nombre === 'C', 'Last client preserved');

console.log('\n=== SUMMARY ===\n');
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed!');
} else {
  console.log(`\n❌ ${failed} test(s) failed.`);
  process.exit(1);
}
