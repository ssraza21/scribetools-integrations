# ScribeTools for Make

A Make custom app in the local development format of the
[Make Apps Editor VS Code extension](https://github.com/integromat/vscode-apps-sdk).

- Connection: API key, verified with `GET /api/v1/me` (labelled with the account email; key sanitized in logs).
- Modules: Process a Document, Extract Custom Data, Watch Finished Jobs, Get a Job, List Jobs, Cancel a Job,
  List Results of a Job, Get Result Content, Download a Result, Get Account, Make an API Call.
- No custom IML functions (Make enables them only on request), so plain IML only. Extract Custom Data sends `fields`, and the API builds the JSON Schema.

Upload modules send the file in three requests (upload URL, signed PUT, create job); the API key is sent only to
`api.scribetools.com`, never to the signed storage URL.

Deploy: in VS Code with the Make extension, create the app "ScribeTools" in Make, then *Deploy to Make* from
`makecomapp.json`. Before requesting review, build one test scenario per module (Make's review prerequisite).
