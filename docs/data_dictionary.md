# Data Dictionary

This document details the database dictionary for VeriSync.

## Security Classifications

| Classification | Description |
| :--- | :--- |
| **Public** | Public identifiers and settings metadata. Safe for export. |
| **Internal** | System keys, primary/foreign keys, version counts, operational status codes, and trace timestamps. |
| **PII-Hashed** | Personally Identifiable Information stored as a deterministic **SHA-256 + Pepper** hash. |
| **PII-Encrypted** | Personally Identifiable Information stored as **AES-256** ciphertext. |
| **Secret-Hash** | Cryptographic secrets (e.g., passwords or session tokens) stored as secure, non-deterministic hashes (e.g., **bcrypt**). |

---

## 1. Organizations Table (`organizations`)
Stores the operational divisions managing identity ingestion.

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | INT | PRIMARY KEY, AUTO_INCREMENT | Internal | Primary key indicator. |
| **uuid** | CHAR(36) | UNIQUE, NOT NULL | Public | Public UUID for external APIs. |
| **name** | VARCHAR(255) | NOT NULL | Public | Display name of organization. |
| **code** | VARCHAR(100) | UNIQUE, NOT NULL | Public | Alphanumeric organization routing code. |
| **status** | VARCHAR(50) | DEFAULT 'ACTIVE' | Internal | Ingestion lifecycle state: `ACTIVE`, `INACTIVE`, `PENDING`, `DELETED`. |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Ingestion date. |
| **created_by** | INT | FOREIGN KEY (users.id) | Internal | Operator user id who created the entry. |
| **updated_at** | TIMESTAMP | CURRENT_TIMESTAMP ON UPDATE | Internal | Last modification date. |
| **updated_by** | INT | FOREIGN KEY (users.id) | Internal | Operator user id who last modified the entry. |
| **deleted_at** | TIMESTAMP | NULL | Internal | Soft deletion timestamp. |
| **deleted_by** | INT | FOREIGN KEY (users.id) | Internal | User id who deleted the entry. |
| **version** | INT | DEFAULT 1, NOT NULL | Internal | Version counter for optimistic locking. |

---

## 2. Roles Table (`roles`)
System authorization roles (e.g. `SUPER_ADMIN`, `INGEST_OPERATOR`).

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | INT | PRIMARY KEY | Internal | Primary key indicator. |
| **uuid** | CHAR(36) | UNIQUE, NOT NULL | Public | Unique UUID. |
| **name** | VARCHAR(100) | UNIQUE, NOT NULL | Public | Role name key. |
| **description** | VARCHAR(255) | NULL | Public | Role description text. |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Creation date. |
| **created_by** | INT | FOREIGN KEY (users.id) | Internal | Author user. |
| **updated_at** | TIMESTAMP | CURRENT_TIMESTAMP ON UPDATE | Internal | Last modification date. |
| **updated_by** | INT | FOREIGN KEY (users.id) | Internal | Last modifier user. |
| **version** | INT | DEFAULT 1 | Internal | Optimistic lock control version. |

---

## 3. Permissions Table (`permissions`)
System action claims (e.g. `identity:ingest`).

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | INT | PRIMARY KEY | Internal | Primary key indicator. |
| **uuid** | CHAR(36) | UNIQUE, NOT NULL | Public | Unique UUID. |
| **name** | VARCHAR(100) | UNIQUE, NOT NULL | Public | Permission name key. |
| **description** | VARCHAR(255) | NULL | Public | Description. |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Creation date. |
| **created_by** | INT | FOREIGN KEY (users.id) | Internal | Creator user. |
| **updated_at** | TIMESTAMP | CURRENT_TIMESTAMP ON UPDATE | Internal | Last update date. |
| **updated_by** | INT | FOREIGN KEY (users.id) | Internal | Last updater user. |
| **version** | INT | DEFAULT 1 | Internal | Version counter. |

---

