# ScribeTools for Zapier

Zapier Platform CLI app. Auth: ScribeTools API key (custom auth, tested with `GET /api/v1/me`, connection label
is the account email).

- **Process Document** (create): passes the file to ScribeTools as a source URL, registers a Zapier callback
  URL, and resumes when ScribeTools reports the job finished. Returns the result file, plus `text` for text
  results.
- **Extract Custom Data** (create): build the fields as line items (name, type, instructions) or paste a JSON
  Schema. Returns each field at the top level for mapping, plus the JSON file.
- **Job Finished** (polling trigger), **Find Job** (search), hidden **List Jobs** (dropdown source).

```bash
npm ci
npm test
npx zapier-platform validate
npx zapier-platform login     # owner, once
npx zapier-platform register "ScribeTools"   # once; writes .zapierapprc (not committed)
npx zapier-platform push
```

Publishing review needs a non-expiring test account with paid features for integration-testing@zapier.com (plan
017, phase C).
