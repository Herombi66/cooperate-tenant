# Animal Acquisition Request Management (Admin)

## Overview
This module enables authorized administrators to create Layyah livestock purchase requests on behalf of members, manage request lifecycle, and keep stakeholders informed via real-time updates and email confirmations.

## Architecture
```mermaid
flowchart LR
  UI[AdminAnimalRequestsPage (React)] -->|REST| API[/backend /layyah/purchase-requests/]
  UI -->|REST| Members[/backend /members/]
  UI -->|REST| Catalog[/backend /layyah/catalog/animal-categories/]
  API --> DB[(Postgres: animal_acquisition_requests)]
  API --> Audit[(activity_logs)]
  API --> Mail[EmailService + Handlebars Template]
  API --> WS[Socket.IO Server]
  WS --> UI
```

## Data Model
Table: `animal_acquisition_requests`
- `member_user_id` (FK users.id): target member
- `created_by` (FK users.id): processing administrator who created the request
- `animal_category` (string): selected livestock type
- `quantity` (int): 1–99
- `delivery_start_date`, `delivery_end_date` (date): delivery window
- `reason_html`, `reason_text` (text): sanitized HTML + extracted plaintext for validation/search
- `status`: `draft | pending | approved | rejected`
- `rejection_reason` (text): populated on rejection
- audit timestamps: `created_at`, `updated_at`, `submitted_at`, `approved_at`, `rejected_at`
- soft delete: `deleted_at` (paranoid)

## Authorization (RBAC + Permission)
Permission string: `animal-request-create`
- Backend enforcement: middleware checks `role === admin && can_create_animal_requests === true` (super_admin allowed)
- Frontend enforcement: hides navigation entry and blocks page rendering without permission

DB flag:
- `users.can_create_animal_requests` (boolean)

## REST API
Base path: `/layyah`

### Catalog
- `GET /catalog/animal-categories`
  - Returns: `{ success: true, items: [{ value, label, icon }] }`

### Requests (Admin)
- `GET /purchase-requests?page&limit&status&q`
  - Returns: `{ success, items, pagination }`
- `GET /purchase-requests/:id`
  - Returns: `{ success, item }`
- `POST /purchase-requests`
  - Creates a `draft` request (supports partial fields)
- `PUT /purchase-requests/:id`
  - Updates a `draft` request only
- `POST /purchase-requests/:id/submit`
  - Validates required fields and transitions `draft → pending`
- `POST /purchase-requests/:id/approve`
  - Transitions `pending → approved`
- `POST /purchase-requests/:id/reject`
  - Body: `{ rejection_reason }`, transitions `pending → rejected`
- `DELETE /purchase-requests/:id`
  - Soft-deletes `draft` requests only

## Validation Rules
Client + Server
- Member: required (`member_user_id`)
- Animal type: required on submit
- Quantity: 1–99
- Delivery dates: required on submit, `start <= end`, bounded by UI min/max constraints
- Reason:
  - required on submit
  - max 2000 characters (plaintext)
  - stored as sanitized HTML with limited tags/attributes

## Audit Logging
All request CRUD and state transitions emit entries into `activity_logs` with:
- `user_id`, `user_role`
- `action` (e.g., `animal_request_created`, `animal_request_submitted`, `animal_request_approved`)
- `resource_type = animal_acquisition_request`, `resource_id`
- timestamp and request metadata

## Real-time Updates (WebSocket)
Transport: Socket.IO (authenticated via JWT token)
Event:
- `animal_request_changed`
  - Payload: `{ id, status, event }`
  - Clients refresh list to reflect status progression

## Email Notifications
Template: `backend/templates/animal_request_confirmation.hbs`
- Sent to:
  - requesting member (member email)
  - processing administrator (creator’s email)
- Sent on:
  - submit
  - approve
  - reject

## Deployment
1. Install dependencies:
   - backend: `npm install` (adds `sanitize-html`, `socket.io`)
   - frontend: `npm install` (adds `socket.io-client`)
2. Run backend migrations:
   - `npm run migrate` in `backend/` (runs `db/migrations/*.sql`)
3. Ensure environment variables:
   - `JWT_SECRET` set
   - Email settings as per `backend/config/email.js`
4. Deploy backend + frontend as usual.

## Compliance Notes (GDPR / Privacy / Welfare / Procurement)
- Data minimization: API responses return only required member identity fields for processing.
- Sanitization: rich text reasons are sanitized server-side to prevent injection.
- Traceability: all actions are logged with actor metadata and timestamps.
- Operational controls: approval/rejection requires explicit actions and confirmation prompts in UI.
