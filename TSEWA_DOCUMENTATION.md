# Tsewa - Tibetan Dating App
## Complete Technical Documentation

---

# Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [Socket.io Events](#7-socketio-events)
8. [Features](#8-features)
9. [Mobile App Screens](#9-mobile-app-screens)
10. [Feature Modules](#10-feature-modules)
11. [Theme & Design System](#11-theme--design-system)
12. [i18n — Internationalization](#12-i18n--internationalization)
13. [Seed Data](#13-seed-data)
14. [Setup & Deployment](#14-setup--deployment)
15. [Environment Variables](#15-environment-variables)
16. [NPM Packages](#16-npm-packages)
17. [Security](#17-security)
18. [Testing Credentials](#18-testing-credentials)

---

# 1. Overview

**Tsewa** (Tibetan: བརྩེ་བ, meaning "love" or "compassion") is a culturally-rooted dating app built specifically for the global Tibetan community. It combines modern dating mechanics with deep cultural identity, offering features that no mainstream dating app provides for Tibetans.

### Mission
Connect Tibetans worldwide through shared cultural identity, language, traditions, and values.

### Key Differentiators
- **Cultural Identity Fields**: Region (U-Tsang, Kham, Amdo, Diaspora), dialect, Buddhist practice tradition
- **Bilingual Interface**: Full English + Tibetan (བོད་སྐད) support
- **Discovery Categories**: Tinder Explore-style modes with both dating contexts (Going Out Tonight, Brunch Date) and cultural contexts (Losar Celebration, Teaching Companion, Language Exchange)
- **Clubhouse Audio Rooms**: Community voice rooms with host/speaker/listener model
- **Watch Parties**: Synced YouTube viewing with audio commentary
- **Community Events & Feed**: Cultural events, community content sharing
- **Invite-Only Access**: Exclusive waitlist model ensuring community quality

### Launch Model
- Invite-only via codes (TSEWA1 through TSEWA10)
- Users register, get placed on waitlist, redeem invite code to gain access
- Each approved user can generate up to 5 invite codes with 3 uses each

---

# 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | Expo (React Native) | SDK 54 |
| **Routing** | Expo Router | v6 |
| **State Management** | Zustand | v5 |
| **Data Fetching** | TanStack React Query | v5 |
| **Forms** | React Hook Form + Zod | v7 / v3 |
| **Animations** | Moti + React Native Reanimated | v0.29 / v3.17 |
| **Backend Framework** | Express.js | v4.21 |
| **Realtime** | Socket.io | v4.8 |
| **Database** | PostgreSQL | v14 |
| **ORM** | Prisma | v6.5 |
| **Cache/Sessions** | Redis (ioredis) | v5.4 |
| **Auth** | JWT (jsonwebtoken + bcryptjs) | v9 / v2.4 |
| **File Upload** | Multer | v1.4 |
| **HTTP Client** | Axios | v1.8 |
| **i18n** | i18next + react-i18next | v24 / v15 |
| **Language** | TypeScript | v5.8 |
| **Package Manager** | npm workspaces | v10.8 |

---

# 3. Architecture

## High-Level Architecture

```
+--------------------------------------------------+
|                    CLIENTS                        |
|  +--------------------+  +--------------------+  |
|  |   Expo Mobile App  |  |   Expo Web App     |  |
|  |   (iOS / Android)  |  |   (Browser)        |  |
|  +--------+-----------+  +--------+-----------+  |
|           |                        |              |
+-----------|------------------------|------ -------+
            |                        |
            v                        v
+--------------------------------------------------+
|              EXPRESS.JS SERVER (:3001)            |
|                                                  |
|  +------------------------------------------+   |
|  |            REST API (/api/*)              |   |
|  |  auth | profile | discovery | swipe      |   |
|  |  matches | messages | events | feed      |   |
|  |  rooms | waitlist | invite               |   |
|  +------------------------------------------+   |
|                                                  |
|  +------------------------------------------+   |
|  |         SOCKET.IO (ws://:3001)            |   |
|  |  Chat: messages, typing, read receipts   |   |
|  |  Rooms: join, speak, hand raise, chat    |   |
|  |  Watch Party: playback sync              |   |
|  |  Calls: offer, answer, ICE candidates    |   |
|  |  Presence: online/offline                |   |
|  +------------------------------------------+   |
|                                                  |
+----------+-------------------+-------------------+
           |                   |
           v                   v
+------------------+  +------------------+
|   PostgreSQL     |  |     Redis        |
|   (:5432)        |  |     (:6379)      |
|                  |  |                  |
|  22 tables       |  |  Refresh tokens  |
|  Full schema     |  |  Rate limiting   |
|  Seed data       |  |  Session cache   |
+------------------+  +------------------+
```

## Monorepo Workspace Layout

```
tsewa/                          # Root workspace
├── package.json                # npm workspaces config
├── .env                        # Environment variables
├── .gitignore
│
├── apps/
│   ├── mobile/                 # Expo Router app (mobile + web)
│   │   ├── app/                # File-based routes (Expo Router)
│   │   ├── src/                # Source code
│   │   │   ├── modules/        # Feature modules
│   │   │   ├── components/     # Shared UI components
│   │   │   ├── theme/          # Design system
│   │   │   ├── lib/            # Utilities (API, socket, storage)
│   │   │   └── hooks/          # Shared hooks
│   │   └── assets/             # Fonts, images
│   │
│   └── server/                 # Express.js backend
│       ├── src/
│       │   ├── routes/         # REST API endpoints
│       │   ├── services/       # Business logic
│       │   ├── socket/         # Socket.io handlers
│       │   ├── middleware/     # Auth, upload, rate limiting
│       │   └── config/         # DB, Redis, env config
│       └── prisma/             # Schema, migrations, seed
│
└── packages/
    └── shared/                 # Shared code (types, validators, constants)
        └── src/
            ├── types/
            ├── validators/     # Zod schemas
            ├── constants/      # Categories, prompts, regions
            └── i18n/           # Translation files (en, bo)
```

---

# 4. Project Structure

## Server Files (22 files)

```
apps/server/src/
├── index.ts                        # Entry: Express + Socket.io + HTTP server
├── config/
│   ├── env.ts                      # Typed environment config
│   ├── prisma.ts                   # Singleton PrismaClient
│   └── redis.ts                    # ioredis client
├── middleware/
│   ├── auth.middleware.ts          # JWT verification, req.user attachment
│   └── upload.middleware.ts        # Multer: photoUpload, voiceUpload
├── services/
│   ├── auth.service.ts             # Register, login, tokens, refresh
│   ├── profile.service.ts          # Profile CRUD, photos, prompts
│   ├── discovery.service.ts        # Deck algorithm, daily picks
│   ├── swipe.service.ts            # Swipe + match detection
│   ├── match.service.ts            # Match list, unmatch
│   ├── message.service.ts          # Messages, pagination, read status
│   ├── event.service.ts            # Events CRUD, RSVP
│   ├── feed.service.ts             # Feed posts, likes, comments
│   ├── room.service.ts             # Rooms CRUD, participants, channels
│   └── waitlist.service.ts         # Waitlist, invite codes
├── routes/
│   ├── index.ts                    # Route aggregator + /api/health
│   ├── auth.routes.ts              # /api/auth/*
│   ├── profile.routes.ts           # /api/profile/*
│   ├── discovery.routes.ts         # /api/discovery/*
│   ├── swipe.routes.ts             # /api/swipe
│   ├── match.routes.ts             # /api/matches/*
│   ├── message.routes.ts           # /api/messages/*
│   ├── event.routes.ts             # /api/events/*
│   ├── feed.routes.ts              # /api/feed/*
│   ├── room.routes.ts              # /api/rooms/*
│   └── waitlist.routes.ts          # /api/waitlist/*, /api/invite/*
└── socket/
    ├── index.ts                    # Socket.io setup + JWT auth middleware
    ├── chat.handler.ts             # 1:1 chat events
    └── room.handler.ts             # Room + watch party + audio events
```

## Mobile App Files (100+ files)

```
apps/mobile/
├── app/                            # Expo Router (file-based routing)
│   ├── _layout.tsx                 # Root: providers, auth gate
│   ├── index.tsx                   # Entry redirect
│   │
│   ├── (auth)/                     # Unauthenticated routes
│   │   ├── _layout.tsx             # Stack navigator
│   │   ├── welcome.tsx             # Landing screen
│   │   ├── login.tsx               # Login form
│   │   ├── register.tsx            # Registration form
│   │   ├── waitlist.tsx            # Waitlist + invite redemption
│   │   └── onboarding/            # 7-step profile creation
│   │       ├── _layout.tsx         # Progress bar header
│   │       ├── index.tsx           # Redirect to basics
│   │       ├── basics.tsx          # Name, DOB, gender, bio
│   │       ├── cultural.tsx        # Region, dialect, Buddhist practice
│   │       ├── lifestyle.tsx       # Education, languages, diet, family
│   │       ├── photos.tsx          # 2x3 photo grid upload
│   │       ├── prompts.tsx         # 3 conversation starters
│   │       ├── location.tsx        # City, country, GPS
│   │       └── categories.tsx      # Dating + cultural mode selection
│   │
│   └── (app)/                      # Authenticated routes
│       ├── _layout.tsx             # Auth guard, socket, call overlay
│       │
│       ├── (tabs)/                 # Bottom tab navigator (5 tabs)
│       │   ├── _layout.tsx         # Tab bar config
│       │   ├── discover/           # Tab 1: Swipe deck + daily picks
│       │   ├── matches/            # Tab 2: Match list + conversations
│       │   ├── rooms/              # Tab 3: Audio rooms + watch parties
│       │   ├── community/          # Tab 4: Events + feed
│       │   └── profile/            # Tab 5: Profile + settings
│       │
│       ├── chat/[matchId].tsx      # 1:1 chat screen
│       ├── call/[matchId].tsx      # Voice/video call screen
│       ├── room/
│       │   ├── [roomId]/
│       │   │   ├── index.tsx       # Audio room screen
│       │   │   └── watch.tsx       # Watch party screen
│       │   └── create.tsx          # Create room form
│       ├── profile-view/[userId].tsx  # View other profiles
│       ├── event/
│       │   ├── [eventId].tsx       # Event detail
│       │   └── create.tsx          # Create event
│       ├── feed/
│       │   ├── [postId].tsx        # Post detail
│       │   └── create.tsx          # Create post
│       └── settings/
│           ├── edit-profile.tsx    # Edit profile
│           └── language.tsx        # Language toggle
│
├── src/
│   ├── theme/
│   │   ├── colors.ts              # Color palette
│   │   ├── responsive.ts          # scale(), breakpoints, useResponsive()
│   │   ├── typography.ts          # Font sizes, families
│   │   └── index.ts               # Barrel export
│   │
│   ├── lib/
│   │   ├── api.ts                 # Axios instance + JWT interceptors
│   │   ├── socket.ts              # Socket.io singleton
│   │   ├── storage.ts             # SecureStore wrapper
│   │   └── queryClient.ts         # TanStack Query config
│   │
│   ├── components/ui/
│   │   ├── Button.tsx             # Primary/secondary/ghost/outline variants
│   │   ├── Input.tsx              # Labeled text input with validation
│   │   └── Avatar.tsx             # Circular image with online indicator
│   │
│   └── modules/
│       ├── auth/                  # Authentication
│       │   ├── api.ts
│       │   ├── hooks.ts
│       │   └── store.ts           # Zustand persisted store
│       ├── profile/               # Profile management
│       │   ├── api.ts
│       │   └── hooks.ts
│       ├── discovery/             # Swipe deck + categories
│       │   ├── api.ts
│       │   ├── hooks.ts
│       │   ├── store.ts
│       │   └── components/
│       │       ├── SwipeDeck.tsx
│       │       ├── ProfileCard.tsx
│       │       ├── CategoryChips.tsx
│       │       ├── ActionButtons.tsx
│       │       ├── DailyPickGrid.tsx
│       │       └── MatchModal.tsx
│       ├── matching/              # Match management
│       │   ├── api.ts
│       │   ├── hooks.ts
│       │   └── components/
│       │       └── MatchList.tsx
│       ├── chat/                  # Messaging
│       │   ├── api.ts
│       │   ├── hooks.ts
│       │   ├── store.ts
│       │   └── components/
│       │       ├── MessageBubble.tsx
│       │       ├── ChatInput.tsx
│       │       ├── TypingIndicator.tsx
│       │       ├── VoiceNote.tsx
│       │       ├── GifPicker.tsx
│       │       └── MediaPreview.tsx
│       ├── calling/               # Voice/video calls
│       │   ├── hooks.ts
│       │   ├── store.ts
│       │   └── components/
│       │       ├── CallScreen.tsx
│       │       └── IncomingCallOverlay.tsx
│       ├── rooms/                 # Audio rooms
│       │   ├── api.ts
│       │   ├── hooks.ts
│       │   ├── store.ts
│       │   └── components/
│       │       ├── RoomList.tsx
│       │       ├── RoomScreen.tsx
│       │       ├── SpeakerAvatar.tsx
│       │       └── CreateRoomForm.tsx
│       ├── watchParty/            # Watch parties
│       │   ├── api.ts
│       │   ├── hooks.ts
│       │   └── components/
│       │       ├── WatchPartyScreen.tsx
│       │       ├── VideoPlayer.tsx
│       │       └── ReactionBurst.tsx
│       ├── events/                # Community events
│       │   ├── api.ts
│       │   ├── hooks.ts
│       │   └── components/
│       │       ├── EventCard.tsx
│       │       ├── EventDetail.tsx
│       │       └── CreateEventForm.tsx
│       ├── feed/                  # Community feed
│       │   ├── api.ts
│       │   ├── hooks.ts
│       │   └── components/
│       │       ├── FeedCard.tsx
│       │       ├── CommentSheet.tsx
│       │       └── CreatePost.tsx
│       ├── waitlist/              # Invite system
│       │   ├── api.ts
│       │   ├── hooks.ts
│       │   └── components/
│       │       └── InviteShare.tsx
│       └── i18n/                  # Internationalization
│           ├── config.ts
│           └── hooks.ts
```

---

# 5. Database Schema

## Entity Relationship Overview

The database contains **22 models** organized into 7 domains:

### Domain: User Identity (4 models)

**User**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| email | String | Unique, indexed |
| passwordHash | String | bcrypt hashed |
| isActive | Boolean | false until approved from waitlist |
| isVerified | Boolean | Email verification status |
| lastActiveAt | DateTime | Last activity timestamp |
| createdAt | DateTime | Registration time |
| updatedAt | DateTime | Auto-updated |

**Profile**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Unique FK to User |
| displayName | String | Display name |
| birthDate | DateTime | Date of birth |
| gender | String | male, female, non-binary, other |
| bio | Text | Optional bio (500 chars) |
| height | Int | Height in cm (optional) |
| region | Enum | U_TSANG, KHAM, AMDO, DIASPORA |
| dialect | Enum | LHASA, KHAM, AMDO, OTHER |
| buddhaPractice | Enum | GELUG, KAGYU, NYINGMA, SAKYA, BON, SECULAR, OTHER |
| hometown | String | Hometown (optional) |
| education | String | Education level |
| profession | String | Current profession |
| languages | String[] | Array of languages spoken |
| diet | Enum | VEGETARIAN, VEGAN, NON_VEGETARIAN, FLEXIBLE |
| familyViews | Enum | WANT_CHILDREN, OPEN_TO_CHILDREN, DO_NOT_WANT, HAVE_CHILDREN, UNDECIDED |
| smoking | Boolean | Smoker (optional) |
| drinking | Boolean | Drinker (optional) |
| currentCity | String | Current city |
| currentCountry | String | Current country |
| latitude | Float | GPS latitude |
| longitude | Float | GPS longitude |
| lookingForGender | String[] | Gender preferences |
| ageMin | Int | Min age preference (default 18) |
| ageMax | Int | Max age preference (default 50) |
| maxDistance | Int | Max distance in km (default 100) |
| regionFilter | Region[] | Preferred regions |
| activeCategories | String[] | Active dating/cultural modes (max 3) |

**Photo**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | FK to User |
| url | String | Image URL / path |
| position | Int | Display order (0-based) |
| isMain | Boolean | Main profile photo |

**ConversationPrompt**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | FK to User |
| question | String | Prompt question text |
| answer | Text | User's answer (10-300 chars) |
| position | Int | Display order |

### Domain: Matching (3 models)

**Swipe**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| swiperId | String | FK to User who swiped |
| swipedId | String | FK to User who was swiped on |
| action | Enum | LIKE, PASS, SUPER_LIKE |
| createdAt | DateTime | Timestamp |
| | | Unique constraint: [swiperId, swipedId] |

**Match**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| userAId | String | FK to first User |
| userBId | String | FK to second User |
| isActive | Boolean | true until unmatched |
| chatRoom | String | Unique Socket.io room ID |
| createdAt | DateTime | Match timestamp |

**DailyPick**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| forUserId | String | FK to User receiving pick |
| pickedUserId | String | FK to picked User |
| date | Date | Pick date (unique per user per day) |

### Domain: Chat (1 model)

**Message**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| matchId | String | FK to Match |
| senderId | String | FK to sender User |
| type | Enum | TEXT, IMAGE, VOICE, VIDEO_CALL_INVITE, GIF, SYSTEM |
| content | Text | Message content or media URL |
| metadata | JSON | Extra data (duration for voice, dimensions for image) |
| isRead | Boolean | Read status |
| createdAt | DateTime | Sent timestamp |

### Domain: Events & Feed (4 models)

**Event**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| creatorId | String | FK to User |
| title | String | Event title |
| titleTib | String | Tibetan title (optional) |
| description | Text | Full description |
| descTib | Text | Tibetan description (optional) |
| type | Enum | LOSAR, TEACHING, COMMUNITY, SOCIAL, CULTURAL, OTHER |
| imageUrl | String | Event image |
| location / city / country | String | Physical location |
| latitude / longitude | Float | GPS coordinates |
| startDate / endDate | DateTime | Event timing |
| isOnline | Boolean | Online event flag |
| link | String | Video call link for online events |
| maxAttendees | Int | Capacity limit |

**EventRsvp** — userId + eventId (unique pair)

**FeedPost**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| authorId | String | FK to User |
| type | Enum | TEXT, PHOTO, LINK, EVENT_SHARE |
| content | Text | Post content |
| imageUrl | String | Attached image |
| linkUrl | String | Attached link |

**FeedComment** — postId, authorId, content
**FeedLike** — postId, userId (unique pair, toggle)

### Domain: Waitlist & Invites (2 models)

**WaitlistEntry**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Unique FK to User |
| status | Enum | PENDING, APPROVED, REJECTED |
| inviteCode | String | Code used to join |
| referredBy | String | Referring user ID |
| approvedAt | DateTime | Approval timestamp |

**InviteCode**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| code | String | Unique 6-char alphanumeric |
| inviterId | String | FK to User who created it |
| maxUses | Int | Max redemptions (default 3) |
| usedCount | Int | Current redemptions |
| isActive | Boolean | Active status |
| expiresAt | DateTime | Expiration (optional) |

### Domain: Safety (2 models)

**Block** — blockerId + blockedId (unique pair)
**Report** — reporterId, targetUserId, reason

### Domain: Rooms (6 models)

**Room**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| hostId | String | FK to host User |
| title | String | Room title |
| description | Text | Room description |
| type | Enum | OPEN, SCHEDULED, TOPIC_CHANNEL, EVENT_LINKED |
| topicTag | String | Topic label |
| status | Enum | WAITING, LIVE, ENDED |
| scheduledAt | DateTime | For scheduled rooms |
| eventId | String | Unique FK to Event (for event-linked rooms) |
| maxSpeakers | Int | Speaker cap (default 8) |
| isWatchParty | Boolean | Watch party flag |
| videoUrl | String | YouTube URL for watch parties |

**RoomParticipant**
| Column | Type | Description |
|--------|------|-------------|
| id | String (cuid) | Primary key |
| roomId | String | FK to Room |
| userId | String | FK to User |
| role | Enum | HOST, SPEAKER, LISTENER |
| handRaised | Boolean | Hand raise status |
| isMuted | Boolean | Mute status |
| joinedAt | DateTime | Join timestamp |

**RoomMessage** — roomId, userId, content (text chat within rooms)
**RoomScheduleRsvp** — roomId, userId (RSVP for scheduled rooms)
**TopicChannel** — name, nameTib, description, iconEmoji, position (permanent channels)
**WatchPartyState** — roomId, videoUrl, isPlaying, currentTime, updatedAt (synced playback)

---

# 6. API Reference

Base URL: `http://localhost:3001/api`

All authenticated routes require: `Authorization: Bearer <accessToken>`

## Authentication

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | `{ email, password, inviteCode? }` | Register new user |
| POST | `/auth/login` | `{ email, password }` | Login, returns JWT pair |
| POST | `/auth/refresh` | `{ refreshToken }` | Refresh access token |
| POST | `/auth/logout` | — | Invalidate refresh token |

**Register Response:**
```json
{
  "user": { "id": "cuid", "email": "...", "isActive": false },
  "accessToken": "jwt...",
  "refreshToken": "jwt..."
}
```

**Login Response:**
```json
{
  "user": { "id": "cuid", "email": "...", "isActive": true },
  "accessToken": "jwt...",
  "refreshToken": "jwt..."
}
```

## Profile

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/profile` | — | Get current user's profile |
| PUT | `/profile` | Profile fields | Update/create profile |
| POST | `/profile/photos` | multipart (photo) | Upload photo (max 6) |
| DELETE | `/profile/photos/:id` | — | Delete a photo |
| POST | `/profile/prompts` | `{ question, answer }` | Add conversation prompt (max 5) |
| PUT | `/profile/categories` | `{ activeCategories: [] }` | Update active categories |

## Discovery

| Method | Endpoint | Query Params | Description |
|--------|----------|-------------|-------------|
| GET | `/discovery/deck` | `?category=&limit=20` | Get swipe deck profiles |
| GET | `/discovery/daily-picks` | — | Get 5-10 curated daily picks |

**Deck Algorithm:**
1. Filter by user's gender preference, age range, region filter
2. Exclude already-swiped users
3. Exclude blocked users (both directions)
4. If category specified: filter by `activeCategories` array overlap
5. Order by lastActiveAt DESC + random shuffle
6. Return with photos and prompts

**Daily Picks Algorithm:**
1. Check if picks already exist for today
2. If not, generate 5-10 profiles with 2x weight for same region/dialect
3. Store in DailyPick table for the day
4. Refresh at midnight

## Swipe & Matching

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/swipe` | `{ targetUserId, action }` | LIKE, PASS, or SUPER_LIKE |
| GET | `/matches` | — | Get all active matches |
| DELETE | `/matches/:id` | — | Unmatch |

**Swipe Response:**
```json
{ "matched": true, "matchId": "cuid" }
```

**Match Detection:** When a LIKE or SUPER_LIKE is reciprocated, a Match is automatically created with a unique chatRoom ID.

## Messages

| Method | Endpoint | Query/Body | Description |
|--------|----------|-----------|-------------|
| GET | `/messages/:matchId` | `?cursor=&limit=50` | Get paginated messages |
| POST | `/messages/:matchId/upload` | multipart (file) | Upload media (photo/voice) |

## Events

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/events` | Event data | Create event |
| GET | `/events` | `?type=&city=` | List events |
| GET | `/events/:id` | — | Get event detail |
| PUT | `/events/:id` | Event data | Update event (creator only) |
| DELETE | `/events/:id` | — | Delete event (creator only) |
| POST | `/events/:id/rsvp` | — | Toggle RSVP |

## Feed

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/feed` | `{ content, type, imageUrl?, linkUrl? }` | Create post |
| GET | `/feed` | `?cursor=&limit=20` | Get feed (paginated) |
| GET | `/feed/:id` | — | Get post with comments |
| DELETE | `/feed/:id` | — | Delete post (author only) |
| POST | `/feed/:id/like` | — | Toggle like |
| POST | `/feed/:id/comment` | `{ content }` | Add comment |

## Rooms

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/rooms` | `{ title, description?, type, topicTag?, scheduledAt?, isWatchParty?, videoUrl? }` | Create room |
| GET | `/rooms` | `?status=LIVE&type=OPEN` | List rooms |
| GET | `/rooms/:id` | — | Get room with participants |
| DELETE | `/rooms/:id` | — | End room (host only) |
| POST | `/rooms/:id/join` | — | Join room as listener |
| POST | `/rooms/:id/leave` | — | Leave room |
| POST | `/rooms/:id/raise-hand` | — | Toggle hand raise |
| POST | `/rooms/:id/invite-speaker` | `{ userId }` | Host invites speaker |
| POST | `/rooms/:id/mute-speaker` | `{ userId }` | Host mutes speaker |
| POST | `/rooms/:id/remove-speaker` | `{ userId }` | Demote to listener |
| GET | `/rooms/:id/messages` | — | Room chat history |
| POST | `/rooms/:id/messages` | `{ content }` | Send room chat message |
| GET | `/rooms/channels` | — | List topic channels |
| GET | `/rooms/scheduled` | — | Upcoming scheduled rooms |
| POST | `/rooms/:id/rsvp` | — | RSVP for scheduled room |
| POST | `/rooms/:id/watch-party` | `{ isPlaying?, currentTime?, videoUrl? }` | Update watch party state (host) |

## Waitlist & Invites

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/waitlist/status` | — | Get waitlist position/status |
| POST | `/invite/redeem` | `{ code }` | Redeem invite code |
| POST | `/invite/generate` | — | Generate new invite code |

---

# 7. Socket.io Events

Connection: `ws://localhost:3001` with auth token in handshake.

## 1:1 Chat Events

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| Client -> Server | `join_chat` | `matchId` | Join a match's chat room |
| Client -> Server | `send_message` | `{ matchId, type, content, metadata? }` | Send message |
| Client -> Server | `typing_start` | `matchId` | Start typing indicator |
| Client -> Server | `typing_stop` | `matchId` | Stop typing indicator |
| Client -> Server | `mark_read` | `{ matchId, messageId }` | Mark messages as read |
| Server -> Client | `new_message` | Message object | New message received |
| Server -> Client | `user_typing` | `{ matchId, userId }` | Other user is typing |
| Server -> Client | `user_stopped_typing` | `{ matchId, userId }` | Other user stopped typing |
| Server -> Client | `message_read` | `{ matchId, messageId, readAt }` | Message read receipt |
| Server -> Client | `new_match` | `{ match, otherUser }` | New match notification |

## Room Events (Clubhouse)

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| Client -> Server | `room:join` | `roomId` | Join audio room |
| Client -> Server | `room:leave` | `roomId` | Leave room |
| Client -> Server | `room:raise_hand` | `roomId` | Toggle hand raise |
| Client -> Server | `room:lower_hand` | `roomId` | Lower hand |
| Client -> Server | `room:send_message` | `{ roomId, content }` | Send room chat |
| Client -> Server | `room:toggle_mute` | `roomId` | Toggle mute |
| **Host only:** | | | |
| Client -> Server | `room:invite_speaker` | `{ roomId, userId }` | Promote to speaker |
| Client -> Server | `room:remove_speaker` | `{ roomId, userId }` | Demote to listener |
| Client -> Server | `room:mute_speaker` | `{ roomId, userId }` | Force mute speaker |
| Client -> Server | `room:end_room` | `roomId` | End the room |
| **Server broadcasts:** | | | |
| Server -> Client | `room:participant_joined` | Participant data | New participant |
| Server -> Client | `room:participant_left` | `{ userId }` | Participant left |
| Server -> Client | `room:hand_raised` | `{ userId, handRaised }` | Hand raise toggle |
| Server -> Client | `room:speaker_added` | `{ userId }` | New speaker |
| Server -> Client | `room:speaker_removed` | `{ userId }` | Speaker demoted |
| Server -> Client | `room:speaker_muted` | `{ userId, isMuted }` | Speaker muted |
| Server -> Client | `room:new_message` | Message data | Room chat message |
| Server -> Client | `room:ended` | — | Room ended |
| Server -> Client | `room:participant_count` | `count` | Updated count |

## Watch Party Events

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| Client -> Server (host) | `room:wp_play` | `{ roomId }` | Play video |
| Client -> Server (host) | `room:wp_pause` | `{ roomId }` | Pause video |
| Client -> Server (host) | `room:wp_seek` | `{ roomId, time }` | Seek to time |
| Client -> Server (host) | `room:wp_change_video` | `{ roomId, videoUrl }` | Change video |
| Server -> Client | `room:wp_state_update` | `{ isPlaying, currentTime, videoUrl }` | Sync playback |

## Audio Signaling (WebRTC in rooms)

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| Client -> Server | `room:audio_offer` | `{ roomId, targetUserId, sdp }` | WebRTC offer |
| Client -> Server | `room:audio_answer` | `{ roomId, targetUserId, sdp }` | WebRTC answer |
| Client -> Server | `room:audio_ice_candidate` | `{ roomId, targetUserId, candidate }` | ICE candidate |

## 1:1 Call Events

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| Client -> Server | `call_offer` | `{ matchId, sdp }` | Initiate call |
| Client -> Server | `call_answer` | `{ matchId, sdp }` | Accept call |
| Client -> Server | `call_end` | `matchId` | End call |
| Server -> Client | `call_incoming` | `{ matchId, from, sdp }` | Incoming call |
| Server -> Client | `call_answered` | `{ matchId, sdp }` | Call accepted |
| Server -> Client | `call_ended` | `matchId` | Call ended |

## Presence

| Direction | Event | Description |
|-----------|-------|-------------|
| Server -> Client | `user_online` | User came online |
| Server -> Client | `user_offline` | User went offline |

---

# 8. Features

## 8.1 Swipe Matching with Categories

### Discovery Categories
Two groups of context modes that filter the swipe deck:

**Dating Contexts:**
| Category | Emoji | Tibetan |
|----------|-------|---------|
| Going Out Tonight | 🌙 | དགོང་མོ་ཕྱིར་འགྲོ |
| Brunch Date | 🥂 | ཉིན་གུང་ཟ་མ |
| Coffee Date | ☕ | ཇ་འཐུང |
| Study Buddy | 📚 | སློབ་གྲོགས |
| Adventure Partner | 🏔️ | འགྲུལ་གྲོགས |
| Festival Companion | 🎉 | དུས་ཆེན་གྲོགས |

**Cultural Contexts:**
| Category | Emoji | Tibetan |
|----------|-------|---------|
| Losar Celebration | 🎊 | ལོ་གསར་སྲུང |
| Teaching Companion | 🙏 | ཆོས་གྲོགས |
| Language Exchange | 🗣️ | སྐད་རིགས་བརྗེ་རེས |
| Diaspora Connect | 🌍 | མཐའ་འཁོར་འབྲེལ |
| Homecoming | 🏠 | ཕ་ཡུལ་ལོག |
| Cultural Event Buddy | 🎭 | རིག་གཞུང་གྲོགས |

**How it works:**
- Users set 1-3 active categories during onboarding and in settings
- Horizontal scrollable category chips appear at top of Discover tab
- "All" mode (default) shows standard unfiltered deck
- Selecting a category filters to users who also have that category active
- PostgreSQL array overlap operator (`&&`) for efficient filtering

### Swipe Mechanics
- **Custom gesture-based card stack** built with react-native-gesture-handler + react-native-reanimated
- 3 cards visible (current + 2 behind with progressive scale/offset)
- Swipe right (120px threshold) = LIKE
- Swipe left (120px threshold) = PASS
- Swipe up (100px threshold) = SUPER LIKE
- Card rotation follows horizontal drag (rotateZ = dragX * 0.1 degrees)
- Colored overlay labels fade in based on swipe progress
- Spring animation for snap-back on incomplete swipe
- Action buttons below deck for tap-to-swipe

### Match Detection
When User A likes User B, the server checks if User B has already liked User A. If yes:
1. Match record created with consistent userA/userB ordering
2. Unique chatRoom ID generated
3. Socket event `new_match` emitted to both users
4. MatchModal shown with celebration animation

## 8.2 Daily Curated Picks

- 5-10 profiles generated daily, refreshed at midnight
- Algorithm weights 2x for same region and dialect
- Displayed in responsive grid (2 columns mobile, 3 columns tablet)
- Countdown timer shows time until next refresh
- Stored in DailyPick table (unique per user per day)
- Accessed via toggle in Discover tab

## 8.3 Rich Chat

### Text Messaging
- Real-time via Socket.io (emit → persist → broadcast)
- Cursor-based pagination for history
- Typing indicators (debounced, auto-stop after 3 seconds)
- Read receipts
- Message bubbles: lavender (sent), white (received)
- Grouped consecutive messages from same sender

### Voice Notes
- Hold-to-record using expo-av
- Animated waveform visualization during recording
- Recording timer
- Playback with progress bar and duration
- Uploaded as media file, stored as VOICE type message

### Photo Sharing
- expo-image-picker for gallery/camera selection
- MediaPreview for full-screen preview before sending
- Uploaded via multipart form, stored as IMAGE type message

### GIF Support
- GIF picker powered by Tenor API
- Search with debounced input
- 2-column grid of GIF thumbnails
- Trending GIFs on initial load
- Sent as GIF type message with URL

## 8.4 Voice/Video Calling

### Architecture
- Simulated calling UI (production-ready design, demo-mode for launch)
- Socket.io signaling for call state management
- Call offer/answer/end flow

### Call Screen UI
- **Video call**: Dark background, large remote avatar, small local preview, timer, controls
- **Audio call**: Centered avatar with pulsing lavender ring animation, name, status, timer
- Controls: mute, camera toggle (video only), speaker toggle, end call (red)

### Incoming Call Overlay
- Global overlay rendered on top of all screens
- Dark semi-transparent backdrop
- Pulsing avatar animation
- Accept (green) / Reject (red) buttons
- Slide-up entrance animation

## 8.5 Clubhouse Audio Rooms

### Room Types
1. **Open** — Anyone creates anytime, instant LIVE
2. **Scheduled** — Future start time, users RSVP
3. **Topic Channel** — Permanent rooms (seeded): Dharma Talk, Dating Advice, Tibetan Music, Language Practice, Kham Corner, Amdo Corner
4. **Event-Linked** — Auto-created when an Event goes live

### Participant Roles
| Role | Capabilities |
|------|-------------|
| **Host** | Speak, invite/remove/mute speakers, end room |
| **Speaker** | Speak, mute self, leave |
| **Listener** | Listen, raise hand, text chat, leave |

### Room Screen Layout
- **Header**: Room title, participant count, leave button
- **Speakers section** (top): Grid of speaker avatars (up to 8), animated lavender border when speaking, mute/crown badges
- **Listeners section** (middle): Smaller avatar grid, hand-raised badges
- **Chat section** (bottom 30%): Scrollable text chat, input bar
- **Controls bar**: Mute toggle, raise hand (listeners), leave

### Audio Implementation
- WebRTC peer-mesh pattern for speakers (each connects to every other)
- Socket.io for signaling (offer/answer/ICE candidates)
- Cap at 8 speakers per room
- STUN server: `stun:stun.l.google.com:19302`

## 8.6 Watch Parties

### How It Works
1. Host creates a room with `isWatchParty: true` and sets a YouTube URL
2. All participants see the same video player
3. Host controls playback (play/pause/seek)
4. Socket.io syncs playback state to all clients
5. Audio room runs simultaneously for voice commentary
6. Text chat available alongside video
7. Emoji reaction bursts overlay the video

### Watch Party Screen Layout
- **Top 55%** (dark): YouTube player (react-native-youtube-iframe), video URL bar, reaction burst overlay
- **Bottom 45%** (light): Mini audio room — horizontal speaker avatars, chat messages, input bar, controls

### Sync Protocol
- Host emits `room:wp_play`, `room:wp_pause`, `room:wp_seek` events
- Server broadcasts `room:wp_state_update` to all participants
- Clients receive state and sync their YouTube player position
- WatchPartyState record persisted in database

## 8.7 Events & Community Feed

### Events
- CRUD for community events
- Types: Losar, Teaching, Community, Social, Cultural, Other
- RSVP toggle with attendee count
- Online event support with video call links
- Event-linked rooms auto-created when event goes live
- Bilingual titles/descriptions (English + Tibetan)

### Feed
- Community social feed for sharing cultural content
- Post types: Text, Photo, Link, Event Share
- Like toggle with count (optimistic UI)
- Comments with author avatars
- Infinite scroll pagination

## 8.8 Invite-Only Waitlist

### Registration Flow
1. User registers with email + password + optional invite code
2. WaitlistEntry created with status PENDING
3. If valid invite code provided → auto-approved (APPROVED, isActive = true)
4. Without invite code → user sees waitlist screen with position
5. Can enter invite code later to get approved

### Invite Codes
- 6-character alphanumeric codes (e.g., TSEWA1)
- Each code has maxUses (default 3) and usedCount
- Approved users can generate up to 5 codes
- Codes can have expiration dates
- Native share sheet for distributing codes

---

# 9. Mobile App Screens

## Auth Flow (Unauthenticated)

| Screen | Route | Description |
|--------|-------|-------------|
| Welcome | `/(auth)/welcome` | Branded landing with Tibetan script "བརྩེ་བ", Get Started + Login |
| Login | `/(auth)/login` | Email + password form, RHF + Zod validation |
| Register | `/(auth)/register` | Registration with invite code field |
| Waitlist | `/(auth)/waitlist` | Position display, invite code redemption, share invites |

## Onboarding (7 Steps)

| Step | Route | Fields |
|------|-------|--------|
| 1. Basics | `/(auth)/onboarding/basics` | Display name, birth date, gender, bio, height |
| 2. Cultural | `/(auth)/onboarding/cultural` | Region, dialect, Buddhist practice, hometown |
| 3. Lifestyle | `/(auth)/onboarding/lifestyle` | Education, profession, languages, diet, family views |
| 4. Photos | `/(auth)/onboarding/photos` | 2x3 photo grid, min 2 required |
| 5. Prompts | `/(auth)/onboarding/prompts` | Pick 3 of 15 conversation starters |
| 6. Location | `/(auth)/onboarding/location` | City, country, GPS toggle |
| 7. Categories | `/(auth)/onboarding/categories` | Select 1-3 dating/cultural modes |

## Main App (5 Tabs)

| Tab | Icon | Route | Content |
|-----|------|-------|---------|
| Discover | Heart | `/(app)/(tabs)/discover` | Category chips + swipe deck / daily picks |
| Matches | Chat | `/(app)/(tabs)/matches` | New matches row + conversation list |
| Rooms | Mic | `/(app)/(tabs)/rooms` | Live rooms, scheduled, topic channels |
| Community | People | `/(app)/(tabs)/community` | Events / Feed segmented tabs |
| Profile | Person | `/(app)/(tabs)/profile` | Profile view, settings, logout |

## Detail Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Chat | `/(app)/chat/[matchId]` | 1:1 messaging with media support |
| Call | `/(app)/call/[matchId]` | Audio/video call UI |
| Room | `/(app)/room/[roomId]` | Audio room or watch party |
| Watch Party | `/(app)/room/[roomId]/watch` | Synced video + audio room |
| Create Room | `/(app)/room/create` | Create room form |
| Profile View | `/(app)/profile-view/[userId]` | Full profile with like/pass |
| Event Detail | `/(app)/event/[eventId]` | Event info + RSVP |
| Create Event | `/(app)/event/create` | Event creation form |
| Post Detail | `/(app)/feed/[postId]` | Post with comments |
| Create Post | `/(app)/feed/create` | New post form |
| Edit Profile | `/(app)/settings/edit-profile` | Edit all profile fields |
| Language | `/(app)/settings/language` | English/Tibetan toggle |

---

# 10. Feature Modules

Each module follows the same pattern:

```
module/
├── api.ts          # API functions (axios calls)
├── hooks.ts        # React Query hooks + socket hooks
├── store.ts        # Zustand state (if needed)
└── components/     # UI components
```

| Module | Files | Key Components |
|--------|-------|----------------|
| `auth` | api, hooks, store | Login/register mutations, JWT persisted store |
| `profile` | api, hooks | Profile CRUD, photo upload, prompts |
| `discovery` | api, hooks, store, 6 components | SwipeDeck, ProfileCard, CategoryChips, ActionButtons, DailyPickGrid, MatchModal |
| `matching` | api, hooks, 1 component | MatchList (new matches + conversations) |
| `chat` | api, hooks, store, 6 components | MessageBubble, ChatInput, TypingIndicator, VoiceNote, GifPicker, MediaPreview |
| `calling` | hooks, store, 2 components | CallScreen, IncomingCallOverlay |
| `rooms` | api, hooks, store, 4 components | RoomList, RoomScreen, SpeakerAvatar, CreateRoomForm |
| `watchParty` | api, hooks, 3 components | WatchPartyScreen, VideoPlayer, ReactionBurst |
| `events` | api, hooks, 3 components | EventCard, EventDetail, CreateEventForm |
| `feed` | api, hooks, 3 components | FeedCard, CommentSheet, CreatePost |
| `waitlist` | api, hooks, 1 component | InviteShare |
| `i18n` | config, hooks | Language initialization + toggle |

---

# 11. Theme & Design System

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| **Lavender** | `#9B8EC4` | Primary actions, sent messages, active states |
| Lavender Light | `#B8AED6` | Hover states, light backgrounds |
| Lavender Dark | `#7A6FA8` | Pressed states |
| **Peach** | `#F4A883` | Secondary actions, highlights, badges |
| Peach Light | `#F7C4A8` | Hover states |
| Peach Dark | `#E8906A` | Pressed states |
| **Soft White** | `#F8F4F0` | Page backgrounds |
| White | `#FFFFFF` | Card backgrounds, received messages |
| Black | `#1A1A1A` | Primary text, dark backgrounds |
| Gray 100-600 | `#F5F5F5` - `#4A4A4A` | Borders, secondary text, disabled |
| Success | `#4CAF50` | Online indicators, accept buttons |
| Error | `#E53935` | Errors, end call, delete |
| Warning | `#FF9800` | Warnings |

## Responsive System

Base width: **390px** (iPhone 14)

```typescript
scale(size)         // Proportional to screen width
verticalScale(size) // Proportional to screen height
moderateScale(size) // Balanced scale (0.5 factor)
```

**Breakpoints:**
| Name | Width | Columns |
|------|-------|---------|
| Mobile | 0-639px | 1-2 |
| Tablet | 640-1023px | 2-3 |
| Desktop | 1024px+ | 3-4 |

## Typography

| Preset | Size | Weight | Usage |
|--------|------|--------|-------|
| hero | 36px | Bold | Welcome screen title |
| h1 | 28px | Bold | Page titles |
| h2 | 22px | SemiBold | Section headers |
| h3 | 18px | SemiBold | Card titles |
| body | 16px | Regular | Body text |
| bodySmall | 14px | Regular | Secondary text |
| caption | 12px | Regular | Timestamps, labels |

**Tibetan Font**: Jomolhari (Google Fonts, loaded via expo-font)

## Component Patterns

- **Cards**: borderRadius `scale(16)`, white background, subtle shadow
- **Buttons**: 4 variants (primary/lavender, secondary/peach, ghost, outline), 3 sizes (sm/md/lg)
- **Inputs**: Labeled, focus state (lavender border), error state (red border)
- **Avatars**: 4 sizes (sm/32, md/48, lg/80, xl/120), online indicator dot
- **Badges**: Small colored pills for regions, event types, categories
- **Animations**: Moti for declarative (fade, slide, scale), Reanimated for gesture-driven

---

# 12. i18n — Internationalization

## Supported Languages

| Code | Language | Script |
|------|----------|--------|
| `en` | English | Latin |
| `bo` | Tibetan | Tibetan script (བོད་ཡིག) |

## Configuration
- Framework: i18next + react-i18next
- Language detection: expo-localization (system language)
- Fallback: English
- Namespaces: common, auth, profile, discovery, chat

## Translation Coverage

### English (Complete)
All UI strings fully translated.

### Tibetan (Key Strings)
Core navigation, auth screens, and cultural content translated. Remaining screens fall back to English.

### Sample Translations

| English | Tibetan |
|---------|---------|
| Welcome to Tsewa | བརྩེ་བ་ལ་དགའ་བསུ |
| Find your person | ཁྱེད་ཀྱི་མི་དེ་རྙེད |
| Get Started | འགོ་འཛུགས |
| Log In | ནང་འཛུལ |
| Create Account | ཐོ་འགོད |
| Continue | མུ་མཐུད |
| Cancel | དོར |
| Save | ཉར |
| Search | འཚོལ |
| You're on the waitlist! | ཁྱེད་སྒུག་ཐོའི་ནང་ཡོད |
| Log Out | ཕྱིར་ཐོན |

## Language Toggle
Available in Settings screen. Uses `useLanguageToggle()` hook that:
- Gets current language from i18next
- Toggles between 'en' and 'bo'
- Persists preference

---

# 13. Seed Data

The seed script (`prisma/seed.ts`) populates the database with realistic test data.

## 20 User Profiles

### Female Profiles (10)

| Name | Age | Region | City | Profession | Categories |
|------|-----|--------|------|-----------|------------|
| Dolma Tenzin | 26 | U-Tsang | Dharamsala | Data Scientist | Coffee Date, Teaching Companion |
| Yangchen Lhamo | 24 | Kham | New York | Graphic Designer | Going Out Tonight, Diaspora Connect |
| Pema Choedron | 29 | Amdo | Toronto | Nurse | Brunch Date, Language Exchange |
| Tsering Wangmo | 23 | Diaspora | London | Law Student | Adventure Partner, Cultural Event Buddy |
| Dechen Lhamo | 27 | U-Tsang | Zurich | Software Engineer | Study Buddy, Losar Celebration |
| Sonam Dolkar | 25 | Kham | Dharamsala | Teacher | Festival Companion, Teaching Companion |
| Karma Yangzom | 30 | Amdo | San Francisco | Product Manager | Coffee Date, Homecoming |
| Lhamo Tsering | 22 | Diaspora | Melbourne | Art Student | Going Out Tonight, Language Exchange |
| Tashi Dolma | 28 | U-Tsang | Minneapolis | Doctor | Brunch Date, Diaspora Connect |
| Choeying Lhamo | 26 | Kham | Kathmandu | Journalist | Adventure Partner, Cultural Event Buddy |

### Male Profiles (10)

| Name | Age | Region | City | Profession | Categories |
|------|-----|--------|------|-----------|------------|
| Tenzin Dorje | 28 | U-Tsang | Dharamsala | Monk/Scholar | Teaching Companion, Losar Celebration |
| Lobsang Gyatso | 25 | Kham | New York | Finance Analyst | Going Out Tonight, Coffee Date |
| Thubten Norbu | 31 | Amdo | Toronto | Civil Engineer | Brunch Date, Homecoming |
| Karma Wangchuk | 24 | Diaspora | London | Music Producer | Festival Companion, Cultural Event Buddy |
| Jampa Tsering | 27 | U-Tsang | Paris | Chef | Going Out Tonight, Diaspora Connect |
| Ngawang Tashi | 29 | Kham | San Francisco | Software Engineer | Study Buddy, Language Exchange |
| Dorje Rabten | 23 | Amdo | Dharamsala | Thangka Painter | Adventure Partner, Losar Celebration |
| Sonam Topgyal | 26 | Diaspora | Washington DC | Political Scientist | Coffee Date, Diaspora Connect |
| Phuntsok Namgyal | 30 | U-Tsang | Taipei | Business Owner | Brunch Date, Homecoming |
| Kunga Dhondup | 22 | Kham | Boston | CS Student | Study Buddy, Cultural Event Buddy |

Each user has: 3-4 avatar photos (DiceBear), 3 conversation prompt answers, hashed password, APPROVED waitlist status.

## 10 Invite Codes
`TSEWA1` through `TSEWA10` — 5 max uses each, created by Tenzin Dorje.

## 5 Events

| Event | Type | Location | Date |
|-------|------|----------|------|
| Losar 2024 Celebration | LOSAR | Dharamsala, India | April 20, 2026 |
| Meditation & Mindfulness Workshop | TEACHING | Online | April 18, 2026 |
| Tibetan Film Night | CULTURAL | New York, USA | April 22, 2026 |
| Language Exchange Meetup | SOCIAL | Toronto, Canada | April 19, 2026 |
| Kham Traditional Dance Evening | CULTURAL | London, UK | April 25, 2026 |

## 5 Feed Posts
Community posts from Dolma (thukpa restaurant), Lobsang (coding meetup), Pema (morning practice), Karma (new music), Tashi (volunteering).

## 6 Topic Channels

| Channel | Emoji | Description |
|---------|-------|-------------|
| Dharma Talk | 🙏 | Discuss Buddhist teachings and practice |
| Dating Advice | 💝 | Get and share dating tips |
| Tibetan Music | 🎵 | Share and discover Tibetan music |
| Language Practice | 🗣️ | Practice Tibetan with others |
| Kham Corner | 🏔️ | For Kham folks to connect |
| Amdo Corner | 🌾 | For Amdo folks to connect |

## 1 Live Room
"Friday Night Hangout" — hosted by Lobsang, with Ngawang (speaker) and Kunga (listener).

---

# 14. Setup & Deployment

## Prerequisites
- Node.js v20+
- npm v10+
- PostgreSQL v14+
- Redis v6+

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Viraj0518/Tsewa.git
cd Tsewa

# 2. Install all dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# 4. Start PostgreSQL and Redis
sudo systemctl start postgresql redis-server

# 5. Create database
sudo -u postgres psql -c "CREATE USER tsewa WITH PASSWORD 'tsewa_local_2024' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE tsewa OWNER tsewa;"

# 6. Run database migrations
cd apps/server
cp ../../.env .env
npx prisma migrate dev

# 7. Seed the database
npx prisma db seed

# 8. Start the server
npx tsx src/index.ts
# Server runs on http://localhost:3001

# 9. Start the mobile/web app (new terminal)
cd apps/mobile
npx expo start
# Press 'w' for web, scan QR for mobile (Expo Go)
```

## Verify Setup

```bash
# Health check
curl http://localhost:3001/api/health

# Test login with seed data
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dolma.tenzin@tsewa.test","password":"password123"}'

# Test discovery deck (use token from login response)
curl http://localhost:3001/api/discovery/deck \
  -H "Authorization: Bearer <your-access-token>"
```

---

# 15. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://tsewa:tsewa_local_2024@localhost:5432/tsewa` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for access token signing | (must set) |
| `JWT_REFRESH_SECRET` | Secret for refresh token signing | (must set) |
| `API_URL` | Backend API URL | `http://localhost:3001` |
| `PORT` | Server port | `3001` |
| `UPLOAD_DIR` | File upload directory | `./uploads` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:8081,http://localhost:19006,http://localhost:3000` |

---

# 16. NPM Packages

## Server Dependencies

| Package | Purpose |
|---------|---------|
| express | HTTP framework |
| cors | Cross-origin resource sharing |
| helmet | Security headers |
| @prisma/client | Database ORM |
| prisma | Schema management & migrations |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT token generation & verification |
| socket.io | Realtime WebSocket communication |
| ioredis | Redis client |
| multer | File upload handling |
| zod | Input validation |
| node-cron | Scheduled tasks (daily picks) |
| uuid | Unique ID generation |
| cookie-parser | Cookie parsing |
| dotenv | Environment variable loading |
| tsx | TypeScript execution (dev) |
| typescript | TypeScript compiler |

## Mobile Dependencies

| Package | Purpose |
|---------|---------|
| expo | Expo SDK framework |
| expo-router | File-based routing |
| react-native | Mobile framework |
| react-native-web | Web support |
| react-dom | Web rendering |
| zustand | State management |
| @tanstack/react-query | Data fetching & caching |
| axios | HTTP client |
| react-hook-form | Form management |
| @hookform/resolvers | Form validation resolvers |
| zod | Schema validation |
| moti | Declarative animations |
| react-native-reanimated | High-performance animations |
| react-native-gesture-handler | Touch gesture handling |
| react-native-safe-area-context | Safe area insets |
| react-native-screens | Native screen management |
| socket.io-client | Realtime client |
| expo-av | Audio/video recording & playback |
| expo-image-picker | Photo/video selection |
| expo-font | Custom font loading |
| expo-secure-store | Encrypted local storage |
| expo-localization | System language detection |
| expo-file-system | File system access |
| expo-clipboard | Clipboard access |
| expo-haptics | Haptic feedback |
| expo-sharing | Native share sheet |
| expo-constants | App constants |
| expo-status-bar | Status bar styling |
| i18next | Internationalization framework |
| react-i18next | React bindings for i18n |
| date-fns | Date formatting |
| react-native-youtube-iframe | YouTube player for watch parties |
| react-native-webview | WebView for YouTube player |

---

# 17. Security

## Authentication
- **Password Hashing**: bcrypt with 12 salt rounds
- **Access Tokens**: JWT, 15-minute expiry, signed with JWT_SECRET
- **Refresh Tokens**: JWT, 7-day expiry, signed with JWT_REFRESH_SECRET, stored in Redis
- **Token Refresh**: Automatic silent refresh on 401 response (Axios interceptor)
- **Logout**: Refresh token blacklisted in Redis

## Authorization
- All API routes (except auth) require valid JWT via `authMiddleware`
- Waitlist middleware ensures only approved users access main features
- Room host actions verified server-side
- Event/post delete restricted to creator
- Invite code generation limited to 5 codes per user

## Data Protection
- Passwords never stored in plaintext
- Tokens stored in expo-secure-store (encrypted on device)
- CORS restricted to configured origins
- Helmet middleware for security headers
- Rate limiting on auth endpoints (5 req/min)
- File upload type/size validation (photos: 5MB, voice: 2MB)

## Content Safety
- Block system: blocked users excluded from discovery
- Report system: users can report with reason
- Photo upload validation (jpg/png/webp only)

---

# 18. Testing Credentials

## Seeded User Accounts

All users share the password: **`password123`**

| Email | Name | Region |
|-------|------|--------|
| dolma.tenzin@tsewa.test | Dolma Tenzin | U-Tsang |
| yangchen.lhamo@tsewa.test | Yangchen Lhamo | Kham |
| pema.choedron@tsewa.test | Pema Choedron | Amdo |
| tsering.wangmo@tsewa.test | Tsering Wangmo | Diaspora |
| dechen.lhamo@tsewa.test | Dechen Lhamo | U-Tsang |
| sonam.dolkar@tsewa.test | Sonam Dolkar | Kham |
| karma.yangzom@tsewa.test | Karma Yangzom | Amdo |
| lhamo.tsering@tsewa.test | Lhamo Tsering | Diaspora |
| tashi.dolma@tsewa.test | Tashi Dolma | U-Tsang |
| choeying.lhamo@tsewa.test | Choeying Lhamo | Kham |
| tenzin.dorje@tsewa.test | Tenzin Dorje | U-Tsang |
| lobsang.gyatso@tsewa.test | Lobsang Gyatso | Kham |
| thubten.norbu@tsewa.test | Thubten Norbu | Amdo |
| karma.wangchuk@tsewa.test | Karma Wangchuk | Diaspora |
| jampa.tsering@tsewa.test | Jampa Tsering | U-Tsang |
| ngawang.tashi@tsewa.test | Ngawang Tashi | Kham |
| dorje.rabten@tsewa.test | Dorje Rabten | Amdo |
| sonam.topgyal@tsewa.test | Sonam Topgyal | Diaspora |
| phuntsok.namgyal@tsewa.test | Phuntsok Namgyal | U-Tsang |
| kunga.dhondup@tsewa.test | Kunga Dhondup | Kham |

## Invite Codes
`TSEWA1` through `TSEWA10` — use any of these during registration.

## Quick Test Flow
1. Register new account at `/register` with invite code `TSEWA1`
2. Complete 7-step onboarding
3. Discover tab: browse profiles by category, swipe right to like
4. Match with a seeded user → chat opens
5. Send text, voice note, GIF in chat
6. Join "Friday Night Hangout" room
7. Create a watch party room with a YouTube URL
8. Browse events and community feed

---

# End of Documentation

**Repository**: https://github.com/Viraj0518/Tsewa
**Total Files**: 169 source files
**Total Code**: 38,148 lines
**Built with**: Expo Router + Express.js + PostgreSQL + Socket.io
**Design**: Lavender #9B8EC4 / Peach #F4A883 / Soft White #F8F4F0
