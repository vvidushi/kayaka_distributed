# Local Infrastructure (Testing Only)

**Note:** Project uses cloud services (Supabase, MongoDB Atlas, Redis Cloud). This local setup is for testing only.

## Services

- Kafka (port 9092)
- Kafka Connect (port 8083)
- Kafdrop UI (http://localhost:9000)
- MySQL (port 3306)
- MongoDB (port 27017)
- Redis (port 6379)

## Usage

```bash
cd infra/local
docker compose up -d
docker compose down
```

**Credentials:**
- MySQL: `kayak` / `password`
- MongoDB: `root` / `password`
- Redis: No auth
