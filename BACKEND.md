# Tsewa Backend — Infrastructure & Connection Guide

## VM Details

| Property | Value |
|----------|-------|
| **Hostname** | `savant-worker` |
| **Internal IP** | `10.128.0.2` |
| **External IP** | `34.45.244.68` |
| **OS** | Ubuntu 22.04.5 LTS |
| **Kernel** | 6.8.0-1053-gcp (Google Cloud) |
| **User** | `viraj` |
| **Disk** | 29GB total, ~1.3GB free |
| **Project Size** | 7.8MB (excluding node_modules) |

---

## Services Running

| Service | Version | Port | Bind Address | Status |
|---------|---------|------|-------------|--------|
| **PostgreSQL** | 14.22 | 5432 | localhost (127.0.0.1) | Running |
| **Redis** | 6.0.16 | 6379 | localhost (127.0.0.1, ::1) | Running |
| **Node.js** | 20.20.2 | — | — | Installed |
| **npm** | 10.8.2 | — | — | Installed |
| **Tsewa API** | 1.0.0 | 3001 | 0.0.0.0 | Start manually |

---

## PostgreSQL Database

### Connection Details

| Property | Value |
|----------|-------|
| **Host** | `localhost` (or `127.0.0.1`) |
| **Port** | `5432` |
| **Database** | `tsewa` |
| **User** | `tsewa` |
| **Password** | `tsewa_local_2024` |
| **Auth Method** | `scram-sha-256` (for TCP connections) |
| **Database Size** | ~10 MB (with seed data) |
| **Tables** | 22 + 1 (_prisma_migrations) |

### Connection String

```
postgresql://tsewa:tsewa_local_2024@localhost:5432/tsewa
```

### Connect via psql

```bash
# As the tsewa user (from the VM)
psql -h localhost -U tsewa -d tsewa

# As postgres superuser (peer auth, no password needed)
sudo -u postgres psql -d tsewa
```

### Connect from an Application

```javascript
// Prisma (already configured)
// In .env:
DATABASE_URL="postgresql://tsewa:tsewa_local_2024@localhost:5432/tsewa"

// node-postgres (pg)
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tsewa',
  user: 'tsewa',
  password: 'tsewa_local_2024',
});
```

### PostgreSQL Auth Config (`pg_hba.conf`)

```
# TYPE  DATABASE  USER  ADDRESS         METHOD
local   all       postgres               peer          # superuser, local socket
local   all       all                    peer          # all users, local socket
host    all       all    127.0.0.1/32    scram-sha-256 # TCP from localhost
host    all       all    ::1/128         scram-sha-256 # TCP from localhost (IPv6)
```

> **Note**: PostgreSQL only listens on `localhost`. To allow remote connections, you would need to:
> 1. Edit `/etc/postgresql/14/main/postgresql.conf` → set `listen_addresses = '*'`
> 2. Add a line to `pg_hba.conf` for the remote IP
> 3. Open port 5432 in the GCP firewall
> 4. Restart PostgreSQL: `sudo systemctl restart postgresql`

### PostgreSQL Management Commands

```bash
# Start / Stop / Restart
sudo systemctl start postgresql
sudo systemctl stop postgresql
sudo systemctl restart postgresql

# Check status
sudo systemctl status postgresql
pg_isready

# View logs
sudo journalctl -u postgresql -f

# List databases
sudo -u postgres psql -l

# Database shell
sudo -u postgres psql -d tsewa

# Useful SQL commands inside psql:
\dt                          -- list all tables
\d "User"                    -- describe User table
\d "Profile"                 -- describe Profile table
SELECT COUNT(*) FROM "User"; -- count users
\q                           -- quit
```

### Database Tables (22)

```
Core Identity:     User, Profile, Photo, ConversationPrompt
Matching:          Swipe, Match, DailyPick
Chat:              Message
Events & Feed:     Event, EventRsvp, FeedPost, FeedComment, FeedLike
Waitlist:          WaitlistEntry, InviteCode
Safety:            Block, Report
Rooms:             Room, RoomParticipant, RoomMessage, RoomScheduleRsvp,
                   TopicChannel, WatchPartyState
```

### Seed Data Counts

