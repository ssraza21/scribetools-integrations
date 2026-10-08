'use strict';

const { API_BASE } = require('./lib/constants');

module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      helpText:
        'Create an API key in ScribeTools under **Settings → API keys** ([open settings](https://scribetools.com/studio/settings)). Keys are available on paid accounts.',
    },
  ],
  test: { url: `${API_BASE}/api/v1/me`, method: 'GET' },
  connectionLabel: '{{json.email}}',
};
