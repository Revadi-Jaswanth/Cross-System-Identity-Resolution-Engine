# Architecture Diagrams

This document contains Mermaid diagrams illustrating the VeriSync block architecture and the secure data resolution flow.

## 3-Tier Enterprise MVC Architecture

```mermaid
graph TD
    subgraph Client Layer (Frontend React + Vite)
        A[Browser / SPA Client] --> B[Vite Router & Pages]
        B --> C[Axios HTTP Client]
    end

    subgraph Service Layer (Flask Backend Gateway)
        C -->|HTTP / JSON + JWT| D[Flask Application Factory]
        D --> E[Blueprints Controllers]
        E --> F[Middleware & Request Validators]
        F --> G[Business Services Layer]
    end

    subgraph Security & Engine Units
        G --> H[Security Crypto Utils]
        G --> I[RapidFuzz Similarity Engine]
    end

    subgraph Persistence Layer (MySQL)
        G --> J[Repository Layer Interfaces]
        J --> K[SQLAlchemy Models]
        K --> L[(MySQL Database)]
    end

    classDef client fill:#f9f,stroke:#333,stroke-width:2px;
    classDef server fill:#bbf,stroke:#333,stroke-width:2px;
    classDef db fill:#fbf,stroke:#333,stroke-width:2px;
    classDef engine fill:#dfd,stroke:#333,stroke-width:2px;

    class A,B,C client;
    class D,E,F,G server;
    class H,I engine;
    class J,K,L db;
```

---

## Secure Identity Ingestion & Resolution Data Flow

This diagram demonstrates how identity attributes are securely processed. Notice that sensitive identifiers (e.g. Aadhaar, ABHA, DigiLocker, Phone, Email) are immediately hashed using SHA-256 and a server-side PEPPER secret. They are never kept in cleartext.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin Operator / Client
    participant API as Ingestion Blueprint API
    participant Sec as Security Utility (SHA-256 + Pepper)
    participant Engine as RapidFuzz Engine
    participant Repo as Repository Layer
    database DB as MySQL Database

    Admin->>API: Ingest Record JSON (Cleartext Aadhaar, Name, Mobile, Address...)
    Note over API: Middleware authenticates JWT & Validator validates formats

    API->>Sec: Extract & hash identifiers (Aadhaar, ABHA, Phone, Email)
    Note over Sec: Hashed ID = SHA256(Raw Value + PEPPER_SECRET)
    Sec-->>API: Return secure deterministic hashes

    API->>Repo: Lookup existing hashes in identities table
    Repo->>DB: Query hash matches
    DB-->>Repo: Return matched Identity cluster IDs (if any)

    alt Matching Hashes Found
        Note over API: Exact match confirmed. Record belongs to existing Cluster ID.
    else No Matching Hashes Found
        API->>Repo: Fetch names & addresses of potential candidate clusters
        Repo->>DB: Select candidate identifiers by secondary attributes
        DB-->>Repo: Return records
        API->>Engine: Run RapidFuzz on cleartext fields (Name, Address)
        Note over Engine: Calculate weighted Jaro-Winkler & Token Set similarity score
        Engine-->>API: Similarity metrics score percentage
        
        alt Score >= Configured Threshold (e.g. 85%)
            Note over API: Fuzzy match confirmed. Link record to existing Cluster ID.
        else Score < Configured Threshold
            Note over API: No match found. Initialize NEW Cluster ID.
        end
    end

    API->>Repo: Write record logs & update links
    Repo->>DB: INSERT / UPDATE records
    DB-->>Repo: Acknowledge write
    API-->>Admin: Return execution status & Cluster ID outcome
```