| Table | Count | Notes |
|-------|-------|-------|
| User | 20 | 10 female, 10 male |
| Profile | 20 | Complete with all fields |
| Photo | 71 | 3-4 per user (DiceBear avatars) |
| ConversationPrompt | 60 | 3 per user |
| WaitlistEntry | 20 | All APPROVED |
| InviteCode | 10 | TSEWA1-TSEWA10 |
| Event | 5 | April 2026 dates |
| FeedPost | 5 | Community posts |
| TopicChannel | 6 | Permanent channels |
| Room | 1 | "Friday Night Hangout" (LIVE) |
| RoomParticipant | 3 | Host + Speaker + Listener |

### Prisma Commands

```bash
cd /home/viraj/tsewa/apps/server

# Generate Prisma Client (after schema changes)
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration_name>

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (drops all data, re-migrates, re-seeds)
npx prisma migrate reset

# Re-seed data
npx prisma db seed

# Open Prisma Studio (visual DB editor on port 5555)
npx prisma studio

# View migration status
npx prisma migrate status

# Format schema file
npx prisma format
```

### Schema File Location

```
/home/viraj/tsewa/apps/server/prisma/schema.prisma
```

### Migration History

```
/home/viraj/tsewa/apps/server/prisma/migrations/
└── 20260412051530_init/    # Initial migration (all 22 tables)
    └── migration.sql
```

---

## Redis

### Connection Details

| Property | Value |
|----------|-------|
| **Host** | `localhost` (127.0.0.1) |
| **Port** | `6379` |
| **Password** | None (no auth) |
| **Bind** | `127.0.0.1 ::1` (localhost only) |
| **Current Keys** | ~2 (refresh tokens from test logins) |

### Connection String

```
redis://localhost:6379
```

### Connect via redis-cli

```bash
redis-cli
redis-cli ping              # Should return PONG
redis-cli DBSIZE            # Number of keys
redis-cli KEYS "*"          # List all keys (dev only!)
redis-cli FLUSHDB           # Clear all keys (dev only!)
```

### What Redis Stores

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `refresh:<userId>` | Refresh token for user | 7 days |
| `blacklist:<token>` | Blacklisted refresh tokens (after logout) | 7 days |

### Redis Management Commands

```bash
# Start / Stop / Restart
sudo systemctl start redis-server
sudo systemctl stop redis-server
sudo systemctl restart redis-server

# Check status
sudo systemctl status redis-server
redis-cli ping

# View logs
sudo journalctl -u redis-server -f

# Monitor all commands in real-time (dev debugging)
redis-cli MONITOR

# Get memory usage
redis-cli INFO memory | grep used_memory_human
```

---

## Tsewa API Server

### Location

```
/home/viraj/tsewa/apps/server/
```

### Start the Server

```bash
cd /home/viraj/tsewa/apps/server

# Development mode (auto-restart on file changes)
npx tsx watch src/index.ts

# Production mode (single run)
npx tsx src/index.ts

# Background mode
npx tsx src/index.ts > /tmp/tsewa-server.log 2>&1 &

# Using npm scripts
npm run dev     # tsx watch
npm run build   # compile TypeScript
npm start       # node dist/index.js (after build)
```

### Stop the Server

```bash
# Find and kill process on port 3001
fuser -k 3001/tcp

# Or find PID and kill
lsof -i :3001
kill <PID>
```

### Server Endpoints

```
http://localhost:3001           # Root (API info)
http://localhost:3001/api/health # Health check
ws://localhost:3001             # Socket.io WebSocket
http://localhost:3001/uploads/  # Static file serving (uploaded photos/voice)
```

### Health Check

```bash
curl http://localhost:3001/api/health
# Response: {"status":"ok","timestamp":"2026-04-12T07:30:41.351Z"}
```

### Test Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dolma.tenzin@tsewa.test","password":"password123"}'
```

### Upload Directories

```
/home/viraj/tsewa/apps/server/uploads/
├── photos/    # Uploaded profile photos (JPG/PNG/WebP, max 5MB)
└── voice/     # Uploaded voice notes (M4A/MP3/WebM, max 2MB)
```

Files are served at: `http://localhost:3001/uploads/photos/<filename>` and `http://localhost:3001/uploads/voice/<filename>`

---

## Environment Variables

### File Location

```
/home/viraj/tsewa/.env                  # Root (shared)
/home/viraj/tsewa/apps/server/.env      # Server copy
```

### Current Values

