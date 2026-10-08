# ScribeTools API reference

Status: generated from the frozen public contract (`backend/openapi/public-api.json`) as of 2026-10-08.

Base URL: `https://api.scribetools.com/api/v1`. Authenticate with `Authorization: Bearer st_live_...` (create a key in ScribeTools → Settings → API keys; paid accounts). Optional `X-ScribeTools-Client: <name>/<version>` identifies your integration.

Errors are JSON `{"detail": {"code": "...", "message": "..."}}` with the HTTP status (401 credentials, 402 out of pages, 403 plan/limits, 404 not found or not yours, 409 idempotency conflict, 413 too large to read inline, 422 invalid request, 429 rate limited with `Retry-After`).

## Typical flow

1. `GET /outcomes`: pick an outcome and its options.
2. Either `POST /upload-urls` and PUT each file to its signed URL, or skip uploading and pass `sources: [{"url": "https://..."}]` to step 3.
3. `POST /outcome-jobs` with an `idempotency_key` (UUID). Optional `callback_url` gets one signed POST when the job finishes.
4. Poll `GET /outcome-jobs/{job_id}` (honour `Retry-After`) or wait for the callback.
5. `GET /outcome-jobs/{job_id}/results`, then `.../download` (5-minute signed link) or `.../content` (TXT/JSON up to 1 MiB inline).

Custom data extraction options: `output_schema` (JSON Schema object) or `fields: [{"name", "type": text|number|integer|date|boolean, "instructions"}]`.

## Endpoints

### `GET /api/v1/me`

**Get Account**

Who this credential belongs to, its plan and pages.

Integrations use it to test a connection and label it.

Response 200: `Account` with `auth_method`, `email`, `pages`, `plan`, `tier_key`

### `GET /api/v1/outcome-jobs`

**List Outcome Jobs**

Your jobs, newest first.

Parameters: `page` (query), `page_size` (query)

Response 200: `OutcomeJobList` with `jobs`, `page`, `page_size`, `total`

### `POST /api/v1/outcome-jobs`

**Create Outcome Job**

Create a job by outcome name. The server builds the pipeline.

Request body `CreateOutcomeJobRequest`:

- `callback_url`: string (optional). Public https URL to POST to once when the job finishes (completed, partial, failed or cancelled). Signed with callback_secret; carries ids and state only.
- `format`: string (optional). Result format; one of the outcome's formats. Defaults to its default_format.
- `gcs_uris`: array of string (optional). gs:// URIs returned by POST /api/v1/upload-urls. Send this or sources, not both.
- `idempotency_key` (required): string. Client-generated id for this submission. Retrying with the same key and request returns the same job; the same key with a different request is a 409.
- `name`: string (optional).
- `options`: object. Outcome options; see the outcome's options_schema.
- `outcome` (required): string. An id from GET /api/v1/outcomes.
- `sources`: array of SourceURL (optional). Files to fetch from public https URLs instead of uploading them. Send this or gcs_uris.

Response 200: `OutcomeJobCreated` with `callback_secret`, `created`, `credits_reserved`, `format`, `job_id`, `outcome`, `state`

Response 201: `OutcomeJobCreated` with `callback_secret`, `created`, `credits_reserved`, `format`, `job_id`, `outcome`, `state`

### `GET /api/v1/outcome-jobs/{job_id}`

**Get Outcome Job**

Compact status. While not terminal, Retry-After says when to poll again.

Parameters: `job_id` (path)

Response 200: `OutcomeJobStatus` with `completed_at`, `created_at`, `credits_charged`, `credits_reserved`, `errors`, `format`, `items`, `job_id`, `name`, `outcome`, `progress`, `state`, `terminal`, `total_error_count`

### `POST /api/v1/outcome-jobs/{job_id}/cancel`

**Cancel Outcome Job**

Cancel a running job. Completed steps' output stays and is charged;
unused holds are released. Cancelling a finished job changes nothing.

Parameters: `job_id` (path)

Response 200: `OutcomeJobStatus` with `completed_at`, `created_at`, `credits_charged`, `credits_reserved`, `errors`, `format`, `items`, `job_id`, `name`, `outcome`, `progress`, `state`, `terminal`, `total_error_count`

### `GET /api/v1/outcome-jobs/{job_id}/results`

**List Outcome Job Results**

One result per completed file. Listing never renders or charges.

Parameters: `job_id` (path)

Response 200: `OutcomeJobResults` with `job_id`, `pending_items`, `results`, `state`, `terminal`

### `GET /api/v1/outcome-jobs/{job_id}/results/{result_id}/content`

**Read Outcome Job Result Content**

A TXT or JSON result's content, up to 1 MiB.

For automation steps that map extracted text or fields directly. Other
formats and larger results are download-only.

Parameters: `job_id` (path), `result_id` (path)

Response 200: `ResultContent` with `data`, `format`, `media_type`, `result_id`, `size_bytes`, `text`

### `GET /api/v1/outcome-jobs/{job_id}/results/{result_id}/download`

**Download Outcome Job Result**

A short-lived signed URL for one result.

DOCX/XLSX/CSV are rendered on the first download and reused after that;
on plans with a free-export allowance the first download of each such
result uses one export.

Parameters: `job_id` (path), `result_id` (path)

Response 200: `ResultDownload` with `expires_at`, `filename`, `format`, `media_type`, `result_id`, `size_bytes`, `url`

### `GET /api/v1/outcomes`

**List Outcomes**

Response 200: `OutcomeCatalog` with `outcomes`

### `POST /api/v1/upload-urls`

**Get Upload Urls**

Generate signed URLs for direct GCS uploads. Session or API key.

Request body `UploadUrlsRequest`:

- `file_infos`: array of UploadFileInfo (optional). Per-file upload metadata. Preferred over files/file_pages because it is stable when multiple files have the same filename.
- `file_pages`: object (optional). Map of filename to page count
- `file_sizes`: object (optional). Map of filename to file size in bytes
- `files`: array of string. List of filenames to upload
- `idempotency_key`: string (optional). Client-generated submission id. Reusing it returns stable upload paths and allows job creation to collapse request replays.

Response 200: `UploadUrlsResponse` with `batch_id`, `urls`

