# Database Schema (ERD)

This document contains a comprehensive Entity Relationship Diagram (ERD) demonstrating the relational schemas, primary/foreign keys, and cardinalities.

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : "contains"
    ORGANIZATIONS ||--o{ API_KEYS : "issues"
    ORGANIZATIONS ||--o{ IDENTITIES : "ingests"
    ORGANIZATIONS ||--o{ AUDIT_LOGS : "audits"
    ORGANIZATIONS ||--o{ VERIFICATION_REQUESTS : "initiates"

    ROLES ||--|{ USER_ROLES : "assigned_to"
    USERS ||--|{ USER_ROLES : "possesses"
    ROLES ||--|{ ROLE_PERMISSIONS : "authorized_with"
    PERMISSIONS ||--|{ ROLE_PERMISSIONS : "grants"

    USERS ||--o{ REFRESH_TOKENS : "requests"
    USERS ||--o{ PASSWORD_RESET_TOKENS : "requests"
    USERS ||--o{ API_KEYS : "creates"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ ACTIVITY_LOGS : "performs"
    USERS ||--o{ LOGIN_HISTORY : "tracks"
    USERS ||--o{ VERIFICATION_REQUESTS : "submits"
    USERS ||--o{ AUDIT_LOGS : "performs"

    IDENTITY_CLUSTERS ||--o{ IDENTITIES : "clusters"
    IDENTITY_CLUSTERS ||--o{ IDENTITY_LINKS : "tracks_from"
    IDENTITY_CLUSTERS ||--o{ IDENTITY_LINKS : "tracks_to"
    IDENTITY_CLUSTERS ||--o{ VERIFICATION_RESULTS : "referenced_in"

    IDENTITIES ||--o{ IDENTITY_LINKS : "tracks_linkage"

    VERIFICATION_REQUESTS ||--|| VERIFICATION_RESULTS : "produces"

    ORGANIZATIONS {
        int id PK
        char uuid UK
        varchar name
        varchar code UK
        varchar status
        timestamp created_at
        int created_by FK
        timestamp updated_at
        int updated_by FK
        timestamp deleted_at
        int deleted_by FK
        int version
    }

    ROLES {
        int id PK
        char uuid UK
        varchar name UK
        varchar description
        timestamp created_at
        int created_by FK
        timestamp updated_at
        int updated_by FK
        int version
    }

    PERMISSIONS {
        int id PK
        char uuid UK
        varchar name UK
        varchar description
        timestamp created_at
        int created_by FK
        timestamp updated_at
        int updated_by FK
        int version
    }

    ROLE_PERMISSIONS {
        int role_id PK, FK
        int permission_id PK, FK
    }

    USERS {
        int id PK
        char uuid UK
        int organization_id FK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar status
        timestamp created_at
        int created_by FK
        timestamp updated_at
        int updated_by FK
        timestamp deleted_at
        int deleted_by FK
        int version
    }

    USER_ROLES {
        int user_id PK, FK
        int role_id PK, FK
    }

    REFRESH_TOKENS {
        int id PK
        char uuid UK
        int user_id FK
        varchar token_hash UK
        timestamp expires_at
        tinyint is_revoked
        timestamp created_at
    }

    PASSWORD_RESET_TOKENS {
        int id PK
        char uuid UK
        int user_id FK
        varchar token_hash UK
        timestamp expires_at
        tinyint is_used
        timestamp created_at
    }

    API_KEYS {
        int id PK
        char uuid UK
        int organization_id FK
        int user_id FK
        varchar name
        varchar key_hash UK
        varchar status
        timestamp expires_at
        timestamp created_at
        int created_by FK
        timestamp updated_at
        int updated_by FK
        timestamp deleted_at
        int deleted_by FK
        int version
    }

    IDENTITY_CLUSTERS {
        int id PK
        char uuid UK
        varchar status
        timestamp created_at
        int created_by FK
        timestamp updated_at
        int updated_by FK
        timestamp deleted_at
        int deleted_by FK
        int version
    }

    IDENTITIES {
        int id PK
        char uuid UK
        int cluster_id FK
        int organization_id FK
        varchar system_source
        varchar system_uid
        varchar status
        char aadhaar_hash UK, INDEX
        char abha_hash UK, INDEX
        char digilocker_hash UK, INDEX
        char mobile_hash INDEX
        char email_hash INDEX
        varbinary full_name_encrypted "AES-256"
        varbinary address_encrypted "AES-256"
        varbinary date_of_birth_encrypted "AES-256"
        varchar gender
        timestamp created_at
        int created_by FK
        timestamp updated_at
        int updated_by FK
        timestamp deleted_at
        int deleted_by FK
        int version
    }

    IDENTITY_LINKS {
        int id PK
        char uuid UK
        int identity_id FK
        int from_cluster_id FK
        int to_cluster_id FK
        varchar link_type
        varchar reason
        timestamp created_at
        int created_by FK
        timestamp updated_at
        int updated_by FK
        int version
    }

    VERIFICATION_REQUESTS {
        int id PK
        char uuid UK
        int organization_id FK
        int requested_by FK
        varchar status
        varchar request_signature
        timestamp created_at
        int created_by FK
        int version
    }

    VERIFICATION_RESULTS {
        int id PK
        char uuid UK
        int verification_request_id FK
        int matched_cluster_id FK
        decimal match_score
        varchar matched_attributes
        timestamp created_at
    }

    NOTIFICATIONS {
        int id PK
        char uuid UK
        int user_id FK
        varchar title
        text message
        tinyint is_read
        timestamp created_at
    }

    ACTIVITY_LOGS {
        int id PK
        int user_id FK
        varchar activity_type
        varchar description
        varchar ip_address
        timestamp created_at
    }

    AUDIT_LOGS {
        bigint id PK
        int organization_id FK
        int user_id FK
        varchar action
        varchar target_table
        int target_id
        json old_value
        json new_value
        varchar ip_address
        timestamp created_at
    }

    LOGIN_HISTORY {
        int id PK
        int user_id FK
        varchar ip_address
        varchar user_agent
        varchar status
        timestamp created_at
    }

    SYSTEM_SETTINGS {
        int id PK
        char uuid UK
        varchar setting_key UK
        text setting_value
        varchar description
        timestamp created_at
        int created_by FK
        timestamp updated_at
        int updated_by FK
        int version
    }
```

---

## 3NF Normalization Mapping Explanation

To achieve **Third Normal Form (3NF)**, the database layout complies with three core rules:

1. **First Normal Form (1NF)**:
   - All columns contain atomic values (e.g. no comma-separated arrays of emails or nested JSON objects representing multiple phone numbers in `identities`).
   - Every table contains a unique primary key identification key (`id` and `uuid`).
2. **Second Normal Form (2NF)**:
   - The tables comply with 1NF.
   - All non-key fields are fully dependent on the primary key, rather than partial components of a composite key. Bridge tables like `role_permissions` and `user_roles` separate composite mappings so fields are isolated.
3. **Third Normal Form (3NF)**:
   - The tables comply with 2NF.
   - There are **no transitive dependencies**. A non-key attribute does not depend on another non-key attribute. For instance, user credentials do not store organization details (like organization name) directly; they reference the `organization_id` foreign key. Similarly, the permissions are stored in a dedicated `permissions` catalog table and linked via the `role_permissions` bridge rather than duplicating permissions inside user rows.
