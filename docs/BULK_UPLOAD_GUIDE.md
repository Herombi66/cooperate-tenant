# Bulk Upload Operational Guide

## Overview
The bulk upload functionality allows administrators to upload member contributions via CSV or Excel files. The system processes each row, validates data, and creates contribution records in the database.

## Supported File Formats
- **CSV (.csv)**
- **Excel (.xlsx, .xls)**

## File Structure
The file must contain a header row. Column names are case-insensitive.

### Required Columns
| Column Name (Aliases) | Description | Example |
|-----------------------|-------------|---------|
| `PSN`, `Member_ID`, `ID` | The Personal Subhead Number of the member. | `ADMIN001` |
| `Month`, `Period` | The month of contribution (Name or Number). | `January`, `Jan`, `1` |
| `Year` | The year of contribution. | `2025` |
| `Total Amount`, `Amount`, `Total` | The total contribution amount. | `5000` |

### Optional Columns
| Column Name | Description | Example |
|-------------|-------------|---------|
| `Type` | Specific contribution type (`Savings`, `Investment`, `Target`). If provided, the Amount is applied ONLY to this type. | `Savings` |
| `Payment Method` | Method of payment. Defaults to 'cash'. | `Bank Transfer` |

## Processing Logic
1.  **Validation:**
    *   Checks for existence of Member (by PSN).
    *   Validates numeric Amount.
    *   Validates Month/Year.

2.  **Duplicate Handling:**
    *   The system allows **multiple contributions per member within the same month**.
    *   Each valid row creates a **new** contribution record, even if the member already has contributions for the same Month/Year.

3.  **Error Handling:**
    *   Rows with missing required fields are skipped and logged.
    *   Rows with invalid data (e.g., negative amount) are skipped.
    *   System creates a transaction for each row to ensure data integrity.

4.  **Fee Application:**
    *   Registration fee applies only to the member’s first-ever contribution.
    *   Monthly admin fee applies at most once per member per month; additional contributions in the same month do not re-apply the monthly fee.

## Troubleshooting
- **"No member found with PSN"**: Verify the PSN in the file matches exactly with the database.
- **"Total amount must be a positive number"**: Check for non-numeric characters in the Amount column.
- **timeout**: For very large files (>1000 rows), split the file into smaller chunks.

## Database Integrity
- Each row processing is atomic.
- Partial success is allowed (valid rows are imported, invalid rows are reported).