## 4. Users Table (`users`)
Administrative panel and API operator credentials.

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | INT | PRIMARY KEY | Internal | Primary key. |
| **uuid** | CHAR(36) | UNIQUE, NOT NULL | Public | Public UUID. |
| **organization_id** | INT | FOREIGN KEY (organizations.id) | Internal | Reference organization. |
| **username** | VARCHAR(100) | UNIQUE, NOT NULL | Public | User nickname. |
| **email** | VARCHAR(150) | UNIQUE, NOT NULL | Public | Operator email contact. |
| **password_hash** | VARCHAR(255) | NOT NULL | Secret-Hash | **bcrypt** password verification hash. |
| **status** | VARCHAR(50) | DEFAULT 'ACTIVE' | Internal | Account lifecycle: `ACTIVE`, `INACTIVE`, `LOCKED`, `DELETED`. |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Creation date. |
| **created_by** | INT | FOREIGN KEY (users.id) | Internal | Manager user who created. |
| **updated_at** | TIMESTAMP | CURRENT_TIMESTAMP ON UPDATE | Internal | Last update date. |
| **updated_by** | INT | FOREIGN KEY (users.id) | Internal | Last updater. |
| **deleted_at** | TIMESTAMP | NULL | Internal | Soft deletion timestamp. |
| **deleted_by** | INT | FOREIGN KEY (users.id) | Internal | Deletion operator. |
| **version** | INT | DEFAULT 1 | Internal | Optimistic locking version. |

---

## 5. API Keys Table (`api_keys`)
Keys used for system-to-system automated data ingestion integrations.

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | INT | PRIMARY KEY | Internal | Primary key. |
| **uuid** | CHAR(36) | UNIQUE, NOT NULL | Public | Public UUID. |
| **organization_id** | INT | FOREIGN KEY (organizations.id) | Internal | Target organization. |
| **user_id** | INT | FOREIGN KEY (users.id) | Internal | Creator owner user. |
| **name** | VARCHAR(100) | NOT NULL | Public | Identifier descriptive name. |
| **key_hash** | VARCHAR(64) | UNIQUE, NOT NULL | Secret-Hash | **SHA-256** hash of the API key string. |
| **status** | VARCHAR(50) | DEFAULT 'ACTIVE' | Internal | Status: `ACTIVE`, `INACTIVE`, `DELETED`. |
| **expires_at** | TIMESTAMP | NULL | Public | Expire limit. |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Ingestion date. |
| **created_by** | INT | FOREIGN KEY (users.id) | Internal | Creator. |
| **updated_at** | TIMESTAMP | CURRENT_TIMESTAMP ON UPDATE | Internal | Last change. |
| **updated_by** | INT | FOREIGN KEY (users.id) | Internal | Last changer. |
| **deleted_at** | TIMESTAMP | NULL | Internal | Soft deletion timestamp. |
| **deleted_by** | INT | FOREIGN KEY (users.id) | Internal | Deletion operator. |
| **version** | INT | DEFAULT 1 | Internal | Lock control. |

---

## 6. Identity Clusters Table (`identity_clusters`)
Master records linking matched identities across systems to represent a unique individual.

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | INT | PRIMARY KEY | Internal | Primary key. |
| **uuid** | CHAR(36) | UNIQUE, NOT NULL | Public | Public unique ID. |
| **status** | VARCHAR(50) | DEFAULT 'ACTIVE' | Internal | Cluster status: `ACTIVE`, `INACTIVE`, `DELETED`. |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Setup timestamp. |
| **created_by** | INT | FOREIGN KEY (users.id) | Internal | Origin user. |
| **updated_at** | TIMESTAMP | CURRENT_TIMESTAMP ON UPDATE | Internal | Updated timestamp. |
| **updated_by** | INT | FOREIGN KEY (users.id) | Internal | Updater user. |
| **deleted_at** | TIMESTAMP | NULL | Internal | Soft delete. |
| **deleted_by** | INT | FOREIGN KEY (users.id) | Internal | Deleter. |
| **version** | INT | DEFAULT 1 | Internal | Concurrency validation number. |

---