```env
DATABASE_URL=postgresql://tsewa:tsewa_local_2024@localhost:5432/tsewa
REDIS_URL=redis://localhost:6379
JWT_SECRET=tsewa-jwt-secret-change-in-production-2024
JWT_REFRESH_SECRET=tsewa-refresh-secret-change-in-production-2024
API_URL=http://localhost:3001
PORT=3001
UPLOAD_DIR=./uploads
CORS_ORIGIN=http://localhost:8081,http://localhost:19006,http://localhost:3000
```

### Changing Environment Variables

1. Edit `/home/viraj/tsewa/.env`
2. Copy to server: `cp /home/viraj/tsewa/.env /home/viraj/tsewa/apps/server/.env`
3. Restart the server

> **Important**: If you change `JWT_SECRET` or `JWT_REFRESH_SECRET`, all existing tokens become invalid and users must re-login.

---

## File Structure on Disk

```
/home/viraj/tsewa/                          # Project root
├── .env                                    # Environment variables
├── .gitignore
├── package.json                            # npm workspaces root
├── package-lock.json
├── TSEWA_DOCUMENTATION.md                  # Full technical docs
├── BACKEND.md                              # This file
│
├── apps/
│   ├── server/                             # Backend API
│   │   ├── .env                            # Server env (copy of root)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── uploads/                        # Uploaded files
│   │   │   ├── photos/
│   │   │   └── voice/
│   │   ├── prisma/
│   │   │   ├── schema.prisma              # Database schema (22 models)
│   │   │   ├── seed.ts                    # Seed script
│   │   │   └── migrations/
│   │   │       └── 20260412051530_init/   # Initial migration
│   │   └── src/
│   │       ├── index.ts                   # Entry point
│   │       ├── config/                    # env, prisma, redis
│   │       ├── middleware/                # auth, upload
│   │       ├── services/                  # Business logic (10 files)
│   │       ├── routes/                    # REST endpoints (11 files)
│   │       └── socket/                    # Realtime handlers (3 files)
│   │
│   └── mobile/                            # Expo Router frontend
│       ├── app/                           # Routes (31 files)
│       ├── src/                           # Source (34 files)
│       ├── assets/
│       ├── app.json
│       └── package.json
│
├── packages/
│   └── shared/                            # Shared types, validators, i18n
│       └── src/
│
└── node_modules/                          # Dependencies (~600MB)
```

---

## Common Operations

### Full Restart (Database + Server)

```bash
# 1. Ensure services are running
sudo systemctl start postgresql redis-server

# 2. Verify
pg_isready && redis-cli ping

# 3. Kill any existing server
fuser -k 3001/tcp 2>/dev/null

# 4. Start server
cd /home/viraj/tsewa/apps/server
npx tsx src/index.ts
```

### Reset Everything (Nuclear Option)

```bash
cd /home/viraj/tsewa/apps/server

# Reset database (drops all tables, re-migrates, re-seeds)
npx prisma migrate reset --force

# Clear Redis
redis-cli FLUSHDB

# Clear uploads
rm -rf uploads/photos/* uploads/voice/*

# Restart server
fuser -k 3001/tcp 2>/dev/null
npx tsx src/index.ts
```

### Add a New Database Table

```bash
cd /home/viraj/tsewa/apps/server

# 1. Edit the schema
nano prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name add_new_table

# 3. Regenerate client
npx prisma generate

# 4. Restart server to pick up changes
```

### View Server Logs

```bash
# If running in foreground — logs appear in terminal

# If running in background
tail -f /tmp/tsewa-server.log

# PostgreSQL logs
sudo journalctl -u postgresql -f

# Redis logs
sudo journalctl -u redis-server -f
```

### Backup Database

```bash
# Export full database
pg_dump -h localhost -U tsewa -d tsewa > tsewa_backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U tsewa -d tsewa < tsewa_backup_20260412.sql
```

---

## Network & Firewall

### Current Listening Ports

| Port | Service | Accessible From |
|------|---------|----------------|
| 5432 | PostgreSQL | localhost only |
| 6379 | Redis | localhost only |
| 3001 | Tsewa API | all interfaces (0.0.0.0) |
| 22 | SSH | external (GCP firewall) |

### Exposing the API Externally

The API server binds to `0.0.0.0:3001`, so it's accessible from the external IP if the GCP firewall allows it:

```
http://34.45.244.68:3001/api/health
```

To open port 3001 in GCP firewall:
```bash
gcloud compute firewall-rules create allow-tsewa-api \
  --allow tcp:3001 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow Tsewa API access"
```

