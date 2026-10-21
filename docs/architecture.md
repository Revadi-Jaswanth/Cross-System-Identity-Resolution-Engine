# System Architecture & Security Specification

This document details the architectural guidelines, database configuration mappings, and security strategies of VeriSync.

---

## 1. Architectural Strategy

The system uses a decoupled, three-tier model utilizing a **Model-View-Controller (MVC)** layout on the backend with a clean separating layer for **Repositories** and **Services**.

```
    [Client (React SPA)] 
             │
             ▼ (JWT Authenticated HTTP REST)
    [Blueprints (Controllers)]
             │
             ▼ 
     [Services Layer] ◄───► [Security / RapidFuzz Engine]
             │
             ▼ 
    [Repository Layer] 
             │
             ▼ (SQLAlchemy ORM)
       [MySQL DB]
```

- **Blueprints / Controllers**: Handle endpoint mappings, request validation, exception mapping, and response formats.
- **Middleware**: Intercepts requests to validate JWT authorization, records system-wide audit logs, and formats runtime errors.
- **Services Layer**: Coordinates business processes, calls security utilities, invokes the matching engine, and orchestrates transaction logic.
- **Security Utilities**: Custom implementations of SHA-256 + Pepper, user authentication controls, and AES-256 decryption wrappers.
- **RapidFuzz Engine**: Specialized module for fuzzy string matching on unencrypted attributes. Runs in memory, never on the DB.
- **Repository Layer**: Separates business logic from database schema structures. Serves as the query builder for underlying database operations.
- **Models**: Standard class declarations mapping schema definitions directly to the MySQL database tables.

---

## 2. Core Security & Encryption Strategy

To protect Personally Identifiable Information (PII) while facilitating high-performance entity resolution, we implement three distinct security boundaries:

```
  Attribute Type        Security Protocol         Storage State
┌─────────────────────┐┌────────────────────────┐┌───────────────┐
│ User Passwords      ││ bcrypt Hashing          ││ Hashed (slow) │
└─────────────────────┘└────────────────────────┘└───────────────┘
┌─────────────────────┐┌────────────────────────┐┌───────────────┐
│ Identifiers         ││ Deterministic SHA-256  ││ Hashed        │
│ (Aadhaar, ABHA,     ││ + Server-Side Pepper   ││ (one-way)     │
│ Phone, Email, etc.) ││                        ││               │
└─────────────────────┘└────────────────────────┘└───────────────┘
┌─────────────────────┐┌────────────────────────┐┌───────────────┐
│ Sensitive Text      ││ Application-Level      ││ Ciphertext    │
│ (Name, Address, DOB)││ AES-256 Encryption     ││ (VARBINARY)   │
└─────────────────────┘└────────────────────────┘└───────────────┘
```

### A. Administrative User Authentication
- **Algorithm**: `bcrypt` (with standard salt rounds, typically 12).
- **Scope**: User account passwords for dashboard administrators.
- **Rationale**: `bcrypt` is slow and resource-intensive, which makes it resistant to brute-force attacks on passwords. It is not suitable for high-volume identity resolution lookups.

### B. Deterministic Identity Hash Resolution
- **Algorithm**: **SHA-256** with a secret server-side **Pepper** (`PEPPER_SECRET`).
- **Scope**: Primary identity identifiers:
  - Aadhaar Numbers
  - ABHA ID Numbers
  - DigiLocker ID Strings
  - Mobile Numbers
  - Email Addresses
- **Implementation**:
  $$\text{Hash} = \text{SHA256}(\text{Raw Identifier} \parallel \text{PEPPER\_SECRET})$$
- **Rationale**:
  - Hashing allows these values to remain confidential.
  - Using a standard salt would make it impossible to resolve the same identity across different data ingest systems because the salt would differ.
  - A server-side pepper provides a uniform secret value across all systems. Without the `PEPPER_SECRET`, an attacker cannot brute-force the SHA-256 hashes even if they obtain a copy of the database.
  - **Rules**: Identifiers MUST be normalized (e.g. lowercase, remove spaces, hyphens, and country prefixes) before applying the pepper and hashing.

### C. Application-Level Symmetric Encryption
- **Algorithm**: **AES-256-GCM** (Galois/Counter Mode) or **AES-256-CBC** with a unique initialization vector (IV) per field.
- **Scope**: Sensitive descriptive PII:
  - Full Names (`full_name_encrypted` stored as `VARBINARY(512)`)
  - Addresses (`address_encrypted` stored as `VARBINARY(1024)`)
  - Dates of Birth (`date_of_birth_encrypted` stored as `VARBINARY(128)`)
