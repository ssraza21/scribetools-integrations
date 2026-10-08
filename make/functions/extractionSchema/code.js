function extractionSchema(fields, schemaJson) {
	if (schemaJson) return JSON.parse(schemaJson);
	var types = {
		text: { type: 'string' },
		number: { type: 'number' },
		integer: { type: 'integer' },
		date: { type: 'string', format: 'date' },
		boolean: { type: 'boolean' }
	};
	var properties = {};
	(fields || []).forEach(function (field) {
		var title = String(field.name || '').trim();
		if (!title) return;
		var key = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
		if (!key) throw new Error('Field name "' + title + '" needs English letters or digits.');
		if (!/^[a-z]/.test(key)) key = 'f_' + key;
		var property = JSON.parse(JSON.stringify(types[field.type] || types.text));
		property.title = title;
		if (field.instructions) property.description = String(field.instructions).slice(0, 500);
		properties[key.slice(0, 64)] = property;
	});
	if (!Object.keys(properties).length) throw new Error('Add at least one field to extract.');
	return { type: 'object', properties: properties, required: [], additionalProperties: false };
}
