'use strict';

const authentication = require('./authentication');
const { addApiKey, handleErrors } = require('./lib/middleware');
const { downloadResult } = require('./lib/results');
const processDocument = require('./creates/process_document');
const extractCustomData = require('./creates/extract_custom_data');
const jobFinished = require('./triggers/job_finished');
const listJobs = require('./triggers/list_jobs');
const findJob = require('./searches/find_job');

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,
  flags: { cleanInputData: false },
  authentication,
  beforeRequest: [addApiKey],
  afterResponse: [handleErrors],
  hydrators: { downloadResult },
  triggers: { [jobFinished.key]: jobFinished, [listJobs.key]: listJobs },
  searches: { [findJob.key]: findJob },
  creates: { [processDocument.key]: processDocument, [extractCustomData.key]: extractCustomData },
};
