'use strict';

const { API_BASE, CLIENT_HEADER } = require('./constants');

const isApi = (url) => typeof url === 'string' && url.startsWith(API_BASE);

// The API key goes only to ScribeTools; signed storage links never see it.
const addApiKey = (request, z, bundle) => {
  if (isApi(request.url)) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.apiKey}`;
    request.headers['X-ScribeTools-Client'] = CLIENT_HEADER;
    request.headers.Accept = 'application/json';
  }
  return request;
};

// Surface the API's {detail: {code, message}} as a readable Zap error.
const handleErrors = (response, z) => {
  if (!isApi(response.request.url) || response.status < 400) return response;
  let detail = {};
  try {
    detail = (response.json || JSON.parse(response.content || '{}')).detail || {};
  } catch (err) {
    detail = {};
  }
  const message = typeof detail === 'object' && detail.message ? detail.message : `ScribeTools returned HTTP ${response.status}.`;
  const code = typeof detail === 'object' && detail.code ? detail.code : `http_${response.status}`;
  if (response.status === 401) {
    throw new z.errors.Error(`${message} Check the API key in this connection.`, 'AuthenticationError', 401);
  }
  if (response.status === 429) {
    throw new z.errors.ThrottledError(message, Number(response.getHeader('retry-after')) || 60);
  }
  throw new z.errors.Error(message, code, response.status);
};

module.exports = { addApiKey, handleErrors, isApi };
