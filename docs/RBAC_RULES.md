# Role-Based Access Control (RBAC) Rules for Contributions

## Overview
This document outlines the Role-Based Access Control (RBAC) system implemented to ensure that contributions are only assigned to appropriate user roles. Specifically, it prevents Executive roles (Chairman, Treasurer, Secretary) from receiving contributions directly, enforcing the use of their "Regular Member" accounts for financial transactions.

## Role Hierarchy & Restrictions

The system distinguishes between **Executive Roles** and **Regular Member Roles**.

### Restricted Roles (Executive)
Users with these roles **CANNOT** receive contributions (Savings, Investment, Target Savings).
- `chairman`
- `treasurer`
- `secretary`

### Allowed Roles (Member)
Users with these roles **CAN** receive contributions.
- `member` (Regular Member)

## Contribution Assignment Rules

1.  **Validation at Entry Point**:
    - Every attempt to create a contribution (Single Entry or Bulk Upload) triggers a role validation check.
    - The system checks the `role` of the target user associated with the provided PSN.

2.  **Enforcement Logic**:
    - If `user.role` is in the `['chairman', 'treasurer', 'secretary']` list:
        - The transaction is **BLOCKED**.
        - An error is returned: `403 Forbidden` (API) or a descriptive error message (Bulk Upload).
        - Message: `"Skipped: {role} accounts cannot receive contributions"` or `"Contributions are not allowed for {role} accounts. Please use the regular member account."`

3.  **Multiple Accounts per PSN**:
    - The system supports multiple User accounts for a single PSN (`membership_application_id`).
    - **Executive User**: One account with `role = 'chairman'` (or treasurer/secretary). Used for administrative tasks.
    - **Member User**: Another account with `role = 'member'`. Used for personal contributions.
    - **Action Required**: When assigning contributions, the system must target the User ID corresponding to the `member` role, NOT the executive role. *Note: Current implementation blocks the executive role. Admins/Scripts must ensure they target the correct User ID associated with the PSN that has the 'member' role.*

## Error Handling

| Scenario | HTTP Status | Error Message |
| :--- | :--- | :--- |
| API: Create Contribution for Chairman | `403 Forbidden` | `Contributions are not allowed for chairman accounts. Please use the regular member account.` |
| Bulk Upload: Row for Chairman | (Row Skipped) | `Skipped: chairman accounts cannot receive contributions` |

## Backward Compatibility
- **Regular Members**: No changes. All existing functionalities remain the same.
- **Executives**: Must ensure they have a separate `member` account for their personal contributions. If they only have an executive account, a new `member` account must be created for them to receive funds.

## Technical Implementation
- **Controller**: `backend/controllers/contributionController.js`
- **Tests**: `backend/tests/rbac_contribution_test.js`
- **Logic**:
  ```javascript
  const RESTRICTED_ROLES = ['chairman', 'treasurer', 'secretary'];
  if (RESTRICTED_ROLES.includes(user.role)) {
      return res.status(403).json({ ... });
  }
  ```

---

## State Auditor Role (Read-Only Audit Access)

### Role Name
- `state_auditor`

### Access Scope
- Read-only access to core audit and reporting surfaces, including:
  - Reports endpoints under `/reports/*` (financial, members, loans, expenses, profit sharing, compliance, financial tracking)
  - Member statements: `/reports/member-statement` (JSON, `format=csv`, `format=pdf`)
  - General ledger summary: `/reports/general-ledger` (JSON, `format=csv`)
  - System activity logs: `/dashboard/activity-logs`
  - Member directory and financial profile (read-only): `/members`, `/members/:id`, `/members/:id/financial-profile`

### Restrictions (Integrity Controls)
- The State Auditor role is blocked from creating, modifying, approving, rejecting, or deleting financial records, member data, and system configuration.
- Write operations are rejected with `403` unless they are limited to personal account maintenance (password/profile update).

### Audit Logging
- All relevant actions performed by a State Auditor are logged in `ActivityLog` with action `state_auditor_view` and request context metadata (path + query).
