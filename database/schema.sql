-- ============================================================================
-- PRODUCTION-READY DATABASE DDL SCHEMA FOR MYSQL 8
-- CROSS-SYSTEM IDENTITY RESOLUTION ENGINE
-- ============================================================================

CREATE DATABASE IF NOT EXISTS identity_resolution;
USE identity_resolution;

-- Disable foreign key checks temporarily during schema initialization
SET FOREIGN_KEY_CHECKS = 0;

-- 1. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    
    -- Audit & Concurrency fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    deleted_at TIMESTAMP NULL,
    deleted_by INT NULL,
    version INT NOT NULL DEFAULT 1,
    
    CONSTRAINT chk_organization_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING', 'DELETED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ROLES
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    
    -- Audit & Concurrency fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    version INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PERMISSIONS
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    
    -- Audit & Concurrency fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    version INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ROLE_PERMISSIONS (Many-to-Many Bridge)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. USERS (Dashboard / Operator administrative accounts)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    organization_id INT NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Bcrypt hash
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    
    -- Lockout & MFA security fields
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL,
    mfa_enabled TINYINT(1) NOT NULL DEFAULT 0,
    mfa_secret VARCHAR(100) NULL,
    avatar_url VARCHAR(255) NULL,
    
    -- Audit & Concurrency fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    deleted_at TIMESTAMP NULL,
    deleted_by INT NULL,
    version INT NOT NULL DEFAULT 1,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT chk_user_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED', 'PENDING', 'DELETED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5a. PASSWORD_HISTORIES (Normalized history tracking for password reuse checks)
CREATE TABLE IF NOT EXISTS password_histories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Bcrypt hash
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5b. JWT_BLOCKLIST (For access token revocation/blacklisting checks)
CREATE TABLE IF NOT EXISTS jwt_blocklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jti VARCHAR(36) NOT NULL UNIQUE, -- Token identifier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. USER_ROLES (Many-to-Many Bridge)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. REFRESH_TOKENS (JWT validation logs)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of refresh token
    expires_at TIMESTAMP NOT NULL,
    is_revoked TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. PASSWORD_RESET_TOKENS
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of recovery token
    expires_at TIMESTAMP NOT NULL,
    is_used TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. API_KEYS
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    organization_id INT NOT NULL,
    user_id INT NOT NULL, -- Created by/Owner user
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 of API key
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP NULL,
    
    -- Audit & Concurrency fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    deleted_at TIMESTAMP NULL,
    deleted_by INT NULL,
    version INT NOT NULL DEFAULT 1,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_api_key_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'DELETED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. IDENTITY_CLUSTERS (Represents a unique physical person)
