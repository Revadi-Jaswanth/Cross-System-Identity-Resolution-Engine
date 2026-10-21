# -*- coding: utf-8 -*-
"""
Security and Cryptographic Utility Layer for VeriSync.
Handles password hashing via bcrypt and deterministic SHA-256 identity hashing.
"""

import hashlib
import bcrypt
from app.exceptions import CryptoConfigurationException


class SecurityService:
    """
    Utility class for secure credential verification and deterministic attribute hashing.
    """

    @staticmethod
    def hash_password(plain_password: str) -> str:
        """
        Hashes administrative user passwords using bcrypt.

        Args:
            plain_password (str): Cleartext password input.

        Returns:
            str: Bcrypt hashed password.
        """
        if not plain_password:
            raise ValueError("Password cannot be empty.")
        
        # Bcrypt requires bytes for operations
        password_bytes = plain_password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verifies admin user passwords against saved bcrypt hashes.

        Args:
            plain_password (str): Cleartext password input.
            hashed_password (str): Hashed password value stored in DB.

        Returns:
            bool: True if passwords match, False otherwise.
        """
        if not plain_password or not hashed_password:
            return False
        
        try:
            password_bytes = plain_password.encode('utf-8')
            hash_bytes = hashed_password.encode('utf-8')
            return bcrypt.checkpw(password_bytes, hash_bytes)
        except Exception:
            return False

    @staticmethod
    def hash_identifier(raw_identifier: str, pepper: str) -> str:
        """
        Performs deterministic SHA-256 hashing of sensitive identifiers.
        Converts the normalized input and appends the server pepper.

        Args:
            raw_identifier (str): Normalized identifier string (e.g. Aadhaar number).
            pepper (str): Server secret pepper string.

        Returns:
            str: Deterministic SHA-256 hash.
        """
        if not raw_identifier:
            raise ValueError("Identifier cannot be empty.")
        if not pepper:
            raise CryptoConfigurationException("PEPPER_SECRET environment variable is missing or empty.")

        # Normalize the field by removing whitespace, hyphens, and converting to lowercase
        normalized = raw_identifier.strip().replace(" ", "").replace("-", "").lower()
        
        # Combine normalized input with the secret pepper key
        combined = normalized + pepper
        return hashlib.sha256(combined.encode('utf-8')).hexdigest()

    @staticmethod
    def get_encryption_key(key_secret: str) -> bytes:
        """
        Derives a base64-encoded key of 32 bytes from any configuration string.
        """
        import base64
        hashed = hashlib.sha256(key_secret.encode('utf-8')).digest()
        return base64.urlsafe_b64encode(hashed)

    @staticmethod
    def encrypt_field(plaintext: str, key_secret: str) -> bytes:
        """
        Encrypts a sensitive plaintext string to AES binary bytes.
        """
        from cryptography.fernet import Fernet
        if not plaintext:
            return b""
        key = SecurityService.get_encryption_key(key_secret)
        f = Fernet(key)
        return f.encrypt(plaintext.encode('utf-8'))

    @staticmethod
    def decrypt_field(ciphertext: bytes, key_secret: str) -> str:
        """
        Decrypts AES binary bytes back to plaintext.
        """
        from cryptography.fernet import Fernet
        if not ciphertext:
            return ""
        key = SecurityService.get_encryption_key(key_secret)
        f = Fernet(key)
        return f.decrypt(ciphertext).decode('utf-8')