## 7. Identities Table (`identities`)
Raw identity records loaded from registries.

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | INT | PRIMARY KEY | Internal | Primary key. |
| **uuid** | CHAR(36) | UNIQUE, NOT NULL | Public | Public unique ID. |
| **cluster_id** | INT | FOREIGN KEY (identity_clusters.id)| Internal | Cluster association link. |
| **organization_id** | INT | FOREIGN KEY (organizations.id) | Internal | Ingesting organization. |
| **system_source** | VARCHAR(100) | NOT NULL | Public | Input source registry (e.g. `Aadhaar`). |
| **system_uid** | VARCHAR(100) | NOT NULL | Public | Non-sensitive source reference code. |
| **status** | VARCHAR(50) | DEFAULT 'ACTIVE' | Internal | Status: `ACTIVE`, `INACTIVE`, `DELETED`. |
| **aadhaar_hash** | CHAR(64) | NULL, INDEX | PII-Hashed | Normalized deterministic **SHA-256 + Pepper** hash. |
| **abha_hash** | CHAR(64) | NULL, INDEX | PII-Hashed | Normalized deterministic **SHA-256 + Pepper** hash. |
| **digilocker_hash**| CHAR(64) | NULL, INDEX | PII-Hashed | Normalized deterministic **SHA-256 + Pepper** hash. |
| **mobile_hash** | CHAR(64) | NULL, INDEX | PII-Hashed | Normalized deterministic **SHA-256 + Pepper** hash. |
| **email_hash** | CHAR(64) | NULL, INDEX | PII-Hashed | Normalized deterministic **SHA-256 + Pepper** hash. |
| **full_name_encrypted**| VARBINARY(512)| NULL | PII-Encrypted | Symmetric **AES-256** encrypted ciphertext bytes. |
| **address_encrypted**| VARBINARY(1024)| NULL | PII-Encrypted | Symmetric **AES-256** encrypted ciphertext bytes. |
| **date_of_birth_encrypted**| VARBINARY(128)| NULL | PII-Encrypted | Symmetric **AES-256** encrypted DOB date bytes. |
| **gender** | VARCHAR(10) | NULL | Public | Cleartext non-sensitive gender descriptor. |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Ingestion date. |
| **created_by** | INT | FOREIGN KEY (users.id) | Internal | Creator. |
| **updated_at** | TIMESTAMP | CURRENT_TIMESTAMP ON UPDATE | Internal | Last update. |
| **updated_by** | INT | FOREIGN KEY (users.id) | Internal | Last updater. |
| **deleted_at** | TIMESTAMP | NULL | Internal | Soft delete. |
| **deleted_by** | INT | FOREIGN KEY (users.id) | Internal | Deleter. |
| **version** | INT | DEFAULT 1 | Internal | Version counter. |

---

## 8. Identity Links Table (`identity_links`)
Audits changes to cluster mappings, including split and merge events.

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | INT | PRIMARY KEY | Internal | Primary key. |
| **uuid** | CHAR(36) | UNIQUE, NOT NULL | Public | Public unique ID. |
| **identity_id** | INT | FOREIGN KEY (identities.id) | Internal | Modified record id. |
| **from_cluster_id**| INT | FOREIGN KEY (identity_clusters.id)| Internal | Previous association cluster. |
| **to_cluster_id** | INT | FOREIGN KEY (identity_clusters.id)| Internal | Target mapping cluster. |
| **link_type** | VARCHAR(50) | NOT NULL | Public | Transaction link type: `AUTO_MERGE`, `MANUAL_MERGE`, `MANUAL_SPLIT`. |
| **reason** | VARCHAR(255) | NULL | Public | Log detail description. |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Action timestamp. |
| **created_by** | INT | FOREIGN KEY (users.id) | Internal | Trigger operator. |
| **updated_at** | TIMESTAMP | CURRENT_TIMESTAMP ON UPDATE | Internal | Update. |
| **updated_by** | INT | FOREIGN KEY (users.id) | Internal | Modifier. |
| **version** | INT | DEFAULT 1 | Internal | Concurrency tracking version. |

---

