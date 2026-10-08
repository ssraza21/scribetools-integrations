'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const { buildSchema, fieldKey } = require('../lib/schema');

test('field names become schema keys', () => {
  assert.equal(fieldKey('Invoice Number'), 'invoice_number');
  assert.equal(fieldKey('  Total (SAR) '), 'total_sar');
  assert.equal(fieldKey('2nd address'), 'f_2nd_address');
  assert.equal(fieldKey('اسم المؤلف'), null);
});

test('line items build an object schema', () => {
  const schema = buildSchema([
    { name: 'Invoice Number', type: 'text', instructions: 'Top right corner' },
    { name: 'Total', type: 'number' },
    { name: 'Issued', type: 'date' },
    { name: 'Paid', type: 'boolean' },
    { name: 'Pages', type: 'integer' },
  ]);
  assert.deepEqual(schema, {
    type: 'object',
    properties: {
      invoice_number: { type: 'string', title: 'Invoice Number', description: 'Top right corner' },
      total: { type: 'number', title: 'Total' },
      issued: { type: 'string', format: 'date', title: 'Issued' },
      paid: { type: 'boolean', title: 'Paid' },
      pages: { type: 'integer', title: 'Pages' },
    },
    required: [],
    additionalProperties: false,
  });
});

test('names that cannot become keys or repeat are reported', () => {
  assert.throws(() => buildSchema([]), /at least one field/);
  assert.throws(() => buildSchema([{ name: 'اسم' }]), /English letters/);
  assert.throws(() => buildSchema([{ name: 'Total' }, { name: 'total' }]), /more than once/);
  assert.throws(() => buildSchema(Array.from({ length: 51 }, (_, i) => ({ name: `f${i}` }))), /50 fields/);
});

test('unknown types fall back to text', () => {
  assert.deepEqual(buildSchema([{ name: 'x', type: 'weird' }]).properties.x, { type: 'string', title: 'x' });
});
