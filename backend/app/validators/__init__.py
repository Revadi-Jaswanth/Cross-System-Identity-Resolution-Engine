# -*- coding: utf-8 -*-
"""
Request Validation Layer for VeriSync.
Implements password policy strength checking, registration validation,
and user / organization profile validations.
"""

import re
from typing import Dict, Any, List
from app.exceptions import PasswordPolicyException, InvalidIdentifierException, ForbiddenException


class RequestValidator:
    """
    Validates structural payloads and parameters for administrative operators.
    """

    @staticmethod
    def validate_password_strength(password: str) -> bool:
        """
        Enforces password policy requirements:
        - Minimum 8 characters in length
        - At least one uppercase character
        - At least one lowercase character
        - At least one numeric digit
        - At least one special symbol from: !@#$%^&*(),.?":{}|<>

        Args:
            password (str): The plain text password to check.

        Returns:
            bool: True if password meets all requirements.

        Raises:
            PasswordPolicyException: Detailed policy failure reason.
        """
        if len(password) < 8:
            raise PasswordPolicyException("Password must be at least 8 characters in length.")
        if not re.search(r"[A-Z]", password):
            raise PasswordPolicyException("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", password):
            raise PasswordPolicyException("Password must contain at least one lowercase letter.")
        if not re.search(r"[0-9]", password):
            raise PasswordPolicyException("Password must contain at least one digit.")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise PasswordPolicyException("Password must contain at least one special character (!@#$%^&* etc.).")
        return True

    @staticmethod
    def validate_aadhaar(aadhaar_num: str) -> bool:
        """
        Validates Aadhaar structural format (12 numeric digits).
        """
        cleaned = aadhaar_num.strip().replace(" ", "").replace("-", "")
        if not re.match(r"^\d{12}$", cleaned):
            raise InvalidIdentifierException("Aadhaar must be exactly 12 numeric digits.")
        return True

    @staticmethod
    def validate_abha(abha_num: str) -> bool:
        """
        Validates ABHA number formats (14 numeric digits, often formatted as XX-XXXX-XXXX-XXXX).
        """
        cleaned = abha_num.strip().replace("-", "").replace(" ", "")
        if not re.match(r"^\d{14}$", cleaned):
            raise InvalidIdentifierException("ABHA number must be exactly 14 numeric digits.")
        return True

    @staticmethod
    def validate_mobile(mobile_num: str) -> bool:
        """
        Validates mobile phone number format structures (optional +91 and 10 digits).
        """
        cleaned = mobile_num.strip().replace(" ", "").replace("-", "")
        if not re.match(r"^(\+91|91)?[6789]\d{9}$", cleaned):
            raise InvalidIdentifierException("Invalid mobile phone number format.")
        return True

    @staticmethod
    def validate_email(email_str: str) -> bool:
        """
        Validates email structure patterns.
        """
        email_pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(email_pattern, email_str.strip()):
            raise InvalidIdentifierException("Invalid email address format.")
        return True

    @classmethod
    def validate_registration_payload(cls, data: Dict[str, Any]) -> None:
        """
        Validates registration fields.
        """
        required = ["username", "email", "password", "organization_id"]
        for field in required:
            if field not in data or not data[field]:
                raise InvalidIdentifierException(f"Missing required registration field: {field}")
        
        cls.validate_email(data["email"])
        cls.validate_password_strength(data["password"])
        
        if not isinstance(data["organization_id"], int):
            raise InvalidIdentifierException("organization_id must be an integer.")

    @classmethod
    def validate_login_payload(cls, data: Dict[str, Any]) -> None:
        """
        Validates login fields.
        """
        required = ["username", "password"]
        for field in required:
            if field not in data or not data[field]:
                raise InvalidIdentifierException(f"Missing required login field: {field}")


class OrganizationValidator:
    """
    Validates organization payload structures.
    """

    @staticmethod
    def validate_create(data: Dict[str, Any]) -> None:
        """
        Validates organization creation fields.
        """
        required = ["name", "code"]
        for field in required:
            if field not in data or not data[field]:
                raise InvalidIdentifierException(f"Missing required organization field: {field}")
        
        code = data["code"].strip()
        if not re.match(r"^[A-Z0-9_]{3,20}$", code):
            raise InvalidIdentifierException("Organization code must be 3-20 characters, uppercase alphanumeric and underscores only.")

    @staticmethod
    def validate_update(data: Dict[str, Any]) -> None:
        """
        Validates organization update fields, enforcing optimistic locking version checks.
        """
        if "version" not in data:
            raise InvalidIdentifierException("Optimistic locking 'version' field is required for updates.")
        if not isinstance(data["version"], int):
            raise InvalidIdentifierException("'version' field must be an integer.")

        if "status" in data and data["status"] is not None:
            valid_statuses = ["ACTIVE", "INACTIVE", "PENDING"]
            if data["status"] not in valid_statuses:
                raise InvalidIdentifierException(f"Invalid organization status. Must be one of: {valid_statuses}")


