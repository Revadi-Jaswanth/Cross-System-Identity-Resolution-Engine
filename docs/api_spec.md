# VeriSync API Specifications

This document defines the REST API endpoints, routing prefixes, headers, payloads, and response envelopes for VeriSync.

---

## 1. Request Envelope & Standardization

Every API response follows a unified JSON envelope schema:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {},
  "error": null,
  "timestamp": "2026-07-08T18:00:00.000000Z",
  "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

---

## 2. Authentication Endpoints (`/api/auth`)

Refer to the Authentication documentation for login, logout, refresh rotation, and password reset endpoints.

---

## 3. Organizations Management Endpoints (`/api/v1/organizations`)

### A. List Organizations
- **Method / Route**: `GET /api/v1/organizations`
- **Permissions**: `user:read` claim AND role `SUPER_ADMIN`
- **Query Parameters**:
  - `page` (default 1): Integer page number.
  - `page_size` (default 10): Integer page limit.
  - `search` (optional): Matches name or code using SQL LIKE.
  - `status` (optional): Filters by status state (`ACTIVE`, `INACTIVE`).
  - `sort_by` (default `created_at`): Col names (`name`, `code`, `created_at`, `status`).
  - `sort_order` (default `desc`): Direction (`asc`, `desc`).
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Organizations list retrieved successfully.",
    "data": {
      "organizations": [
        {
          "id": 1,
          "uuid": "ca1a88bb-83df-4929-aefb-b81b29d49e1f",
          "name": "Authority Root",
          "code": "NIA_ROOT",
          "status": "ACTIVE",
          "created_at": "2026-07-07T12:00:00Z",
          "version": 1
        }
      ],
      "metadata": {
        "page": 1,
        "page_size": 10,
        "total_records": 1,
        "total_pages": 1,
        "has_next": false,
        "has_prev": false
      }
    },
    "error": null,
    "timestamp": "2026-07-08T18:00:00.000000Z",
    "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```

### B. Create Organization
- **Method / Route**: `POST /api/v1/organizations`
- **Permissions**: `user:write` claim AND role `SUPER_ADMIN`
- **Request Body**:
  ```json
  {
    "name": "Partner Agency Three",
    "code": "PARTNER_THREE"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Organization successfully created.",
    "data": {
      "uuid": "33b129a0-f8cc-4dcf-8e99-ad10e9cf41d9",
      "name": "Partner Agency Three",
      "code": "PARTNER_THREE",
      "status": "ACTIVE",
      "version": 1
    },
    "error": null,
    "timestamp": "2026-07-08T18:00:00.000000Z",
    "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```

### C. Update Organization
- **Method / Route**: `PUT /api/v1/organizations/<uuid>`
- **Permissions**: `user:write` claim AND active tenant scope matching target Organization ID.
- **Request Body**:
  ```json
  {
    "name": "Partner Agency Three Updated",
    "version": 1
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Organization successfully updated.",
    "data": {
      "uuid": "33b129a0-f8cc-4dcf-8e99-ad10e9cf41d9",
      "name": "Partner Agency Three Updated",
      "code": "PARTNER_THREE",
      "status": "ACTIVE",
      "version": 2
    },
    "error": null,
    "timestamp": "2026-07-08T18:00:00.000000Z",
    "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```
- **Error (409 Conflict - Stale Version Check)**:
  ```json
  {
    "success": false,
    "message": "Database record has been modified by another transaction. Please reload.",
    "data": null,
    "error": {
      "code": "ConflictException",
      "message": "Database record has been modified by another transaction. Please reload."
    },
    "timestamp": "2026-07-08T18:00:00.000000Z",
    "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```

### D. Bulk Update Organization Status
- **Method / Route**: `POST /api/v1/organizations/bulk-status`
- **Permissions**: `user:write` claim AND role `SUPER_ADMIN`
- **Request Body**:
  ```json
  {
    "uuids": [
      "33b129a0-f8cc-4dcf-8e99-ad10e9cf41d9",
      "d5d36e8b-4a5f-4d9f-bf2a-12e3e5b6c2d1"
    ],
    "status": "INACTIVE"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Bulk organization status update completed.",
    "data": {
      "processed": 2,
      "updated": 1,
      "skipped": 1,
      "failed": 0,
      "results": [
        {
          "uuid": "33b129a0-f8cc-4dcf-8e99-ad10e9cf41d9",
          "status": "UPDATED",
          "reason": "Status changed successfully."
        },
        {
          "uuid": "d5d36e8b-4a5f-4d9f-bf2a-12e3e5b6c2d1",
          "status": "SKIPPED",
          "reason": "Organization is already INACTIVE."
        }
      ]
    },
    "error": null,
    "timestamp": "2026-07-08T18:00:00.000000Z",
    "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```

