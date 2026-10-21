import os
from dotenv import load_dotenv

# Load environmental configurations from .env
load_dotenv()

from app import create_app

app = create_app()

if __name__ == '__main__':
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    app.run(host=host, port=port, debug=debug)
