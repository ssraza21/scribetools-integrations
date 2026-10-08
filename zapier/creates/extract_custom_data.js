'use strict';

const { randomUUID } = require('crypto');

const { API_BASE } = require('../lib/constants');
const { finishedJob } = require('../lib/results');
const { buildSchema, SchemaError } = require('../lib/schema');

const RESERVED = ['_meta', '_provenance'];

const perform = async (z, bundle) => {
  let schema;
  try {
    schema = bundle.inputData.schema_json ? JSON.parse(bundle.inputData.schema_json) : buildSchema(bundle.inputData.fields);
  } catch (err) {
    if (err instanceof SchemaError) throw new z.errors.Error(err.message, 'invalid_fields', 400);
    throw new z.errors.Error('JSON Schema is not valid JSON.', 'invalid_schema', 400);
  }
  const body = {
    outcome: 'custom_data_extraction',
    sources: [{ url: bundle.inputData.file }],
    idempotency_key: randomUUID(),
    options: { output_schema: schema, extraction_granularity: bundle.inputData.granularity || 'document' },
    callback_url: z.generateCallbackUrl(),
  };
  if (bundle.inputData.job_name) body.name = bundle.inputData.job_name;
  return (await z.request({ url: `${API_BASE}/api/v1/outcome-jobs`, method: 'POST', body })).data;
};

const performResume = async (z, bundle) => {
  const jobId = (bundle.cleanedRequest && bundle.cleanedRequest.job_id) || bundle.outputData.job_id;
  const job = await finishedJob(z, jobId);
  // Put the extracted fields at the top level so later steps can map them.
  const fields = {};
  if (job.data && typeof job.data === 'object' && !Array.isArray(job.data)) {
    for (const [key, value] of Object.entries(job.data)) {
      if (!RESERVED.includes(key)) fields[key] = value;
    }
  }
  return { ...fields, job_id: job.job_id, state: job.state, data: job.data, file: job.file, credits_charged: job.credits_charged };
};

module.exports = {
  key: 'extract_custom_data',
  noun: 'Data',
  display: {
    label: 'Extract Custom Data',
    description: 'Pulls the fields you list (names, dates, totals...) out of a PDF or image as structured data, with the source page for each value.',
  },
  operation: {
    inputFields: [
      { key: 'file', label: 'File', type: 'file', required: true, helpText: 'A PDF or image, from an earlier step or a public https link.' },
      {
        key: 'fields',
        label: 'Fields to Extract',
        children: [
          { key: 'name', label: 'Field Name', required: true, helpText: 'For example "Invoice number". Becomes the output key.' },
          { key: 'type', label: 'Type', choices: { text: 'Text', number: 'Number', integer: 'Whole number', date: 'Date', boolean: 'Yes/No' }, default: 'text' },
          { key: 'instructions', label: 'Instructions', helpText: 'Optional hint, e.g. "the total including VAT".' },
        ],
      },
      {
        key: 'schema_json',
        label: 'JSON Schema (Advanced)',
        type: 'text',
        helpText: 'Optional. A JSON Schema object to use instead of the fields above.',
      },
      { key: 'granularity', label: 'Results', choices: { document: 'One result for the whole document', page: 'One result per page' }, default: 'document' },
      { key: 'job_name', label: 'Job Name', helpText: 'Optional. Shown in your ScribeTools jobs.' },
    ],
    perform,
    performResume,
    sample: {
      invoice_number: 'INV-1042',
      total: 1250.5,
      job_id: '3f1c2a9e-5b7d-4e2a-9c1b-0d8e7f6a5b4c',
      state: 'completed',
      data: { invoice_number: 'INV-1042', total: 1250.5 },
      file: 'SAMPLE FILE',
      credits_charged: 1,
    },
    outputFields: [
      { key: 'job_id', label: 'Job ID' },
      { key: 'state', label: 'State' },
      { key: 'file', label: 'JSON File', type: 'file' },
    ],
  },
};
