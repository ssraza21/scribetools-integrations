# Starter workflows

Three workflows that cover the most common jobs. Each works in Zapier, n8n and Make.

## 1. Folder in, Word or Excel out

*New PDF in a Google Drive (or Dropbox) folder → ScribeTools → save the result next to it.*

| | Zapier | n8n | Make |
|---|---|---|---|
| Trigger | Google Drive: New File in Folder | Google Drive Trigger: File Created | Google Drive: Watch Files in a Folder |
| ScribeTools | Process Document (Editable Word document, or Extract tables) | Document → Process, Wait for Result on | Process a Document → (Watch Finished Jobs in a 2nd scenario) → Download a Result |
| Save | Google Drive: Upload File, File = *Result File* | Google Drive: Upload, binary field `data` | Google Drive: Upload a File |

## 2. Email attachment → tables → Google Sheets

*An invoice or statement arrives by email; its tables or fields land in a sheet.*

- Trigger: Gmail **New Attachment** (Zapier) / Gmail Trigger (n8n) / Gmail **Watch Emails** (Make).
- ScribeTools: **Extract Custom Data** with fields such as *Invoice number*, *Date* (date), *Total* (number),
  or **Extract tables** for whole tables.
- Google Sheets: **Create Spreadsheet Row**, mapping each extracted field to a column.

## 3. Form upload → translation → email

*Someone uploads a document on a form; they receive the English translation.*

- Trigger: Typeform / Google Forms / Tally **New Entry** with a file upload field.
- ScribeTools: **Process Document**, outcome *Translate document*, language *Arabic* (or *Detect
  automatically*), translate into *English*.
- Gmail / Outlook: **Send Email** with the *Result File* attached.

Every run uses pages from the connected ScribeTools account (one page per page processed).