### Exposing the Frontend (Expo Web)

```bash
cd /home/viraj/tsewa/apps/mobile

# Start Expo web on port 8081
npx expo start --web --port 8081
```

To access from outside the VM, open port 8081 in GCP firewall:
```bash
gcloud compute firewall-rules create allow-tsewa-web \
  --allow tcp:8081 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow Tsewa web access"
```

Then access at: `http://34.45.244.68:8081`

### Connecting Mobile App to this VM

In the mobile app, update the API URL:
```
# /home/viraj/tsewa/apps/mobile/src/lib/api.ts
# Change baseURL from localhost to the VM's external IP:
baseURL: 'http://34.45.244.68:3001/api'

# Also update socket.ts:
const SOCKET_URL = 'http://34.45.244.68:3001';
```

And update CORS in the server `.env`:
```
CORS_ORIGIN=http://localhost:8081,http://localhost:19006,http://34.45.244.68:8081
```

---

## Monitoring & Debugging

### Quick Health Check (All Services)

```bash
echo "PostgreSQL:" && pg_isready
echo "Redis:" && redis-cli ping
echo "API:" && curl -s http://localhost:3001/api/health | python3 -m json.tool
echo "DB tables:" && sudo -u postgres psql -d tsewa -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null
```

### Database Query Examples

```sql
-- Count all records
SELECT 'Users' as t, COUNT(*) FROM "User"
UNION ALL SELECT 'Profiles', COUNT(*) FROM "Profile"
UNION ALL SELECT 'Photos', COUNT(*) FROM "Photo"
UNION ALL SELECT 'Matches', COUNT(*) FROM "Match"
UNION ALL SELECT 'Messages', COUNT(*) FROM "Message"
UNION ALL SELECT 'Rooms', COUNT(*) FROM "Room";

-- Find a user
SELECT id, email, "isActive" FROM "User" WHERE email LIKE '%dolma%';

-- View profiles with regions
SELECT p."displayName", p.region, p."currentCity"
FROM "Profile" p
JOIN "User" u ON u.id = p."userId"
WHERE u."isActive" = true;

-- Check invite codes
SELECT code, "maxUses", "usedCount", "isActive" FROM "InviteCode";

-- View active rooms
SELECT r.title, r.status, r.type, COUNT(rp.id) as participants
FROM "Room" r
LEFT JOIN "RoomParticipant" rp ON rp."roomId" = r.id
GROUP BY r.id;

-- Recent messages
SELECT m.content, m.type, u.email as sender, m."createdAt"
FROM "Message" m
JOIN "User" u ON u.id = m."senderId"
ORDER BY m."createdAt" DESC
LIMIT 10;
```

### Redis Debugging

```bash
# See all stored keys
redis-cli KEYS "*"

# Check a specific refresh token
redis-cli GET "refresh:<userId>"

# Monitor all Redis operations in real-time
redis-cli MONITOR

# Memory usage
redis-cli INFO memory
```

---

## Test Credentials

| Email | Password | Region | Active |
|-------|----------|--------|--------|
| dolma.tenzin@tsewa.test | password123 | U-Tsang | Yes |
| lobsang.gyatso@tsewa.test | password123 | Kham | Yes |
| pema.choedron@tsewa.test | password123 | Amdo | Yes |
| karma.wangchuk@tsewa.test | password123 | Diaspora | Yes |

All 20 users: `{firstname}.{lastname}@tsewa.test` with password `password123`

Invite codes: `TSEWA1` through `TSEWA10` (5 uses each)

---

## Troubleshooting

### Server won't start — port 3001 in use

```bash
fuser -k 3001/tcp
# Then restart
```

### PostgreSQL connection refused

```bash
sudo systemctl start postgresql
pg_isready
```

### Redis connection refused

```bash
sudo systemctl start redis-server
redis-cli ping
```

### Prisma Client not found / outdated

```bash
cd /home/viraj/tsewa/apps/server
npx prisma generate
```

### Database schema out of sync

```bash
cd /home/viraj/tsewa/apps/server
npx prisma migrate dev
```

### Need to wipe and start fresh

```bash
npx prisma migrate reset --force
# This drops DB, re-runs all migrations, re-seeds
```

### Disk space low

```bash
df -h /
# Clean node_modules if needed:
rm -rf /home/viraj/tsewa/node_modules
npm install  # re-install
```
