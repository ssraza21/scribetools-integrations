'use strict';

const { finishedJob, jobUrl } = require('../lib/results');
const { TERMINAL_STATES } = require('../lib/constants');

const perform = async (z, bundle) => {
  const response = await z.request({ url: jobUrl(bundle.inputData.job_id), method: 'GET', skipThrowForStatus: true });
  if (response.status === 404) return [];
  response.throwForStatus();
  const status = response.data;
  const withResults = ![false, 'false', 'no', 'False'].includes(bundle.inputData.with_results);
  if (withResults && TERMINAL_STATES.includes(status.state) && ['completed', 'partial'].includes(status.state)) {
    return [{ id: status.job_id, ...(await finishedJob(z, status.job_id)) }];
  }
  return [{ id: status.job_id, ...status }];
};

module.exports = {
  key: 'find_job',
  noun: 'Job',
  display: { label: 'Find Job', description: 'Finds a ScribeTools job by ID, optionally with its result files.' },
  operation: {
    inputFields: [
      { key: 'job_id', label: 'Job', required: true, dynamic: 'list_jobs.id.label', helpText: 'Pick a job or map a Job ID from an earlier step.' },
      { key: 'with_results', label: 'Include Results', type: 'boolean', default: 'yes', helpText: 'Attach result files and text when the job has finished.' },
    ],
    perform,
    sample: {
      id: '3f1c2a9e-5b7d-4e2a-9c1b-0d8e7f6a5b4c',
      job_id: '3f1c2a9e-5b7d-4e2a-9c1b-0d8e7f6a5b4c',
      state: 'completed',
      outcome: 'extract_text',
      format: 'txt',
      credits_charged: 2,
    },
  },
};
