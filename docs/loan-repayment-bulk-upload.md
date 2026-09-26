# Loan Repayment Bulk Upload

## Overview

This module adds a tracked, auditable bulk upload flow for loan repayments using Excel files.

Key features:

- Excel import: `.xlsx` and `.xls` up to 10MB
- Client-side validation with real-time per-row progress
- Server-side integrity validation (loan/member lookups, duplicates, balance checks)
- Upload history with search/filters
- Failed-row dashboard with actionable errors (row, column, suggestion)
- Download failed rows as an Excel error report for correction and re-upload
- Approval flow to verify pending repayments in a batch
- Rollback support for failed/unapproved batches with audit logging

## Who Can Do What

Role permissions in this module:

- View: Admin, Super Admin, Chairman, Treasurer, Secretary, Manager, Operator, Viewer
- Upload: Admin, Super Admin, Chairman, Treasurer, Secretary, Manager, Operator
- Approve: Admin, Super Admin, Chairman, Treasurer, Manager
- Rollback: Admin, Super Admin

## Excel Template (Required Columns)

The upload accepts the first sheet in the workbook. Column names are case-insensitive and whitespace-tolerant.

Required:

- One of: `Loan_ID` or `PSN` or `Contributor_ID`
- `Repayment_Amount`
- `Repayment_Date` (DD/MM/YYYY)

Optional:

- `Payment_Method` (cash, bank_transfer, salary_deduction, mobile_money, cheque, contribution_deduction)
- `Notes`

Example row:

| Loan_ID | PSN   | Contributor_ID | Repayment_Amount | Repayment_Date | Payment_Method  | Notes            |
|--------:|-------|----------------|-----------------:|----------------|-----------------|------------------|
| 123     | MEM01 |                | 5000             | 05/03/2026     | bank_transfer   | March repayment  |

## Server Validation Rules

For each row:

- Loan lookup:
  - `Loan_ID` must exist, OR
  - `PSN` / `Contributor_ID` must match an existing member, then the newest eligible loan is selected (status in `disbursed`, `active`, `defaulted`).
- Contributor mismatch check:
  - If `Contributor_ID` is provided, it must match the loan’s `user_id`.
- Amount:
  - Must be a positive number.
  - Must not exceed the remaining balance (based on verified repayments vs. `total_repayment`).
- Date:
  - Must be strictly `DD/MM/YYYY` and represent a valid calendar date.
- Duplicate prevention:
  - Blocks duplicates inside the same file (same loan, date, amount).
  - Blocks duplicates already in the system (same loan, date, amount) for pending/verified repayments.

## Processing and Tracking

- Each upload creates an `upload_batches` record (`type = loan_repayments_import`).
- Failed rows are stored in `upload_record_errors` with:
  - row number, record key, error code, message, and `fields` (includes column and suggestion)
  - original `raw_record` for error-report export
- Created repayments are stored as `pending` and tagged with `loan_repayments.upload_batch_id`.

## Approval and Rollback

Approval:

- Approve endpoint marks all `pending` repayments in the batch as `verified`.
- Before changing anything, loan statuses are backed up into `upload_batch_backups` (so rollbacks can be audited later).

Rollback:

- Rollback is allowed only for batches that have no verified repayments (i.e., failed/unapproved batches).
- Rollback deletes all repayments created by that batch (`upload_batch_id = :id`).
- Rollback always writes an audit log entry with user, timestamp, IP address, and batch metadata.

## API Endpoints

Loan repayment bulk upload:

- `POST /loan-repayments/bulk-upload-v2` (multipart form field: `file`)
- `POST /loan-repayments/bulk-upload-batches/:id/approve`
- `POST /loan-repayments/bulk-upload-batches/:id/rollback`

Bulk upload tracking (shared dashboard):

- `GET /bulk-uploads?type=&status=&q=` (history list; supports searching)
- `GET /bulk-uploads/:id/errors` (row-level errors)
- `GET /bulk-uploads/:id/errors.xlsx` (failed rows only; re-upload-friendly)
- `GET /bulk-uploads/:id/errors.csv` (legacy CSV export)