- **Key Management**: Keys are generated from an environment master key (`AES_MASTER_KEY`) using PBKDF2 with a salt, or loaded directly from a secure HSM / Key Vault (e.g. AWS KMS, HashiCorp Vault).
- **Matching Execution**:
  - The database contains only binary ciphertext.
  - During fuzzy matching, candidate rows are fetched by matching deterministic hashes (e.g. sharing mobile hash or email hash).
  - The application layer decrypts Name and Address inputs *in memory* using the AES key.
  - Decrypted plaintext is passed into the `RapidFuzz` similarity calculations. Plaintext is never written to log files or temp files.

---

## 3. SQL Indexing Strategy & Justifications

To achieve millisecond-level lookups for identity clustering operations, the following indexes are declared:

### A. Deterministic Identifiers
- **Columns**: `identities(aadhaar_hash)`, `identities(abha_hash)`, `identities(digilocker_hash)`, `identities(mobile_hash)`, `identities(email_hash)`.
- **Justification**:
  - When a record is ingested, the engine queries the database to see if any hashed identifier already exists.
  - Adding single indexes on each column ensures that queries look up matches in $O(1)$ index seek time instead of performing full-table scans ($O(N)$).

### B. Composite Performance Indexes
- **Columns**: `identities(system_source, status)`.
- **Justification**:
  - Optimizes search queries that fetch all records from a specific system (e.g. "DigiLocker") that are currently active.
  - Prevents query planners from scanning deleted or inactive rows.

### C. Soft Delete Filtering Indexes
- **Columns**: `identities(status, deleted_at)`.
- **Justification**:
  - Almost every query filters for active records (`status = 'ACTIVE' AND deleted_at IS NULL`).
  - Including this index ensures that the query engine filters active records efficiently before joining or processing data.

---

## 4. Normalization and 3NF Explanation

The database design adheres to the **Third Normal Form (3NF)** rules to prevent update anomalies and remove redundancies:

1. **First Normal Form (1NF)**:
   - All columns hold atomic values. Multi-valued fields (e.g., lists of roles or historical linkages) are stored in dedicated rows.
   - Primary Keys (`id`, `uuid`) uniquely identify each row.
2. **Second Normal Form (2NF)**:
   - Every non-key attribute is fully dependent on the primary key, rather than on a subset of a composite key.
   - Many-to-many relationships (e.g., users mapping to roles and roles mapping to permissions) are split into bridge tables: `user_roles` and `role_permissions`.
3. **Third Normal Form (3NF)**:
   - There are no **transitive dependencies**. Every non-key attribute depends only on the primary key, and not on another non-key attribute.
   - User definitions reference `organization_id` instead of duplicating organization details (such as names or routing codes) in user rows.
   - Cluster link history is moved to `identity_links`, separating current state from historical changes.

---

## 5. Scalability Considerations

As the volume of ingested records grows into tens of millions, the following strategies are proposed:

### A. Read/Write Replication
- Set up a master database write node alongside multiple read replicas.
- Ingestion services perform `INSERT` and `UPDATE` operations on the master node.
- Dashboard queries, analytics, and verification searches (which read hashes and metadata) are routed to read replica nodes to reduce load on the master node.

### B. Table Partitioning
- **Table**: `identities`.
- **Strategy**: Partition by Hash on `cluster_id` or Range partitioning on `created_at`.
- **Justification**: Partitioning on `cluster_id` distributes records evenly across partitions. For audit tables (`audit_logs`, `activity_logs`), partition by Range on `created_at` monthly. This allows old partitions to be dropped or archived without lock escalation.

### C. Audit Log Archiving
- **Table**: `audit_logs`, `login_history`, `activity_logs`.
- **Strategy**: Use cron jobs or event listeners to move logs older than 90 days to cold storage (e.g., Amazon S3 Glacier, Snowflake, or an archival database).
- **Benefit**: Keeps transactional tables small and indexes responsive, maintaining fast query execution times.

### D. Sharding Strategy
- **Key**: `cluster_id` or `organization_id`.
- **Justification**:
  - When database size exceeds single-node storage limits, horizontal sharding can be introduced.
  - Sharding on `organization_id` is suitable for multi-tenant deployments, keeping all organization data isolated on a single shard.
  - Sharding on `cluster_id` is better for global data, distributing clusters across nodes while keeping related identities co-located.
