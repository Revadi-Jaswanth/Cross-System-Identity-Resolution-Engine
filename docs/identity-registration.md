# Identity Registration Data Layer Documentation

This document describes the ORM Models, Repository access patterns, interfaces, and validator configurations for the Identity Ingestion & Registration Layer of VeriSync.

---

## 1. Database Model Design (`app/models/identity.py`)

### A. IdentityCluster
Represents a unique physical person in the system, grouping multiple ingested source identities together.
- **uuid** (`VARCHAR(36)`): Universally unique identifier.
- **status** (`VARCHAR(50)`): Current resolution state. Restricted by check constraints:
  - `OPEN`: Cluster initialized; waiting for matching results.
  - `MATCHED`: Cluster linked with active resolved identities.
  - `MERGED`: Cluster merged into another cluster.
  - `LOCKED`: Manually locked by operators during dispute resolutions.
  - `ARCHIVED`: Historic record.
  - `DELETED`: Soft deleted.
- **Audit Columns**: standard auditing fields tracking record creation and modification.

### B. Identity
Represents a single raw administrative identity record ingested from a partner source system (e.g. Aadhaar, ABHA, DigiLocker).
- **uuid** (`VARCHAR(36)`): Unique identifier.
- **cluster_id** (`INT`): Foreign key to the parent `IdentityCluster`.
- **organization_id** (`INT`): Foreign key to the tenant organization which ingested the record.
- **system_source** (`VARCHAR(100)`): Display source name of the ingestion pipeline.
- **system_uid** (`VARCHAR(100)`): Non-PII identifier internal to the source system.
- **status** (`VARCHAR(50)`): lifecycle status:
  - `REGISTERED`: Ingestion completed.
  - `VERIFIED`: Source record verified.
  - `PENDING`: Waiting for resolution checks.
  - `REJECTED`: Disputed or failed criteria.
  - `MERGED`: Associated cluster was merged.
  - `ARCHIVED`: Archived records.
  - `DELETED`: Soft-deleted operator.

#### Cryptographic Hashing Metadata
Used for routing validation and tracking SHA-256 transformations:
- `hash_algorithm` (default `'SHA-256'`)
- `hash_version` (default `'v1'`)

#### Encryption Metadata
- `encryption_algorithm` (default `'AES-256-CBC'`)
- `encryption_key_version` (default `'v1'`)

#### One-Way Deterministic SHA-256 Pepper Hashes
Indexed fields for exact key lookups:
- `aadhaar_hash`
- `abha_hash`
- `digilocker_hash`
- `mobile_hash`
- `email_hash`

#### Application-level Encrypted PII Fields
Ciphertext fields stored as binary datasets:
- `full_name_encrypted` (`VARBINARY(512)`)
- `address_encrypted` (`VARBINARY(1024)`)
- `date_of_birth_encrypted` (`VARBINARY(128)`)

---

## 2. Repositories Layer (`app/repositories/__init__.py`)

We implement a modular repository structure separating interface boundaries for enhanced dependency injection and unit mock testing.

### A. BaseRepository
Provides reusable SQL query structures to prevent duplication:
- `get_by_id(id_val)`: Basic integer PK lookup.
- `get_by_uuid(uuid_str)`: UUID lookups ignoring soft deleted entries.
- `exists(id_val)`: Exists check returning True/False.
- `count()`: Total non-deleted records count.
- `save(entity)`: Persists a record.
- `bulk_insert(entities)`: Inserts lists of records.
- `bulk_soft_delete(uuids, actor_id)`: Performs batch status and `deleted_at` toggles.

### B. IdentityClusterRepository
Concretely implements `IdentityClusterRepositoryInterface`:
- `create_cluster(creator_id)`: Injects and returns a new cluster.

### C. IdentityRepository
Concretely implements `IdentityRepositoryInterface`:
- `find_by_hashed_identifier(identifier_type, hashed_value)`: Resolves an identity record based on hashed key parameters (e.g. `aadhaar`, `abha`).
- `find_by_cluster_id(cluster_id)`: Selects all identities assigned to a cluster.
- `link_to_cluster(identity_id, cluster_id, actor_id)`: Re-assigns parent cluster link.

---

## 3. Validator Requirements (`app/validators/__init__.py`)

The `IdentityValidator` class performs strict structural validations before ingestion processes hit the database:
1. Enforces required fields (`system_source`, `system_uid`, `organization_id`).
2. Enforces correct cryptographic hash structure (exactly 64-character hexadecimal strings matching SHA-256 bounds).
3. Enforces binary payload validation for encrypted fields (checking parameter types match `bytes` or `bytearray`).
4. Rejects invalid lifecycle statuses for identities and clusters.
