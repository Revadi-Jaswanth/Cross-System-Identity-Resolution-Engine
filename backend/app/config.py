# -*- coding: utf-8 -*-
"""
System Configuration Module mapping environment parameters to Flask environments.
"""

import os
from datetime import timedelta


class Config:
    """
    Reads configuration values from environment settings.
    """
    # Core secret keys
    SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key_change_me_in_production_1234!')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default_jwt_secret_key_change_me_in_production_1234!')
    ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', 'default_encryption_key_change_me_in_production_1234!')

    # Database — Render provides postgres:// but SQLAlchemy needs postgresql://
    _raw_db_url = os.getenv('DATABASE_URL', 'postgresql://admin:supersecuredbpassword@localhost:5432/identity_resolution')
    if _raw_db_url.startswith('postgres://'):
        _raw_db_url = _raw_db_url.replace('postgres://', 'postgresql+psycopg://', 1)
    elif _raw_db_url.startswith('postgresql://'):
        _raw_db_url = _raw_db_url.replace('postgresql://', 'postgresql+psycopg://', 1)
    SQLALCHEMY_DATABASE_URI = _raw_db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Privacy Deterministic Hashing
    PEPPER_SECRET = os.getenv('PEPPER_SECRET', 'default_pepper_secret_change_me_in_production_1234!')

    # CORS Settings Origins List
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:80').split(',')

    # Authentication Policies
    MAX_LOGIN_ATTEMPTS = int(os.getenv('MAX_LOGIN_ATTEMPTS', 5))
    LOCKOUT_DURATION_MINUTES = int(os.getenv('LOCKOUT_DURATION_MINUTES', 15))
    PASSWORD_HISTORY_LIMIT = int(os.getenv('PASSWORD_HISTORY_LIMIT', 3))

    # Token Lifespans
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv('JWT_ACCESS_EXPIRY_MIN', 15)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv('JWT_REFRESH_EXPIRY_DAYS', 7)))

    # Identity Resolution thresholds
    DEFAULT_MATCH_THRESHOLD = float(os.getenv('MATCH_THRESHOLD', 85.0))

    # RapidFuzz similarity algorithm weighting configurations
    RAPIDFUZZ_WEIGHTS = {
        "wratio": 0.3,
        "token_set_ratio": 0.2,
        "token_sort_ratio": 0.2,
        "partial_ratio": 0.1,
        "jaro_winkler": 0.2
    }

    # Weighted scoring factor weights (default fallback)
    WEIGHTED_SCORING_DEFAULT_WEIGHTS = {
        "aadhaar": 0.25,
        "abha": 0.20,
        "digilocker": 0.15,
        "mobile": 0.10,
        "email": 0.05,
        "full_name": 0.10,
        "address": 0.10,
        "date_of_birth": 0.05
    }

    # Ingestion Source Reliability default scores
    SOURCE_RELIABILITY_SCORES = {
        "AadhaarService": 1.0,
        "ABHAService": 0.95,
        "DigiLockerService": 0.90,
        "OtherSource": 0.70
    }

    # Merge Engine Policy Configurations
    MERGE_AUTO_THRESHOLD = float(os.getenv('MERGE_AUTO_THRESHOLD', 90.0))
    MERGE_REVIEW_THRESHOLD = float(os.getenv('MERGE_REVIEW_THRESHOLD', 70.0))
    MERGE_ALLOW_CROSS_ORG = os.getenv('MERGE_ALLOW_CROSS_ORG', 'False').lower() in ('true', '1', 't')

    # Conflict Resolution configurations
    CONFLICT_DEFAULT_POLICY = os.getenv('CONFLICT_DEFAULT_POLICY', 'MOST_TRUSTED_SOURCE')
    CONFLICT_FIELD_POLICIES = {
        "full_name": "MOST_TRUSTED_SOURCE",
        "address": "MOST_RECENT_SOURCE",
        "date_of_birth": "MOST_TRUSTED_SOURCE",
        "email": "LONGEST_NON_EMPTY_VALUE",
        "mobile": "MOST_RECENT_SOURCE"
    }
