'use strict';

const { API_BASE, INLINE_FORMATS, TERMINAL_STATES } = require('./constants');

const jobUrl = (jobId) => `${API_BASE}/api/v1/outcome-jobs/${encodeURIComponent(jobId)}`;

// Called by Zapier when a later step needs the file bytes.
const downloadResult = async (z, bundle) => {
  const { jobId, resultId } = bundle.inputData;
  const response = await z.request({
    url: `${jobUrl(jobId)}/results/${encodeURIComponent(resultId)}/download`,
    method: 'GET',
  });
  const link = response.data;
  const file = z.request({ url: link.url, method: 'GET', raw: true });
  return z.stashFile(file, link.size_bytes || undefined, link.filename, String(link.media_type).split(';')[0]);
};

// A finished job with its results: file fields plus inline text/data.
const finishedJob = async (z, jobId) => {
  const status = (await z.request({ url: jobUrl(jobId), method: 'GET' })).data;
  if (!TERMINAL_STATES.includes(status.state)) {
    throw new z.errors.Error(`Job ${jobId} is still ${status.state}.`, 'job_not_finished', 409);
  }
  if (status.state === 'failed' || status.state === 'cancelled') {
    const reason = (status.errors || []).map((e) => e.message).join('; ');
    throw new z.errors.Error(`ScribeTools job ${status.state}${reason ? `: ${reason}` : '.'}`, `job_${status.state}`, 422);
  }
  const listing = (await z.request({ url: `${jobUrl(jobId)}/results`, method: 'GET' })).data;
  const results = [];
  for (const result of listing.results || []) {
    const entry = {
      ...result,
      file: z.dehydrateFile(downloadResult, { jobId, resultId: result.result_id }),
    };
    if (INLINE_FORMATS.includes(result.format)) {
      const content = await z.request({
        url: `${jobUrl(jobId)}/results/${encodeURIComponent(result.result_id)}/content`,
        method: 'GET',
        skipThrowForStatus: true,
      });
      if (content.status === 200) {
        entry.text = content.data.text;
        entry.data = content.data.data;
      }
    }
    results.push(entry);
  }
  const first = results[0] || {};
  return {
    ...status,
    results,
    file: first.file || null,
    filename: first.filename || null,
    text: first.text === undefined ? null : first.text,
    data: first.data === undefined ? null : first.data,
  };
};

module.exports = { downloadResult, finishedJob, jobUrl };
