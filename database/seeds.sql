-- ============================================================================
-- PRODUCTION-READY DATABASE SEEDS SCRIPT FOR MYSQL 8
-- CROSS-SYSTEM IDENTITY RESOLUTION ENGINE
-- ============================================================================

USE identity_resolution;

-- Disable constraint validations during base seeds ingestion
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Ingest Default Organization (Root Operator Org)
INSERT INTO organizations (id, uuid, name, code, status, version)
VALUES (
    1, 
    'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    'National Identity Authority', 
    'NIA_ROOT', 
    'ACTIVE', 
    1
)
ON DUPLICATE KEY UPDATE id=id;

-- 2. Ingest System-Wide Roles
INSERT INTO roles (id, uuid, name, description, version)
VALUES 
(1, '2946c59b-11d2-4467-8fa0-bd74ab8967de', 'SUPER_ADMIN', 'Complete root system administrator permissions', 1),
(2, 'd5d36e8b-4a5f-4d9f-bf2a-12e3e5b6c2d1', 'ORG_ADMIN', 'Organization specific administration control', 1),
(3, '02e3b2e3-6a5a-478b-821f-823d70624021', 'INGEST_OPERATOR', 'Responsible for uploading and linking database streams', 1),
(4, 'acb423fa-1a98-4c8d-b0a3-a7c8d9ea02b2', 'AUDITOR', 'Access system activities and compliance logs', 1)
ON DUPLICATE KEY UPDATE id=id;

-- 3. Ingest Standard Permissions
INSERT INTO permissions (id, uuid, name, description, version)
VALUES 
(1, '5f778d91-628b-4172-8822-6b998a44d82f', 'user:write', 'Create, update, lock system operator accounts', 1),
(2, '9a778c8c-1e82-44af-88b1-bf5c8c991a02', 'user:read', 'View administrative accounts lists', 1),
(3, 'a53fb2df-b21f-474c-83b3-82efc6bc1a1a', 'identity:ingest', 'Ingest new identity payload records', 1),
(4, 'bd723bf2-98ab-433b-8255-bf4c40b82fcf', 'identity:resolve', 'Query linkages, merge or split cluster records', 1),
(5, '089dfab3-a9cd-4bc3-9588-cfb297b83dcd', 'audit:read', 'View activity and data modification audit snapshots', 1),
(6, 'c898fbbd-f21f-4b11-a8b2-ab890c2e39ff', 'system:settings', 'Modify matching parameters and security thresholds', 1)
ON DUPLICATE KEY UPDATE id=id;

-- 4. Map Permissions to Roles
-- SUPER_ADMIN: Gets all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES 
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
-- ORG_ADMIN: User admin and ingest rights inside their scope
(2, 2), (2, 3), (2, 4),
-- INGEST_OPERATOR: Only ingestion and resolution query rights
(3, 3), (3, 4),
-- AUDITOR: Read-only access to users and system audits
(4, 2), (4, 5);

-- 5. Ingest Root Super Admin User (password: 'SecurePass123!', hashed using bcrypt)
INSERT INTO users (id, uuid, organization_id, username, email, password_hash, status, created_by, version)
VALUES (
    1, 
    'ca1a88bb-83df-4929-aefb-b81b29d49e1f', 
    1, 
    'superadmin', 
    'superadmin@identityauthority.gov.in', 
    '$2b$12$58NlYO311jBzoQp.63cspOtcOu1O0TbtJ0NKsvohUEFDcHOd0cGpC', 
    'ACTIVE', 
    1, -- Self-referencing created_by allowed via temporarily disabling foreign key checks
    1
)
ON DUPLICATE KEY UPDATE id=id;

-- 6. Bind User Role
INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (1, 1);

-- 6a. Ingest Password History Seed
INSERT INTO password_histories (id, user_id, password_hash)
VALUES (1, 1, '$2b$12$58NlYO311jBzoQp.63cspOtcOu1O0TbtJ0NKsvohUEFDcHOd0cGpC')
ON DUPLICATE KEY UPDATE id=id;

-- 7. Ingest Default System Settings (Matching thresholds, etc.)
INSERT INTO system_settings (id, uuid, setting_key, setting_value, description, created_by, version)
VALUES 
(
    1, 
    '77b21a8d-29c8-47fb-b1ef-0dcf3819e911', 
    'MATCH_THRESHOLD_STRICT', 
    '90.0', 
    'Strict similarity percentage score required for auto-merging records', 
    1, 
    1
),
(
    2, 
    '33b129a0-f8cc-4dcf-8e99-ad10e9cf41d9', 
    'MATCH_THRESHOLD_LENIENT', 
    '85.0', 
    'Fuzzy matching percentage threshold required to flag manual review links', 
    1, 
    1
),
(
    3, 
    '44cc99ac-d29c-4ecf-a89c-bc098ad81c9a', 
    'FUZZY_WEIGHTS_CONF', 
    '{"name": 0.60, "address": 0.40}', 
    'Configurable weights applied on name and address similarity results during composite matching', 
    1, 
    1
)
ON DUPLICATE KEY UPDATE id=id;

-- Re-enable constraints checks
SET FOREIGN_KEY_CHECKS = 1;