## 9. Verification Requests Table (`verification_requests`)
Tracks queries submitted to verify identity clusters.

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | INT | PRIMARY KEY | Internal | Primary key. |
| **uuid** | CHAR(36) | UNIQUE, NOT NULL | Public | Public UUID. |
| **organization_id**| INT | FOREIGN KEY (organizations.id) | Internal | Ingesting agency. |
| **requested_by** | INT | FOREIGN KEY (users.id) | Internal | Requesting operator. |
| **status** | VARCHAR(50) | DEFAULT 'PENDING' | Internal | Request lifecycle: `PENDING`, `COMPLETED`, `FAILED`. |
| **request_signature**| VARCHAR(64) | NOT NULL | Internal | **SHA-256** audit checksum of incoming request payload attributes. |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Ingestion date. |
| **created_by** | INT | FOREIGN KEY (users.id) | Internal | Origin operator. |
| **version** | INT | DEFAULT 1 | Internal | Version track. |

---

## 10. Verification Results Table (`verification_results`)
Saves match calculations for verification queries.

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | INT | PRIMARY KEY | Internal | Primary key. |
| **uuid** | CHAR(36) | UNIQUE, NOT NULL | Public | Public UUID. |
| **verification_request_id**| INT | FOREIGN KEY (verification_requests.id) | Internal | Associated request query. |
| **matched_cluster_id** | INT | FOREIGN KEY (identity_clusters.id) | Internal | Cluster matched to. |
| **match_score** | DECIMAL(5,2) | NULL | Public | Score output percentage (e.g. `94.50`). |
| **matched_attributes** | VARCHAR(255) | NULL | Public | List of attributes triggered (e.g., `mobile_hash`). |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Generation timestamp. |

---

## 11. Activity Logs Table (`activity_logs`)
High-level user operations audit trail.

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | INT | PRIMARY KEY | Internal | Primary key. |
| **user_id** | INT | FOREIGN KEY (users.id) | Internal | Actor user. |
| **activity_type** | VARCHAR(100) | NOT NULL | Public | Log classification: `LOGIN`, `INGEST`, `SEARCH`. |
| **description** | VARCHAR(255) | NULL | Public | Event details log. |
| **ip_address** | VARCHAR(45) | NULL | Internal | Client host IP. |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Log timestamp. |

---

## 12. Audit Logs Table (`audit_logs`)
Captures data modifications at the database layer.

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | BIGINT | PRIMARY KEY | Internal | Primary key. |
| **organization_id**| INT | FOREIGN KEY (organizations.id) | Internal | Associated division. |
| **user_id** | INT | FOREIGN KEY (users.id) | Internal | Executing operator. |
| **action** | VARCHAR(100) | NOT NULL | Public | DB event type: `INSERT`, `UPDATE`, `DELETE`. |
| **target_table** | VARCHAR(100) | NOT NULL | Internal | Schema target indicator. |
| **target_id** | INT | NOT NULL | Internal | Database row id target. |
| **old_value** | JSON | NULL | PII-Encrypted | JSON data state before transaction. Sensitive values must be encrypted. |
| **new_value** | JSON | NULL | PII-Encrypted | JSON data state after transaction. Sensitive values must be encrypted. |
| **ip_address** | VARCHAR(45) | NULL | Internal | Operator terminal IP. |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Event timestamp. |

---

## 13. System Settings Table (`system_settings`)
System-wide variables, settings, and thresholds.

| Column | Data Type | Constraints / Default | Classification | Description |
| :--- | :--- | :--- | :--- | :--- |
| **id** | INT | PRIMARY KEY | Internal | Primary key. |
| **uuid** | CHAR(36) | UNIQUE, NOT NULL | Public | Public UUID. |
| **setting_key** | VARCHAR(100) | UNIQUE, NOT NULL | Public | Dynamic config name. |
| **setting_value** | TEXT | NOT NULL | Public | Config value parameter. |
| **description** | VARCHAR(255) | NULL | Public | Description. |
| **created_at** | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Internal | Ingest date. |
| **created_by** | INT | FOREIGN KEY (users.id) | Internal | Creator user. |
| **updated_at** | TIMESTAMP | CURRENT_TIMESTAMP ON UPDATE | Internal | Last update. |
| **updated_by** | INT | FOREIGN KEY (users.id) | Internal | Modifier user. |
| **version** | INT | DEFAULT 1 | Internal | Version tag. |
