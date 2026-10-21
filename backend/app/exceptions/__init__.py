# -*- coding: utf-8 -*-
"""
Custom Exception Classes for VeriSync.
Defines granular errors for authentication, authorization, and validation.
"""

class IdentityResolutionException(Exception):
    """Base exception for all system-related errors."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class InvalidIdentifierException(IdentityResolutionException):
    """Raised when identity inputs fail format validations."""
    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class DatabaseTransactionException(IdentityResolutionException):
    """Raised when SQL execution errors occur during database updates."""
    def __init__(self, message: str):
        super().__init__(message, status_code=500)


class CryptoConfigurationException(IdentityResolutionException):
    """Raised when cryptographic key or pepper environments are misconfigured."""
    def __init__(self, message: str):
        super().__init__(message, status_code=500)


class AuthenticationException(IdentityResolutionException):
    """Base exception for user authentication failures."""
    def __init__(self, message: str, status_code: int = 401):
        super().__init__(message, status_code)


class UserNotFoundException(AuthenticationException):
    """Raised when a username or email is not found in the repository."""
    def __init__(self, message: str = "User not found"):
        super().__init__(message, status_code=404)


class InvalidCredentialsException(AuthenticationException):
    """Raised on password mismatch or invalid login request."""
    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message, status_code=401)


class AccountLockedException(AuthenticationException):
    """Raised when a user account is locked due to excessive failed attempts."""
    def __init__(self, message: str = "Account is temporarily locked"):
        super().__init__(message, status_code=403)


class PasswordPolicyException(AuthenticationException):
    """Raised when a new password does not meet complexity standards."""
    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class PasswordReuseException(AuthenticationException):
    """Raised when attempting to reuse a password from the history logs."""
    def __init__(self, message: str = "Cannot reuse any of the last 3 passwords"):
        super().__init__(message, status_code=400)


class TokenRevokedException(AuthenticationException):
    """Raised when a revoked or rotated token is presented."""
    def __init__(self, message: str = "Token has been revoked"):
        super().__init__(message, status_code=401)


class AuthorizationException(IdentityResolutionException):
    """Base exception for user authorization and access control failures."""
    def __init__(self, message: str = "Unauthorized access", status_code: int = 403):
        super().__init__(message, status_code)


class ForbiddenException(AuthorizationException):
    """Raised when the user is authenticated but not authorized for the resource."""
    def __init__(self, message: str = "Access forbidden"):
        super().__init__(message, status_code=403)


class InsufficientPermissionsException(AuthorizationException):
    """Raised when the user lacks the specific permission claim required."""
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, status_code=403)


class OrganizationMismatchException(AuthorizationException):
    """Raised when accessing records outside the user's organization scope."""
    def __init__(self, message: str = "Access denied: Organization scope mismatch"):
        super().__init__(message, status_code=403)


class ConflictException(IdentityResolutionException):
    """Raised when an optimistic locking version conflict is detected during updates."""
    def __init__(self, message: str = "Database record has been modified by another transaction. Please reload."):
        super().__init__(message, status_code=409)
