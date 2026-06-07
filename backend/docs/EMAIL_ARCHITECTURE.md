# Email Service Architecture & Failover Strategy

## Overview

The IMAN MCS backend implements a robust, multi-provider email service architecture designed to ensure high deliverability and system resilience. The system prioritizes **Brevo (formerly Sendinblue)** as the primary transactional email provider, with automatic failover to **SMTP (Zoho/AWS SES)** in case of API failures or service outages.

## Architecture

### 1. Primary Provider: Brevo (API)
- **Method**: REST API via `sib-api-v3-sdk`.
- **Use Case**: High-volume transactional emails, template management, and detailed analytics.
- **Configuration**: Requires `BREVO_API_KEY` in environment variables.

### 2. Secondary Provider: SMTP (Fallback)
- **Method**: Standard SMTP via `nodemailer`.
- **Use Case**: Backup channel when Brevo is unreachable or disabled.
- **Providers**: Configurable for Zoho Mail, AWS SES, or any standard SMTP server.
- **Configuration**: Uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.

## Failover Mechanism

The `EmailService` class orchestrates the sending process with the following logic:

1.  **Template Compilation**: Handlebars templates are compiled locally to ensure consistent branding regardless of the provider.
2.  **Primary Attempt (Brevo)**:
    - The system checks if Brevo is enabled (`BREVO_API_KEY` exists).
    - If enabled, it attempts to send via the Brevo API.
    - **Success**: The operation completes, and the email is logged with `provider: 'brevo'`.
    - **Failure**: The error is logged, and the system proceeds to step 3.
3.  **Secondary Attempt (SMTP)**:
    - If Brevo fails or is disabled, the system initializes the SMTP transporter.
    - It attempts to send the email via SMTP.
    - **Success**: The operation completes, and the email is logged with `provider: 'smtp'`.
    - **Failure**: The error is logged.
4.  **Final Failure**:
    - If both providers fail, the operation throws an error, and the failure is logged in the database with a detailed `failover_history`.

## Configuration

Ensure the following variables are set in your `.env` file:

```env
# Primary (Brevo)
BREVO_API_KEY=xkeysib-your-api-key

# Secondary (SMTP - Zoho Example)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=admin@imancooperative.org
SMTP_PASS=your-password

# General
EMAIL_FROM=noreply@imanmcs.com
EMAIL_FROM_NAME="IMAN MCS"
```

## Monitoring & Logging

All email attempts are recorded in the `email_logs` table (via `EmailLog` model).

- **Status**: `sent` or `failed`.
- **Metadata**: Contains:
    - `provider`: The provider that successfully sent the email (`brevo` or `smtp`).
    - `failover_history`: An array of errors encountered during the process (e.g., `[{ provider: 'brevo', error: 'Timeout' }]`).

## GDPR Compliance

- **Data Minimization**: Only necessary recipient data (email, name) is transmitted to providers.
- **Processing**: Both Brevo and standard SMTP providers act as data processors.
- **Logging**: Email logs are retained for audit purposes. Ensure your data retention policy addresses these logs.
