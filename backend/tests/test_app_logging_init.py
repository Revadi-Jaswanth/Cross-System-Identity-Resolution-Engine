import importlib
import shutil
import sys
from pathlib import Path


def test_app_import_creates_log_directory():
    log_dir = (Path(__file__).resolve().parents[1] / 'logs')
    shutil.rmtree(log_dir, ignore_errors=True)

    sys.modules.pop('app', None)
    importlib.import_module('app')

    assert log_dir.exists()
