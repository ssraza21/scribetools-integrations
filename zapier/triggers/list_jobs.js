'use strict';

const { API_BASE } = require('../lib/constants');

// Hidden: feeds the Job dropdown in Find Job.
module.exports = {
  key: 'list_jobs',
  noun: 'Job',
  display: { label: 'List Jobs', description: 'Lists your recent ScribeTools jobs.', hidden: true },
  operation: {
    perform: async (z, bundle) => {
      const response = await z.request({
        url: `${API_BASE}/api/v1/outcome-jobs`,
        method: 'GET',
        params: { page: (bundle.meta.page || 0) + 1, page_size: 50 },
      });
      return (response.data.jobs || []).map((job) => ({
        id: job.job_id,
        label: `${job.name || job.outcome} (${job.state}, ${String(job.created_at || '').slice(0, 10)})`,
        ...job,
      }));
    },
    canPaginate: true,
    sample: { id: '3f1c2a9e-5b7d-4e2a-9c1b-0d8e7f6a5b4c', label: 'Invoice scan (completed, 2026-10-07)', job_id: '3f1c2a9e-5b7d-4e2a-9c1b-0d8e7f6a5b4c' },
  },
};
