from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required(optional=True)
def get_stats():
    """
    Route placeholder for retrieving analytics matching metrics
    """
    # Placeholder response
    return jsonify({
        "status": "success",
        "data": {
            "total_records": 0,
            "resolved_clusters": 0,
            "unresolved_records": 0
        }
    }), 200
