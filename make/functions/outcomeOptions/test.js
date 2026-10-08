it('builds translation options', () => {
	assert.deepStrictEqual(outcomeOptions('translation', 'urd', 'eng', 'Formal'), {
		language: 'urd',
		target_language: 'eng',
		translation_instructions: 'Formal',
	});
});

it('leaves out auto language and translation fields for other outcomes', () => {
	assert.deepStrictEqual(outcomeOptions('editable_document', 'auto', 'eng', 'x'), {});
});