---

## 4. Users Management Endpoints (`/api/v1/users`)

### A. List Users
- **Method / Route**: `GET /api/v1/users`
- **Permissions**: `user:read` claim.
- **Filters**:
  - `status` (optional): `ACTIVE`, `INACTIVE`, `LOCKED`, `PENDING`.
  - `role` (optional): `SUPER_ADMIN`, `ORG_ADMIN`, etc.
  - `organization_id` (optional): Only Super Admins can pass foreign IDs.
  - `mfa_enabled` (optional): `true`, `false`.
  - `created_after` (optional): ISO Date.
  - `created_before` (optional): ISO Date.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Users list retrieved successfully.",
    "data": {
      "users": [
        {
          "id": 2,
          "uuid": "ea2a88bb-83df-4929-aefb-b81b29d49e1f",
          "username": "operator1",
          "email": "operator1@test.gov.in",
          "organization_id": 1,
          "status": "ACTIVE",
          "avatar_url": "https://cdn.platform.gov/avatars/user1.png",
          "mfa_enabled": false,
          "roles": ["INGEST_OPERATOR"],
          "version": 1,
          "created_at": "2026-07-07T12:00:00Z"
        }
      ],
      "metadata": {
        "page": 1,
        "page_size": 10,
        "total_records": 1,
        "total_pages": 1,
        "has_next": false,
        "has_prev": false
      }
    },
    "error": null,
    "timestamp": "2026-07-08T18:00:00.000000Z",
    "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```

### B. Create Operator User
- **Method / Route**: `POST /api/v1/users`
- **Permissions**: `user:write` claim.
- **Request Body**:
  ```json
  {
    "username": "operator2",
    "email": "operator2@test.gov.in",
    "organization_id": 1,
    "roles": ["INGEST_OPERATOR"]
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Operator user account created successfully.",
    "data": {
      "uuid": "44b129a0-f8cc-4dcf-8e99-ad10e9cf41d9",
      "username": "operator2",
      "email": "operator2@test.gov.in",
      "organization_id": 1,
      "roles": ["INGEST_OPERATOR"],
      "version": 1
    },
    "error": null,
    "timestamp": "2026-07-08T18:00:00.000000Z",
    "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```

### C. Update User Profile
- **Method / Route**: `PUT /api/v1/users/<uuid>`
- **Permissions**: `user:write` claim OR self user context.
- **Request Body**:
  ```json
  {
    "email": "operator2_updated@test.gov.in",
    "avatar_url": "https://images.platform/avatars/op2.png",
    "version": 1
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "User profile updated successfully.",
    "data": {
      "uuid": "44b129a0-f8cc-4dcf-8e99-ad10e9cf41d9",
      "username": "operator2",
      "email": "operator2_updated@test.gov.in",
      "status": "ACTIVE",
      "avatar_url": "https://images.platform/avatars/op2.png",
      "version": 2
    },
    "error": null,
    "timestamp": "2026-07-08T18:00:00.000000Z",
    "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```

### D. Bulk Delete Users
- **Method / Route**: `POST /api/v1/users/bulk-delete`
- **Permissions**: `user:write` claim.
- **Request Body**:
  ```json
  {
    "uuids": [
      "44b129a0-f8cc-4dcf-8e99-ad10e9cf41d9",
      "ea2a88bb-83df-4929-aefb-b81b29d49e1f"
    ]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Bulk user deletion completed.",
    "data": {
      "processed": 2,
      "updated": 1,
      "skipped": 1,
      "failed": 0,
      "results": [
        {
          "uuid": "44b129a0-f8cc-4dcf-8e99-ad10e9cf41d9",
          "status": "DELETED",
          "reason": "User deleted successfully."
        },
        {
          "uuid": "ea2a88bb-83df-4929-aefb-b81b29d49e1f",
          "status": "SKIPPED",
          "reason": "User is already deleted."
        }
      ]
    },
    "error": null,
    "timestamp": "2026-07-08T18:00:00.000000Z",
    "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```
