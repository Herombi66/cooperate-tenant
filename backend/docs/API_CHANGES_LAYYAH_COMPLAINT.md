# API Documentation: Layyah and Complaint Module Enhancements

This document outlines the changes made to the Layyah and Complaint modules to support seasonal program toggling and PSN (Personal Subhead Number) capture.

## 1. Layyah Module Enhancements

### Seasonal Program Toggle
The Layyah module now includes server-side validation to prevent application submission when the seasonal program is disabled.

- **Endpoint**: `POST /layyah/applications`
- **Endpoint**: `POST /layyah/groups/:id/join`
- **Validation**: Checks the `layyah_seasonal_program_enabled` setting in the database.
- **Behavior**: If the setting is `false`, returns `403 Forbidden` with a clear message:
  - `"The Layyah seasonal program is currently closed. Applications are not being accepted at this time."`
  - `"The Layyah seasonal program is currently closed. Group join requests are not being accepted at this time."`

### PSN Capture
Every Layyah application now automatically captures and stores the applicant's PSN.

- **Storage**: Stored in the `user_psn` column of the `layyah_applications` table.
- **Source**: Retrieved from the user's `MembershipApplication` record via association.

## 2. Complaint Module Enhancements

### PSN Capture
Every complaint submission now automatically captures and stores the submitting member's PSN.

- **Endpoint**: `POST /complaints`
- **Storage**: Stored in the `user_psn` column of the `complaints` table.
- **Source**: Retrieved from the authenticated user's `MembershipApplication` (accessible via `req.user.membershipApplication.psn`).

## 3. Database Schema Updates

The following changes were applied to the database schema:

### `layyah_applications` table
- Added `user_psn` (VARCHAR(50)) column.
- Added index `idx_layyah_user_psn` for performance.

### `complaints` table
- Added `user_psn` (VARCHAR(50)) column.
- Added index `idx_complaints_user_psn` for performance.

## 4. Verification

Integration tests have been added in `backend/tests/layyah_complaint_verification.test.js` to verify:
1. Layyah applications are blocked when the program is OFF.
2. Layyah applications are allowed when the program is ON and PSN is captured.
3. Complaint submissions successfully capture and store the PSN.
