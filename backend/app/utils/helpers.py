# -*- coding: utf-8 -*-
"""
Helper Utilities for formatting, mapping, and response standardization.
"""

import uuid
from datetime import datetime
from flask import jsonify, request, Response


class HelperUtils:
    """
    Miscellaneous helper functions for format mappings and standardized API wraps.
    """

    @staticmethod
    def format_phone_number(phone: str) -> str:
        """
        Formats mobile input into uniform format (e.g. +91XXXXXXXXXX) before processing.
        
        Args:
            phone (str): Raw phone input.
            
        Returns:
            str: Normalized phone number.
        """
        cleaned = phone.strip().replace(" ", "").replace("-", "")
        if cleaned.startswith("0"):
            cleaned = cleaned[1:]
        if not cleaned.startswith("+91") and not cleaned.startswith("91") and len(cleaned) == 10:
            cleaned = "+91" + cleaned
        elif cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = "+" + cleaned
        elif not cleaned.startswith("+"):
            cleaned = "+" + cleaned
        return cleaned

    @staticmethod
    def standard_response(success: bool, message: str, data: any = None, error: any = None, status_code: int = 200) -> Response:
        """
        Wraps and formats all outgoing endpoint payloads into a standardized enterprise envelope.

        Args:
            success (bool): True if operation succeeded.
            message (str): Descriptive user message.
            data (any): Result payload payload details.
            error (any): Error details (code, message) if applicable.
            status_code (int): Outgoing HTTP status code.

        Returns:
            Response: Flask HTTP JSON response package.
        """
        request_id = getattr(request, 'request_id', None)
        if not request_id:
            request_id = str(uuid.uuid4())
            setattr(request, 'request_id', request_id)

        # Ingest execution time trace if available
        import time
        start_time = getattr(request, 'start_time', None)
        exec_time_ms = 0.0
        if start_time:
            exec_time_ms = (time.perf_counter() - start_time) * 1000.0

        payload = {
            "success": success,
            "message": message,
            "data": data,
            "error": error,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "request_id": request_id,
            "execution_time_ms": round(exec_time_ms, 2)
        }
        
        response = jsonify(payload)
        response.status_code = status_code
        return response
