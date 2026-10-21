# VeriSync

**Bridging disparate identity sources into a single, trustworthy credential hub.**

An enterprise-grade, privacy-preserving identity resolution platform capable of linking multi-source identity data (Aadhaar, ABHA, DigiLocker, mobile numbers, and email addresses) using secure cryptographic hashing, a secure Repository-Service model, and high-performance similarity matching.

---

## Technical Stack

- **Frontend**: React (Vite), Tailwind CSS, Axios, React Router, Chart.js
- **Backend**: Flask, Flask Blueprints, Flask-JWT-Extended, Flask-CORS
- **Database**: MySQL 8.x
- **Security**: bcrypt (user credentials), hashlib (SHA-256 + Server-side secret pepper for deterministic identity matching), JWT Token Auth
- **Matching Engine**: RapidFuzz (Jaro-Winkler & Token Set Ratio) for fuzzy matching non-sensitive cleartext parameters.

---

## Directory Structure

```
VeriSync/
├── .github/
│   └── workflows/
│       └── ci.yml                          # Placeholder CI validation workflow
├── backend/
│   ├── app/
│   │   ├── __init__.py                     # Application factory initialization
│   │   ├── blueprints/                     # Blueprint controllers (Auth, Identity, Dashboard)
│   │   ├── constants/                      # Package for system-wide constants
│   │   ├── exceptions/                     # Custom exception definitions & handlers
│   │   ├── middleware/                     # Request logging & token middleware
│   │   ├── models/                         # Database schema models (SQLAlchemy ORM)
│   │   ├── repositories/                   # Decoupled Repository layer for DB interaction
│   │   ├── security/                       # Cryptographic utilities (Bcrypt & SHA-256 + Pepper)
│   │   ├── services/                       # Orchestration and business logic layer
│   │   ├── utils/                          # Helper utilities
│   │   ├── validators/                     # Modular packages for request validation
│   │   └── config.py                       # Configuration files mapping from environment
│   ├── logs/                               # Application logging directory
│   ├── tests/                              # Unit, integration, and engine matching tests
│   ├── .env.example                        # Backend configuration variables
│   ├── requirements.txt                    # Python backend dependencies
│   └── run.py                              # Service main entrypoint
├── database/
│   ├── migrations/                         # SQL structural delta migrations
│   ├── schema.sql                          # Primary database initialization schema
│   └── seeds.sql                           # Testing & verification seed files
├── docker/
│   ├── backend.Dockerfile                  # Multi-stage Docker builder for backend
│   ├── frontend.Dockerfile                 # Multi-stage Docker builder for frontend
│   └── docker-compose.yml                  # Runtime containers orchestrator
├── docs/
│   ├── diagrams/                           # Architectural, ERD, and data flow diagrams
│   ├── api_spec.md                         # OpenAPI specifications
│   ├── architecture.md                     # Security details & matching architecture details
│   └── setup_guide.md                      # Developer installation instructions
├── frontend/
│   ├── public/                             # Public icons and static assets
│   ├── src/
│   │   ├── assets/                         # SVG & images
│   │   ├── components/                     # Shared visual components
│   │   ├── context/                        # React Context hooks (Auth, State)
│   │   ├── pages/                          # Routes (Dashboard, Ingest, Identity Search)
│   │   ├── services/                       # HTTP API service layer (Axios)
│   │   ├── utils/                          # Layout and format helpers
│   │   ├── App.jsx                         # Main Routing configuration
│   │   ├── index.css                       # CSS entry with Tailwind imports
│   │   └── main.jsx                        # App DOM node injector
│   ├── .env.example                        # Frontend environment variables
│   ├── index.html                          # Root document
│   ├── postcss.config.js                   # CSS compiling configurations
│   ├── tailwind.config.js                  # Tailwind layout & custom design definitions
│   └── vite.config.js                      # React Vite bundle configuration
├── postman/
│   └── identity_resolution.json            # Importable API tests collection
├── .gitignore
└── README.md
```

---

## Security Architecture & Matching Logic

1. **User Authentication**:
   - `bcrypt` is strictly reserved for user password storage. Under no circumstances are identity attributes hashed using bcrypt, due to its slow computational nature and lack of deterministic consistency across salts.
2. **Deterministic Identity Resolution**:
   - Identity identifiers (Aadhaar, ABHA, DigiLocker ID, Phone, Email) are processed using **SHA-256** combined with a secret server-side **Pepper** (`PEPPER_SECRET`) loaded from `.env`. This creates a deterministic, non-reversible token allowing systems to resolve identities across databases without exposing original values.
3. **Non-Sensitive Text Field Similarity**:
   - Cleartext non-sensitive parameters (Name, Address, Parent Names) are matched using `RapidFuzz` (specifically `Jaro-Winkler` and `Token Set Ratio`) with configurable matching weights. This enables error tolerance without compromising the security of unique identity numbers.

---

## Development Roadmap

- **Phase 1**: Project Scaffolding and Environment Configuration (Completed)
- **Phase 2**: Database Schema Design & Migration Scripts
- **Phase 3**: Core Security Module Implementation (Bcrypt, Salt/Pepper SHA-256, JWT helper routines)
- **Phase 4**: Repository & Model Definitions (SQLAlchemy integration & interfaces)
- **Phase 5**: Identity Resolution & Similarity Scoring Engine (RapidFuzz orchestration)
- **Phase 6**: Service Logic Layer (Aadhaar, ABHA, DigiLocker orchestration)
- **Phase 7**: REST Endpoints & Route Blueprints
- **Phase 8**: Frontend Layout & Base Components (Vite, Tailwind, React Router)
- **Phase 9**: State Integration & Dashboard Visualization (Axios hook binds, Chart.js)
- **Phase 10**: Testing, CI Pipeline activation, Docker packaging, and Deployment

---

## Getting Started

Refer to [setup_guide.md](file:///c:/Users/revad/OneDrive/Desktop/Cross-System%20Identity%20Resolution%20Engine/docs/setup_guide.md) for full instructions.
