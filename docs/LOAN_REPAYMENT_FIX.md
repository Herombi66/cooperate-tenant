# Loan Repayment Validation Fix

## Issue Description
Users were unable to record repayments for "Active" loans. The system returned an error message: "Cannot record repayment for a loan that is not disbursed".

## Root Cause Analysis
The issue stemmed from overly strict validation logic in the `LoanRepaymentController`.

1.  **Validation Gap**: The `createLoanRepayment` function explicitly checked if `loan.status === 'disbursed'`.
2.  **Status Mismatch**: The system uses multiple statuses to represent a loan that has been paid out:
    - `disbursed`: The loan funds have been sent to the user.
    - `active`: The loan is currently running (often synonymous with disbursed in terms of eligibility for repayment).
    - `defaulted`: The loan is past due but still outstanding.
3.  **The Bug**: Valid `active` loans were rejected because the controller did not recognize `active` as a repayable status.

## Resolution
The validation logic in `backend/controllers/loanRepaymentController.js` was updated to allow repayment for both `disbursed` and `active` statuses.

### Code Change
**File:** `backend/controllers/loanRepaymentController.js`

```javascript
// Before
if (loan.status !== 'disbursed') { ... }

// After
if (!['disbursed', 'active'].includes(loan.status)) { ... }
```

### Additional Updates
1.  **Loan Search Consistency**: Updated `backend/controllers/loanController.js` to ensure that searching for `status=active` returns both `active` and `disbursed` loans, providing a consistent view for administrators.
2.  **Reports Consistency**: Updated `backend/controllers/reportsController.js` (specifically `getComplianceReport`) to count `active`, `disbursed`, and `defaulted` loans as "disbursed" for reporting purposes.

## Verification
A new unit test suite was created in `backend/tests/repayment_validation_test.js` to verify:
- Repayment is accepted for `active` loans.
- Repayment is accepted for `disbursed` loans.
- Data integrity is maintained.

## Prevention
To prevent future regressions:
- Always use the inclusive status check `['disbursed', 'active']` when validating loan operations that require a running loan.
- Run `node backend/tests/repayment_validation_test.js` before deploying changes to loan controllers.
