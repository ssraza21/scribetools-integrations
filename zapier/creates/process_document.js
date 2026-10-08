'use strict';

const { randomUUID } = require('crypto');

const { API_BASE, LANGUAGE_CHOICES, OUTCOME_CHOICES } = require('../lib/constants');
const { finishedJob } = require('../lib/results');

const sample = {
  job_id: '3f1c2a9e-5b7d-4e2a-9c1b-0d8e7f6a5b4c',
  state: 'completed',
  outcome: 'editable_document',
  format: 'docx',
  name: 'Invoice scan',
  credits_charged: 2,
  progress: { total: 1, completed: 1, failed: 0, queued: 0, processing: 0, cancelled: 0 },
  file: 'SAMPLE FILE',
  filename: 'invoice.docx',
  text: null,
  data: null,
  results: [
    {
      result_id: '7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d',
      item_id: 1,
      source_filename: 'invoice.pdf',
      format: 'docx',
      kind: 'export',
      filename: 'invoice.docx',
      media_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size_bytes: null,
      file: 'SAMPLE FILE',
    },
  ],
};

const perform = async (z, bundle) => {
  const { outcome, language, target_language: targetLanguage, translation_instructions: instructions } = bundle.inputData;
  const options = {};
  if (language && language !== 'auto') options.language = language;
  if (outcome === 'translation') {
    options.target_language = targetLanguage || 'eng';
    if (instructions) options.translation_instructions = instructions;
  }
  const body = {
    outcome,
    sources: [{ url: bundle.inputData.file, ...(bundle.inputData.filename ? { filename: bundle.inputData.filename } : {}) }],
    idempotency_key: randomUUID(),
    options,
    callback_url: z.generateCallbackUrl(),
  };
  if (bundle.inputData.format) body.format = bundle.inputData.format;
  if (bundle.inputData.job_name) body.name = bundle.inputData.job_name;
  const response = await z.request({ url: `${API_BASE}/api/v1/outcome-jobs`, method: 'POST', body });
  return response.data;
};

// ScribeTools POSTs {event, job_id, state, ...} to the callback URL when the
// job finishes; fetch the results then.
const performResume = async (z, bundle) => {
  const jobId = (bundle.cleanedRequest && bundle.cleanedRequest.job_id) || bundle.outputData.job_id;
  return finishedJob(z, jobId);
};

module.exports = {
  key: 'process_document',
  noun: 'Document',
  display: {
    label: 'Process Document',
    description:
      'Turns a PDF or image into an editable Word file, text, tables, a translation, a searchable PDF or an eBook. Waits until the job finishes.',
  },
  operation: {
    inputFields: [
      {
        key: 'file',
        label: 'File',
        type: 'file',
        required: true,
        helpText: 'A PDF or image (PNG, JPEG, TIFF, BMP), from an earlier step or a public https link.',
      },
      { key: 'outcome', label: 'Outcome', required: true, choices: OUTCOME_CHOICES, default: 'editable_document', altersDynamicFields: true },
      { key: 'language', label: 'Document Language', choices: LANGUAGE_CHOICES, default: 'auto' },
      function translationFields(z, bundle) {
        if (bundle.inputData.outcome !== 'translation') return [];
        const targets = { ...LANGUAGE_CHOICES };
        delete targets.auto;
        return [
          { key: 'target_language', label: 'Translate Into', choices: targets, default: 'eng', required: true },
          { key: 'translation_instructions', label: 'Translation Instructions', type: 'text', helpText: 'Optional guidance such as register or terminology.' },
        ];
      },
      function formatField(z, bundle) {
        const formats = { editable_document: ['docx', 'xlsx'], table_extraction: ['xlsx', 'csv'] }[bundle.inputData.outcome];
        if (!formats) return [];
        return [{ key: 'format', label: 'Result Format', choices: formats, helpText: `Defaults to ${formats[0]}.` }];
      },
      { key: 'filename', label: 'File Name', helpText: 'Optional. Used to name the result.' },
      { key: 'job_name', label: 'Job Name', helpText: 'Optional. Shown in your ScribeTools jobs.' },
    ],
    perform,
    performResume,
    sample,
    outputFields: [
      { key: 'job_id', label: 'Job ID' },
      { key: 'state', label: 'State' },
      { key: 'file', label: 'Result File', type: 'file' },
      { key: 'filename', label: 'Result File Name' },
      { key: 'text', label: 'Text (text results)' },
      { key: 'credits_charged', label: 'Pages Charged', type: 'integer' },
    ],
  },
};
