# ScribeTools integrations

Connectors for [ScribeTools](https://scribetools.com): OCR, editable Word documents, tables, translation and
custom data extraction for Arabic-script and multilingual PDFs and images.

| Folder | What | Status |
|---|---|---|
| [n8n-nodes-scribetools](https://github.com/ssraza21/n8n-nodes-scribetools) (own repo) | n8n community node (action + trigger), on npm | Submitted for n8n verification |
| [`zapier/`](zapier) | Zapier app (Zapier Platform CLI) | Ready for `zapier push` |
| [`make/`](make) | Make custom app (local development format) | Ready to deploy with the Make Apps VS Code extension |
| [`mcp/`](mcp) | MCP Registry entry for `https://mcp.scribetools.com/mcp` | Ready for `mcp-publisher publish` |
| [`templates/`](templates) | Step-by-step guides for the three starter workflows | Docs |

Every connector is a thin client of the public API (`https://api.scribetools.com/api/v1`). Pricing, pipelines
and permissions live on the server. Authentication is a ScribeTools API key (`st_live_...`), created under
**Settings → API keys** on a paid account. Each connector sends `X-ScribeTools-Client: <name>/<version>` so
usage can be counted by channel.

## API used

Full reference: [API.md](API.md) (machine-readable: [openapi.json](openapi.json)).

- `GET /me`: test a connection and label it.
- `POST /upload-urls`, then `PUT` to the signed URL: upload a file (n8n, Make).
- `POST /outcome-jobs` with `sources: [{url}]`: let ScribeTools fetch a public file (Zapier).
- `callback_url` on job creation: ScribeTools POSTs a signed `outcome_job.finished` event once.
- `GET /outcome-jobs`, `GET /outcome-jobs/{id}`, `GET /outcome-jobs/{id}/results`.
- `GET …/results/{result_id}/content`: TXT or JSON results up to 1 MiB, inline.
- `GET …/results/{result_id}/download`: a 5-minute signed link (never sent the API key).

## Tests

```bash
(cd zapier && npm ci && npm test && npx zapier-platform validate)
```

MIT licensed.
