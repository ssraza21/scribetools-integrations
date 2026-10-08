it('builds a schema from fields', () => {
	assert.deepStrictEqual(extractionSchema([{ name: 'Invoice Number' }, { name: 'Total', type: 'number' }]), {
		type: 'object',
		properties: {
			invoice_number: { type: 'string', title: 'Invoice Number' },
			total: { type: 'number', title: 'Total' }
		},
		required: [],
		additionalProperties: false
	});
});
