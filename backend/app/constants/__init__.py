# -*- coding: utf-8 -*-
"""
System-wide constants and enumerations for VeriSync.
"""

# Supported external identity registries
SUPPORTED_SOURCES = [
    'Aadhaar',
    'ABHA',
    'DigiLocker',
    'MobileRegistry',
    'EmailRegistry'
]

# RapidFuzz Similarity Weight Settings for Fuzzy Verification
WEIGHT_NAME = 0.60
WEIGHT_ADDRESS = 0.40

# Supported administrative user account status states
STATUS_ACTIVE = 'ACTIVE'
STATUS_INACTIVE = 'INACTIVE'
STATUS_LOCKED = 'LOCKED'
STATUS_PENDING = 'PENDING'
STATUS_DELETED = 'DELETED'

# Supported API Key status states
KEY_STATUS_ACTIVE = 'ACTIVE'
KEY_STATUS_INACTIVE = 'INACTIVE'
KEY_STATUS_DELETED = 'DELETED'

# JWT Blocklist token key identifiers
JWT_BLOCKLIST_KEY_PREFIX = 'jwt_blocklist:'
