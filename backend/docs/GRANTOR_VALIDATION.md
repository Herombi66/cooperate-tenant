# Grantor Validation System Specification

## Overview
This document outlines the technical implementation of the Grantor Validation System for the Loan Application process. The system ensures that all grantors are valid, active members of the cooperative and are eligible to guarantee loans.

## API Endpoint
There are two available endpoints for grantor validation:

1. **GET /members/validate-grantor** (Recommended for Frontend)
   - **Method**: `GET`
   - **Access**: Authenticated Users
   - **Query Params**: `psn` (required)
   - **Response**: `{ success: true, member: { ... } }`

2. **POST /loans/validate-grantor** (Alternative)
   - **Method**: `POST`
   - **Access**: Authenticated Users
   - **Body**: `{ "psn": "..." }`
   - **Response**: `{ success: true, grantor: { ... } }`

Both endpoints perform the same robust validation checks.

### Request Example (GET)
```http
GET /members/validate-grantor?psn=12345
Authorization: Bearer <token>
```

### Validation Rules

1.  **Format Validation**
    -   **Rule**: PSN must match the alphanumeric pattern `^[A-Za-z0-9_]{3,20}$`.
    -   **Error Code**: `INVALID_FORMAT`
    -   **Message**: "Invalid PSN format. Must be 3-20 alphanumeric characters."

2.  **Existence Check**
    -   **Rule**: PSN must exist in the `MembershipApplication` records.
    -   **Error Code**: `PSN_NOT_FOUND`
    -   **Message**: "PSN not found in system."

3.  **User Account Verification**
    -   **Rule**: The PSN must be linked to a valid `User` account.
    -   **Error Code**: `USER_NOT_FOUND`
    -   **Message**: "User account associated with this PSN not found."

4.  **Self-Grantor Restriction**
    -   **Rule**: The Applicant cannot specify their own PSN as a grantor.
    -   **Error Code**: `SELF_GRANTOR`
    -   **Message**: "You cannot be your own grantor."

5.  **Status Check**
    -   **Rule**: Grantor's user account must have `status: 'active'`.
    -   **Error Code**: `GRANTOR_INACTIVE`
    -   **Message**: "Grantor account is not active."

6.  **Eligibility Restriction (Defaulted Loans)**
    -   **Rule**: Grantor must not have any loans with `status: 'defaulted'`.
    -   **Error Code**: `GRANTOR_RESTRICTED`
    -   **Message**: "Grantor is not eligible due to defaulted loans."

### Response Examples

**Success**
```json
{
  "success": true,
  "message": "Grantor is valid.",
  "grantor": {
    "name": "John Doe",
    "psn": "12345_MEMBER",
    "email": "john@example.com",
    "phone": "08012345678"
  }
}
```

**Error**
```json
{
  "success": false,
  "message": "Grantor is not eligible due to defaulted loans.",
  "code": "GRANTOR_RESTRICTED"
}
```

## Error Codes Reference

| Code | Description | Action Required |
| :--- | :--- | :--- |
| `PSN_REQUIRED` | PSN field is missing. | Prompt user to enter PSN. |
| `INVALID_FORMAT` | PSN does not match regex. | Show format requirements to user. |
| `PSN_NOT_FOUND` | PSN not in DB. | Check spelling or verify member status. |
| `USER_NOT_FOUND` | PSN exists but no User account. | Contact admin. |
| `SELF_GRANTOR` | Applicant used their own PSN. | Ask for a different guarantor. |
| `GRANTOR_INACTIVE`| Grantor account suspended/inactive.| Choose another guarantor. |
| `GRANTOR_RESTRICTED`| Grantor has defaulted loans. | Choose another eligible guarantor. |

## Audit Logging
All validation attempts are logged in the `ActivityLog` table with:
-   **Action**: `validate_grantor` (or `validate_grantor_error`)
-   **Resource Type**: `loan`
-   **Description**: Outcome of the validation.
-   **Metadata**: JSON object containing PSN and error details.

## Submission Blocking
The `POST /loans` (create loan) endpoint also performs these checks on the `guarantor_psn` field. If validation fails during submission, the API will return a `400 Bad Request` or `404 Not Found` with the corresponding error message, preventing the creation of the loan application.

## Frontend Implementation Guide
1.  **Real-time Validation**: Call this API on `blur` event of the Grantor PSN input field.
2.  **Loading State**: Show a spinner while the API request is in progress.
3.  **Feedback**:
    -   If valid: Show a checkmark and the Grantor's Name (from response) to confirm identity.
    -   If invalid: Show the error message returned by the API in red below the input.
4.  **Submission Blocking**: Disable the "Submit Application" button if the Grantor PSN field is not validated successfully.
