# n8n-nodes-scribetools

This is an n8n community node. It lets you use [ScribeTools](https://scribetools.com) in your n8n workflows.

ScribeTools turns scanned and digital documents, with a focus on Arabic-script languages (Arabic, Urdu, Persian),
into editable Word files, plain text, spreadsheets of tables, translations, searchable PDFs, EPUB eBooks, and
structured JSON with the fields you choose.

[Installation](#installation) · [Operations](#operations) · [Credentials](#credentials) · [Compatibility](#compatibility) · [Usage](#usage) · [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n
community nodes documentation. The package name is `n8n-nodes-scribetools`.

## Operations

**ScribeTools** node

- Document → **Process**: upload a PDF or image from a binary field and start a job. With *Wait for Result*
  on, the node waits for the job and returns the result files as binary data, plus `text` (TXT results) or
  `data` (JSON results) on each result. Outcomes: Editable Word Document, Extract Text, Extract Tables,
  Translate Document, Searchable PDF, EPUB eBook, Extract Custom Data (fields from a JSON Schema).
- Job → **Get**, **Get Many**, **Get Results**, **Cancel**
- Result → **Download** (binary), **Get Content** (TXT/JSON as data, up to 1 MiB)
- Account → **Get** (plan and available pages)

**ScribeTools Trigger** node

- Polls for jobs that finished (completed and partially completed by default).

Long documents can take 20 minutes or more. For those, turn *Wait for Result* off and either use the
ScribeTools Trigger in a second workflow, or set *Options → Callback URL* to `{{ $execution.resumeUrl }}` and
follow the node with a **Wait** node set to *On Webhook Call*.

## Credentials

You need a ScribeTools API key. Sign in to ScribeTools, open **Settings → API keys** and create one (API keys
are available on paid accounts). In n8n, create a **ScribeTools API** credential and paste the key. Leave
*API URL* as `https://api.scribetools.com`.

## Compatibility

Built and linted with `@n8n/node-cli` 0.51 against `n8n-workflow` 2.x (n8n 1.x and later). No runtime
dependencies.

## Usage

Example: a **Google Drive Trigger** (new file in a folder) → **Google Drive: Download** → **ScribeTools:
Document → Process** (Editable Word Document) → **Google Drive: Upload** (the `data` binary field) to an
"Output" folder.

Pages are charged as in the ScribeTools app: one page per processed page, held when the job starts and settled
when it finishes. Failed pages are not charged.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [ScribeTools](https://scribetools.com)
- [Workflow templates](https://github.com/ssraza21/scribetools-integrations/tree/main/templates)
