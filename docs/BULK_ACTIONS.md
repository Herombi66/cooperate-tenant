# Bulk Loan Actions & Auto-Approval System Documentation

## 1. Technical Documentation

### 1.1 System Architecture Changes
The bulk action system introduces a layer of batch processing logic within the `LoanController`. Key architectural components include:
- **Transactional Integrity**: All bulk operations (`bulkUpdateLoans`, `bulkImportLoans`) are wrapped in Sequelize transactions to ensure atomicity. If a critical failure occurs, the entire batch rolls back (for imports) or partial failures are isolated and reported (for updates).
- **State Machine Validation**: A strict finite state machine enforces valid status transitions (e.g., `pending` -> `waiting_disbursement`, but NOT `rejected` -> `approved`).
- **Audit & Notification Pipeline**: Every status change triggers an `ActivityLog` entry and a `Notification` record creation, decoupled from the core logic but executed within the same transaction context.

### 1.2 API Endpoints

#### **Bulk Status Update**
- **Endpoint**: `POST /loans/bulk-status`
- **Auth**: Required (`admin` or `super_admin`)
- **Request Schema**:
  ```json
  {
    "loanIds": [101, 102, 103],
    "status": "waiting_disbursement", // Enum: "waiting_disbursement" | "rejected"
    "reason": "Policy violation" // Optional
  }
  ```
- **Response Schema**:
  ```json
  {
    "success": true,
    "results": {
      "success": 2,
      "failed": 1,
      "errors": ["Loan #103 cannot be approved (Status: rejected)"]
    }
  }
  ```

#### **Bulk Import**
- **Endpoint**: `POST /loans/bulk-import`
- **Auth**: Required (`admin`)
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: CSV or Excel file
  - `autoApprove`: "true" | "false"
- **Response Schema**:
  ```json
  {
    "success": true,
    "message": "Successfully imported 50 loans",
    "count": 50,
    "failedRows": 0
  }
  ```

### 1.3 Database Schema Modifications
No new tables were created, but usage patterns changed:
- **Loan Table**: 
  - `status`: New flow utilizes `waiting_disbursement` as an intermediate state between `pending` and `disbursed`.
- **ActivityLog Table**:
  - `action_type`: New types `bulk_approved`, `bulk_rejected`, `import_auto_approve`.

### 1.4 Permission Matrix
| Role | View Loans | Bulk Import | Bulk Approve/Reject | Auto-Approve Config |
|------|------------|-------------|---------------------|---------------------|
| Member | Yes (Own) | No | No | No |
| Admin | Yes (All) | Yes | Yes | Yes |
| Super Admin | Yes (All) | Yes | Yes | Yes |

### 1.5 Bulk Upload Auto-Approval Configuration
Auto-approval logic is hardcoded in `loanController.js` to ensure safety, with the following parameters:
- **Eligible Loan Type**: `cash` only (Investment loans require manual review).
- **Amount Threshold**: `<= ₦50,000`.
- **Target Status**: `waiting_disbursement` (Ready for payout).
- **Trigger**: Request body `autoApprove: true`.

---

## 2. Operational Documentation

### 2.1 Troubleshooting Guide

#### **Common Errors**
| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Loan #ID cannot be approved (Status: X)` | Attempting to approve a loan that is not `pending` or `awaiting_admin_review`. | Refresh the loan list to see current statuses. Only pending loans can be approved. |
| `Invalid file type` | Uploading a file other than .csv, .xls, or .xlsx. | Convert data to CSV or standard Excel format. |
| `Member not found with PSN: X` | The PSN in the upload file does not exist in the database. | Verify the member exists in the Users/Members list before import. |
| `Partial Success (X succeeded, Y failed)` | Some loans in the batch failed validation. | Check the error details in the toast notification or console log for specific loan IDs. |

### 2.2 Monitoring Requirements
- **Application Logs**: Monitor for `Bulk update error` or `Import failed` errors in the backend logs.
- **Audit Logs**: Regularly review `ActivityLog` for `bulk_*` actions to ensure authorized usage.
- **Database Performance**: Watch for long-running transactions during large bulk imports (>1000 records).

### 2.3 Performance Considerations
- **Batch Size**: The system processes loans sequentially within a transaction. Recommended max batch size per request is **500 records** to avoid timeout.
- **Concurrency**: Avoid running multiple bulk updates simultaneously on the same set of loans to prevent database lock contention.

### 2.4 Scaling Recommendations
- **Async Processing**: For batches > 1000, move processing to a background queue (e.g., BullMQ) to avoid blocking the HTTP response.
- **Database Indexing**: Ensure `status`, `user_id`, and `approval_date` columns on `Loans` table are indexed for faster filtering during bulk selection.
