# -*- coding: utf-8 -*-
"""
Application Factory module for Flask MVC environment configuration.
Initializes CORS, SQLAlchemy database connections, JWT authentication, and global filters.
"""

import os
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

from app.utils.helpers import HelperUtils
from app.exceptions import IdentityResolutionException

LOG_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../logs'))
os.makedirs(LOG_DIR, exist_ok=True)

# Configure logging to write to folder logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, 'app.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize extensions as globals
db = SQLAlchemy()
jwt = JWTManager()


def create_app(config_class=None) -> Flask:
    """
    Application Factory creating and configuring the Flask service node.

    Args:
        config_class (class): Configuration overrides class (useful in testing).

    Returns:
        Flask: Instantiated and configured app.
    """
    app = Flask(__name__)
    
    # Load configuration
    if config_class is None:
        from app.config import Config
        app.config.from_object(Config)
    else:
        app.config.from_object(config_class)

    # Initialize Extensions
    CORS(app, resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}})
    db.init_app(app)
    jwt.init_app(app)

    # Ensure logs folder exists
    os.makedirs(LOG_DIR, exist_ok=True)

    # Configure JWT Callback Handlers
    register_jwt_callbacks(jwt)

    # Register global middleware interceptors
    from app.middleware import register_middleware
    register_middleware(app)

    # Register blueprints (routes)
    from app.blueprints.auth import auth_bp
    from app.blueprints.identity import identity_bp
    from app.blueprints.dashboard import dashboard_bp
    from app.blueprints.organizations import organizations_bp
    from app.blueprints.users import users_bp
    from app.blueprints.resolution import resolution_bp
    from app.blueprints.clusters import clusters_bp
    from app.blueprints.verification import verification_bp
    from app.blueprints.system import system_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(identity_bp, url_prefix='/api/v1/identities')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(organizations_bp, url_prefix='/api/v1/organizations')
    app.register_blueprint(users_bp, url_prefix='/api/v1/users')
    app.register_blueprint(resolution_bp, url_prefix='/api/v1/resolution')
    app.register_blueprint(clusters_bp, url_prefix='/api/v1/clusters')
    app.register_blueprint(verification_bp, url_prefix='/api/v1/verification')
    app.register_blueprint(system_bp, url_prefix='/api/v1/system')

    # Register global HTTP error handlers
    register_error_handlers(app)

    logger.info("Flask Application Factory initialized successfully.")
    return app


def register_jwt_callbacks(jwt_manager: JWTManager) -> None:
    """
    Binds lookup and verification callbacks to JWTManager.
    """
    from app.models.user import User, JWTBlocklist

    @jwt_manager.additional_claims_loader
    def add_claims_to_jwt(identity) -> dict:
        """
        Embed roles, permissions, and organization claims in access token.
        """
        user = User.query.filter_by(username=identity, deleted_at=None).first()
        if not user:
            return {}
        return {
            "user": {
                "username": user.username,
                "roles": [role.name for role in user.roles],
                "permissions": user.get_permissions(),
                "organization": {
                    "id": user.organization.id,
                    "name": user.organization.name,
                    "code": user.organization.code
                } if user.organization else None
            },
            "roles": [role.name for role in user.roles],
            "permissions": user.get_permissions(),
            "organization": {
                "id": user.organization.id,
                "name": user.organization.name,
                "code": user.organization.code
            } if user.organization else None
        }

    @jwt_manager.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data) -> User:
        """
        Automatically queries and binds the User object to flask_jwt_extended.current_user.
        """
        username = jwt_data["sub"]
        return User.query.filter_by(username=username, deleted_at=None).first()

    @jwt_manager.token_in_blocklist_loader
    def check_if_token_in_blocklist(_jwt_header, jwt_data) -> bool:
        """
        Checks if the incoming access token jti identifier is in the blocklist table.
        """
        jti = jwt_data["jti"]
        token = JWTBlocklist.query.filter_by(jti=jti).first()
        return token is not None

    @jwt_manager.unauthorized_loader
    def custom_unauthorized_response(err_str):
        """
        Standardizes unauthorized JWT response mapping.
        """
        from app.utils.helpers import HelperUtils
        return HelperUtils.standard_response(
            success=False,
            message="Missing or invalid authentication credentials.",
            error={"code": "UNAUTHORIZED", "message": err_str},
            status_code=401
        )


def register_error_handlers(app: Flask) -> None:
    """
    Attaches global HTTP exception mappings using standard JSON envelopes.
    """
    @app.errorhandler(IdentityResolutionException)
    def handle_custom_exceptions(error):
        """Maps Identity Engine custom runtime errors to standardized JSON responses."""
        logger.warning(f"Engine Exception Intercepted: {error.message} | Code: {error.status_code}")
        return HelperUtils.standard_response(
            success=False,
            message=error.message,
            error={"code": error.__class__.__name__, "message": error.message},
            status_code=error.status_code
        )

    @app.errorhandler(404)
    def handle_not_found_route(error):
        """Maps invalid URL routes."""
        return HelperUtils.standard_response(
            success=False,
            message="Requested route resource not found.",
            error={"code": "ROUTE_NOT_FOUND", "message": str(error)},
            status_code=404
        )

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        """Maps incorrect HTTP method requests."""
        return HelperUtils.standard_response(
            success=False,
            message="HTTP method not allowed on this endpoint.",
            error={"code": "METHOD_NOT_ALLOWED", "message": str(error)},
            status_code=405
        )

    @app.errorhandler(500)
    def handle_internal_crashes(error):
        """Intercepts internal server logic crashes."""
        logger.error(f"Internal Application Crash: {str(error)}", exc_info=True)
        return HelperUtils.standard_response(
            success=False,
            message="An internal server error occurred.",
            error={"code": "INTERNAL_SERVER_ERROR", "message": str(error)},
            status_code=500
        )
