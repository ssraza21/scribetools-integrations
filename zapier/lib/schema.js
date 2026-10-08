'use strict';

// Builds the JSON Schema ScribeTools' custom data extraction accepts from
// simple "field name + type" line items. Keys must match ^[a-z][a-z0-9_]*$.

const MAX_FIELDS = 50;

const TYPES = {
  text: { type: 'string' },
  number: { type: 'number' },
  integer: { type: 'integer' },
  date: { type: 'string', format: 'date' },
  boolean: { type: 'boolean' },
};

class SchemaError extends Error {}

const fieldKey = (name) => {
  const key = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!key) return null;
  return /^[a-z]/.test(key) ? key.slice(0, 64) : `f_${key}`.slice(0, 64);
};

const buildSchema = (fields) => {
  const list = Array.isArray(fields) ? fields.filter((f) => f && String(f.name || '').trim()) : [];
  if (!list.length) throw new SchemaError('Add at least one field to extract.');
  if (list.length > MAX_FIELDS) throw new SchemaError(`Extract at most ${MAX_FIELDS} fields per document.`);
  const properties = {};
  for (const field of list) {
    const title = String(field.name).trim();
    const key = fieldKey(title);
    if (!key) {
      throw new SchemaError(`Field name "${title}" needs English letters or digits (it becomes the JSON key).`);
    }
    if (properties[key]) throw new SchemaError(`Field "${title}" is listed more than once.`);
    const property = { ...(TYPES[field.type] || TYPES.text), title };
    if (field.instructions && String(field.instructions).trim()) {
      property.description = String(field.instructions).trim().slice(0, 500);
    }
    properties[key] = property;
  }
  return { type: 'object', properties, required: [], additionalProperties: false };
};

module.exports = { buildSchema, fieldKey, SchemaError, TYPES };
