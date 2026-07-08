const test = require('node:test');
const assert = require('node:assert/strict');

const { computeOrderStatus } = require('../utils/computeOrderStatus');

test('empty or missing shipments → ORDER_CREATED', () => {
  assert.equal(computeOrderStatus([]), 'ORDER_CREATED');
  assert.equal(computeOrderStatus(null), 'ORDER_CREATED');
  assert.equal(computeOrderStatus(undefined), 'ORDER_CREATED');
});

test('single shipment mirrors its own status', () => {
  assert.equal(computeOrderStatus(['VENDOR_PROCESSING']), 'VENDOR_PROCESSING');
  assert.equal(computeOrderStatus(['DELIVERED']), 'DELIVERED');
  assert.equal(computeOrderStatus(['CANCELLED']), 'CANCELLED');
});

test('multi-vendor order shows the least-progressed active shipment', () => {
  assert.equal(
    computeOrderStatus(['PACKED_BY_VENDOR', 'IN_TRANSIT_TO_ADMIN_HUB']),
    'PACKED_BY_VENDOR'
  );
  assert.equal(
    computeOrderStatus(['SHIPPED_TO_CUSTOMER', 'ORDER_CREATED', 'DELIVERED']),
    'ORDER_CREATED'
  );
});

test('all-terminal combinations', () => {
  assert.equal(computeOrderStatus(['CANCELLED', 'CANCELLED']), 'CANCELLED');
  assert.equal(computeOrderStatus(['RETURNED', 'RETURNED']), 'RETURNED');
  assert.equal(computeOrderStatus(['DELIVERED', 'DELIVERED']), 'DELIVERED');
});

test('delivered + cancelled mix (no active) still counts as DELIVERED', () => {
  assert.equal(computeOrderStatus(['DELIVERED', 'CANCELLED']), 'DELIVERED');
});

test('returned beats cancelled when no active and nothing delivered', () => {
  assert.equal(computeOrderStatus(['RETURNED', 'CANCELLED']), 'RETURNED');
});

test('terminal shipments do not drag an active order backwards', () => {
  // One vendor cancelled; the other is mid-flight — order follows the active one.
  assert.equal(
    computeOrderStatus(['CANCELLED', 'IN_TRANSIT_TO_ADMIN_HUB']),
    'IN_TRANSIT_TO_ADMIN_HUB'
  );
});

test('all shipments at approval tier with a rejection → RECEIVED_AT_ADMIN_HUB (needs resolution)', () => {
  assert.equal(
    computeOrderStatus(['APPROVED_BY_ADMIN_HUB', 'REJECTED_BY_ADMIN_HUB']),
    'RECEIVED_AT_ADMIN_HUB'
  );
});

test('rejection does not force resolution status while another vendor is earlier in the flow', () => {
  assert.equal(
    computeOrderStatus(['REJECTED_BY_ADMIN_HUB', 'VENDOR_PROCESSING']),
    'VENDOR_PROCESSING'
  );
});

test('unknown status is treated as weight 0 without crashing', () => {
  assert.equal(computeOrderStatus(['SOME_FUTURE_STATUS', 'DELIVERED']), 'SOME_FUTURE_STATUS');
});