class UserValidator:
    """
    Validates user account management payload structures.
    """

    @staticmethod
    def validate_create(data: Dict[str, Any]) -> None:
        """
        Validates user creation fields.
        """
        required = ["username", "email", "organization_id"]
        for field in required:
            if field not in data or not data[field]:
                raise InvalidIdentifierException(f"Missing required user field: {field}")
        
        RequestValidator.validate_email(data["email"])
        
        if "password" in data:
            RequestValidator.validate_password_strength(data["password"])

    @staticmethod
    def validate_update(data: Dict[str, Any]) -> None:
        """
        Validates user update fields, enforcing optimistic locking version checks.
        """
        if "version" not in data:
            raise InvalidIdentifierException("Optimistic locking 'version' field is required for updates.")
        if not isinstance(data["version"], int):
            raise InvalidIdentifierException("'version' field must be an integer.")

        if "email" in data and data["email"] is not None:
            RequestValidator.validate_email(data["email"])

        if "status" in data and data["status"] is not None:
            valid_statuses = ["ACTIVE", "INACTIVE", "LOCKED", "PENDING"]
            if data["status"] not in valid_statuses:
                raise InvalidIdentifierException(f"Invalid user status. Must be one of: {valid_statuses}")

    @staticmethod
    def validate_self_safety(actor_id: int, target_id: int, action: str) -> None:
        """
        Prevents self-lockout by ensuring operators cannot deactivate or delete themselves.
        """
        if actor_id == target_id:
            if action in ["DEACTIVATE", "DELETE", "REMOVE_ADMIN_ROLE"]:
                raise ForbiddenException(f"Self-lockout protection: You cannot perform '{action}' on your own account.")


class IdentityValidator:
    """
    Validates identity registration parameters, metadata, and lifecycle statuses.
    """

    @staticmethod
    def validate_create(data: Dict[str, Any]) -> None:
        """
        Enforces constraints for raw Identity record registrations.
        """
        required = ["system_source", "system_uid", "organization_id"]
        for field in required:
            if field not in data or data[field] is None:
                raise InvalidIdentifierException(f"Missing required identity ingestion field: {field}")

        # Ingestion Source type validation
        if not isinstance(data["system_source"], str) or not data["system_source"].strip():
            raise InvalidIdentifierException("system_source must be a non-empty string.")

        # Hash validations (Hex strings of length 64)
        hash_fields = ["aadhaar_hash", "abha_hash", "digilocker_hash", "mobile_hash", "email_hash"]
        for h_field in hash_fields:
            if h_field in data and data[h_field] is not None:
                h_val = data[h_field]
                if not isinstance(h_val, str) or not re.match(r"^[a-fA-F0-9]{64}$", h_val):
                    raise InvalidIdentifierException(f"{h_field} must be a valid 64-character SHA-256 hex hash.")

        # Encrypted field validations (must be byte arrays)
        encrypted_fields = ["full_name_encrypted", "address_encrypted", "date_of_birth_encrypted"]
        for enc_field in encrypted_fields:
            if enc_field in data and data[enc_field] is not None:
                if not isinstance(data[enc_field], (bytes, bytearray)):
                    raise InvalidIdentifierException(f"{enc_field} must be raw encrypted bytes/LargeBinary.")

        # Validate Ingest Lifecycle Status
        if "status" in data and data["status"] is not None:
            valid_statuses = ["REGISTERED", "VERIFIED", "PENDING", "REJECTED", "MERGED", "ARCHIVED", "DELETED"]
            if data["status"] not in valid_statuses:
                raise InvalidIdentifierException(f"Invalid identity lifecycle status. Must be one of: {valid_statuses}")

    @staticmethod
    def validate_cluster(data: Dict[str, Any]) -> None:
        """
        Enforces lifecycle constraints for Identity Clusters.
        """
        if "status" in data and data["status"] is not None:
            valid_statuses = ["OPEN", "MATCHED", "MERGED", "LOCKED", "ARCHIVED", "DELETED"]
            if data["status"] not in valid_statuses:
                raise InvalidIdentifierException(f"Invalid cluster status. Must be one of: {valid_statuses}")

