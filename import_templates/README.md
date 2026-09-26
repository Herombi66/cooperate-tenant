# Loan Import Templates

Use these templates to import loans in bulk.

## CSV Format
- **PSN**: The member's Personal Subhead Number (must exist in the system).
- **Type**: "cash" or "investment".
- **Amount**: The loan amount (numeric).
- **Period**: Repayment period in months (numeric).

## Notes
- Cash loans are capped at 100,000.
- Investment loans require the member to have sufficient investment balance (3x).
- Rows with invalid PSNs or validation errors will be skipped and reported in the error log.
