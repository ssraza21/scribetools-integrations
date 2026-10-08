'use strict';

const { API_BASE, TERMINAL_STATES } = require('../lib/constants');

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/api/v1/outcome-jobs`,
    method: 'GET',
    params: { page: 1, page_size: 50 },
  });
  const wanted = bundle.inputData.states && bundle.inputData.states.length ? bundle.inputData.states : ['completed', 'partial'];
  return (response.data.jobs || [])
    .filter((job) => TERMINAL_STATES.includes(job.state) && wanted.includes(job.state) && job.completed_at)
    .sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1))
    .map((job) => ({ id: `${job.job_id}:${job.state}`, ...job }));
};

module.exports = {
  key: 'job_finished',
  noun: 'Job',
  display: { label: 'Job Finished', description: 'Triggers when a ScribeTools job finishes.' },
  operation: {
    inputFields: [
      {
        key: 'states',
        label: 'Finished States',
        list: true,
        choices: { completed: 'Completed', partial: 'Partially completed', failed: 'Failed', cancelled: 'Cancelled' },
        helpText: 'Defaults to completed and partially completed jobs.',
      },
    ],
    perform,
    sample: {
      id: '3f1c2a9e-5b7d-4e2a-9c1b-0d8e7f6a5b4c:completed',
      job_id: '3f1c2a9e-5b7d-4e2a-9c1b-0d8e7f6a5b4c',
      name: 'Invoice scan',
      outcome: 'extract_text',
      format: 'txt',
      state: 'completed',
      created_at: '2026-10-07T10:00:00+00:00',
      completed_at: '2026-10-07T10:03:00+00:00',
    },
    outputFields: [
      { key: 'job_id', label: 'Job ID' },
      { key: 'outcome', label: 'Outcome' },
      { key: 'state', label: 'State' },
      { key: 'completed_at', label: 'Finished At', type: 'datetime' },
    ],
  },
};