CREATE TABLE IF NOT EXISTS identity_clusters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    
    -- Audit & Concurrency fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    deleted_at TIMESTAMP NULL,
    deleted_by INT NULL,
    version INT NOT NULL DEFAULT 1,
    
    CONSTRAINT chk_cluster_status CHECK (status IN ('OPEN', 'MATCHED', 'MERGED', 'LOCKED', 'ARCHIVED', 'DELETED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. IDENTITIES (Raw identity records ingested from external sources)
-- PII identifiers are stored as SHA-256 + Pepper hashes.
-- Sensitive descriptive fields are encrypted at the application level using AES-256.
CREATE TABLE IF NOT EXISTS identities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    cluster_id INT NOT NULL,
    organization_id INT NOT NULL,
    system_source VARCHAR(100) NOT NULL, -- e.g. 'Aadhaar', 'ABHA', 'DigiLocker'
    system_uid VARCHAR(100) NOT NULL,    -- Source unique identifier (non-PII context)
    status VARCHAR(50) NOT NULL DEFAULT 'REGISTERED',
    
    -- Source Record Metadata
    source_system VARCHAR(100) NULL,
    source_record_id VARCHAR(100) NULL,
    source_timestamp TIMESTAMP NULL,

    -- Cryptographic Hashing and Encryption Metadata
    hash_algorithm VARCHAR(50) NULL DEFAULT 'SHA-256',
    hash_version VARCHAR(20) NULL DEFAULT 'v1',
    encryption_algorithm VARCHAR(50) NULL DEFAULT 'AES-256-CBC',
    encryption_key_version VARCHAR(20) NULL DEFAULT 'v1',
    
    -- One-Way Deterministic Hashed Identifiers (SHA-256 + Pepper)
    aadhaar_hash CHAR(64) NULL,
    abha_hash CHAR(64) NULL,
    digilocker_hash CHAR(64) NULL,
    mobile_hash CHAR(64) NULL,
    email_hash CHAR(64) NULL,

    -- AES-256 Encrypted descriptive PII strings (Binary Ciphertexts)
    full_name_encrypted VARBINARY(512) NULL,
    address_encrypted VARBINARY(1024) NULL,
    date_of_birth_encrypted VARBINARY(128) NULL,
    
    -- Non-sensitive plaintext context metadata
    gender VARCHAR(10) NULL, 

    -- Audit & Concurrency fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    deleted_at TIMESTAMP NULL,
    deleted_by INT NULL,
    version INT NOT NULL DEFAULT 1,
    
    FOREIGN KEY (cluster_id) REFERENCES identity_clusters(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT chk_identity_status CHECK (status IN ('REGISTERED', 'VERIFIED', 'PENDING', 'REJECTED', 'MERGED', 'ARCHIVED', 'DELETED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. IDENTITY_LINKS (Logs split/merge audit trails of cluster associations)
CREATE TABLE IF NOT EXISTS identity_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    identity_id INT NOT NULL,
    from_cluster_id INT NOT NULL,
    to_cluster_id INT NOT NULL,
    link_type VARCHAR(50) NOT NULL, -- 'AUTO_MERGE', 'MANUAL_MERGE', 'MANUAL_SPLIT'
    reason VARCHAR(255) NULL,
    
    -- Audit & Concurrency fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    version INT NOT NULL DEFAULT 1,
    
    FOREIGN KEY (identity_id) REFERENCES identities(id),
    FOREIGN KEY (from_cluster_id) REFERENCES identity_clusters(id),
    FOREIGN KEY (to_cluster_id) REFERENCES identity_clusters(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. VERIFICATION_REQUESTS
CREATE TABLE IF NOT EXISTS verification_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    organization_id INT NOT NULL,
    requested_by INT NOT NULL, -- user_id
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    
    -- Audit logs (Does not store PII, only metadata hashes or payload markers)
    request_signature VARCHAR(64) NOT NULL, -- Hash identifier of payload request
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    version INT NOT NULL DEFAULT 1,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    CONSTRAINT chk_request_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. VERIFICATION_RESULTS
CREATE TABLE IF NOT EXISTS verification_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    verification_request_id INT NOT NULL,
    matched_cluster_id INT NULL,
    match_score DECIMAL(5,2) NULL, -- Matching index percentage (e.g. 94.50)
    matched_attributes VARCHAR(255) NULL, -- 'aadhaar_hash', 'mobile_hash+full_name'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (verification_request_id) REFERENCES verification_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_cluster_id) REFERENCES identity_clusters(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. ACTIVITY_LOGS (User-facing actions log)
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type VARCHAR(100) NOT NULL, -- 'LOGIN', 'EXPORT_REPORT', 'SEARCH_IDENTITY'
    description VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. AUDIT_LOGS (Highly secure system/db state change tracker)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NULL,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    target_table VARCHAR(100) NOT NULL,
    target_id INT NOT NULL,
    old_value JSON NULL, -- JSON snapshot of old state
    new_value JSON NULL, -- JSON snapshot of new state
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. LOGIN_HISTORY
CREATE TABLE IF NOT EXISTS login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(255) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILED_PASSWORD', 'LOCKED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. SYSTEM_SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description VARCHAR(255) NULL,
    
    -- Audit & Concurrency fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    version INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 20. MERGE_HISTORY
CREATE TABLE IF NOT EXISTS merge_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    source_cluster_id INT NOT NULL,
    destination_cluster_id INT NOT NULL,
    source_cluster_uuid CHAR(36) NOT NULL,
    destination_cluster_uuid CHAR(36) NOT NULL,
    merged_identity_count INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- INDEXES & PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Primary Index validations are implicitly covered by AUTO_INCREMENT PRIMARY KEY.
-- Foreign keys also generate indexes implicitly in MySQL. Below are supplemental indexes.

-- A. Identity Resolution Deterministic Hash Lookups
-- Single indexes on key hashing targets to optimize resolving logic checks
CREATE INDEX idx_identities_aadhaar ON identities(aadhaar_hash) COMMENT 'Aadhaar deterministic search lookup';
CREATE INDEX idx_identities_abha ON identities(abha_hash) COMMENT 'ABHA deterministic search lookup';
CREATE INDEX idx_identities_digilocker ON identities(digilocker_hash) COMMENT 'DigiLocker ID search lookup';
CREATE INDEX idx_identities_mobile ON identities(mobile_hash) COMMENT 'Mobile hash lookup index';
CREATE INDEX idx_identities_email ON identities(email_hash) COMMENT 'Email hash lookup index';

-- B. Composite Performance Indexes
-- Optimization for searching active, non-deleted identities of a specific system source
CREATE INDEX idx_identities_source_status ON identities(system_source, status) COMMENT 'Source status evaluation optimization';
-- Optimization for scanning logs by target table
CREATE INDEX idx_audit_logs_target ON audit_logs(target_table, target_id) COMMENT 'Audit log target lookup optimization';

-- C. Soft Delete Filtering Indexes
-- Indexes to filter active records in transactional tables quickly
CREATE INDEX idx_identities_deleted ON identities(status, deleted_at) COMMENT 'Active identities scan optimization';
CREATE INDEX idx_users_deleted ON users(status, deleted_at) COMMENT 'Active user scanning validation';

-- ============================================================================
-- BACKEND AUDIT FOREIGN KEY REFERENCES
-- ============================================================================
-- Bind foreign keys for audit user logging fields (cannot be inline during creation due to cycle locks)
ALTER TABLE organizations ADD CONSTRAINT fk_org_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE organizations ADD CONSTRAINT fk_org_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE organizations ADD CONSTRAINT fk_org_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE roles ADD CONSTRAINT fk_role_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE roles ADD CONSTRAINT fk_role_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

ALTER TABLE permissions ADD CONSTRAINT fk_perm_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE permissions ADD CONSTRAINT fk_perm_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

ALTER TABLE users ADD CONSTRAINT fk_user_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE users ADD CONSTRAINT fk_user_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE users ADD CONSTRAINT fk_user_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE api_keys ADD CONSTRAINT fk_apikey_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE api_keys ADD CONSTRAINT fk_apikey_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE api_keys ADD CONSTRAINT fk_apikey_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE identity_clusters ADD CONSTRAINT fk_cluster_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE identity_clusters ADD CONSTRAINT fk_cluster_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE identity_clusters ADD CONSTRAINT fk_cluster_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE identities ADD CONSTRAINT fk_identity_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE identities ADD CONSTRAINT fk_identity_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE identities ADD CONSTRAINT fk_identity_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE identity_links ADD CONSTRAINT fk_link_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE identity_links ADD CONSTRAINT fk_link_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

ALTER TABLE verification_requests ADD CONSTRAINT fk_request_created_by FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE system_settings ADD CONSTRAINT fk_setting_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE system_settings ADD CONSTRAINT fk_setting_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

-- Re-enable foreign key constraints validation
SET FOREIGN_KEY_CHECKS = 1;
