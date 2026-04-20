# 🎯 Real-Time Collaborative Presentation App — Project Plan

> A web app where presenters create sessions, share links or QR codes, and viewers follow along in real time using Socket.io — with optional viewer control delegation.

> ✅ **Phase 1 Complete** — Stack updated to use Supabase (Auth + Database + Storage) and Upstash Redis.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Core Features](#4-core-features)
5. [Data Models](#5-data-models)
6. [Socket.io Event System](#6-socketio-event-system)
7. [Permission System](#7-permission-system)
8. [API Endpoints](#8-api-endpoints)
9. [Frontend Structure](#9-frontend-structure)
10. [QR Code & Link Sharing](#10-qr-code--link-sharing)
11. [Security Best Practices](#11-security-best-practices)
12. [Scalability Considerations](#12-scalability-considerations)
13. [Folder Structure](#13-folder-structure)
14. [Development Phases](#14-development-phases)
15. [Best Practices Summary](#15-best-practices-summary)

---

## 1. Project Overview

The app has two primary roles:

| Role          | Description                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Presenter** | Creates a session, uploads/builds a presentation, controls slides, and manages viewer permissions                                 |
| **Viewer**    | Joins via a shared link or QR code and watches the presentation in sync with the presenter (or controls it if granted permission) |

### Key User Flows

```
Presenter:
  → Sign in (Supabase Auth) → Create Session → Build/Upload Presentation
  → Share link or QR → Start Presenting → Control slides
  → Optionally grant control to a viewer

Viewer:
  → Open shared link or scan QR → Join session (no account needed)
  → Watch in sync → (if granted) Control the slides
```

---

## 2. Tech Stack

### Backend

| Layer           | Technology                | Reason                                                       |
| --------------- | ------------------------- | ------------------------------------------------------------ |
| Runtime         | **Node.js**               | Non-blocking I/O; great Socket.io support                    |
| Framework       | **Express.js**            | Lightweight, flexible REST API                               |
| Real-time       | **Socket.io**             | Rooms, namespaces, events, acknowledgements                  |
| Database        | **Supabase** (PostgreSQL) | Hosted DB + auto-generated REST API + Auth + Storage         |
| Auth            | **Supabase Auth**         | Built-in JWT, OAuth, magic links — no custom auth needed     |
| Cache / Pub-Sub | **Upstash Redis**         | Serverless Redis; Socket.io adapter for multi-server scaling |
| DB Client       | **@supabase/supabase-js** | Official Supabase client — replaces Prisma                   |

### Frontend

| Layer            | Technology                         | Reason                                 |
| ---------------- | ---------------------------------- | -------------------------------------- |
| Framework        | **React (Vite)**                   | Fast dev experience, component-based   |
| Real-time Client | **socket.io-client**               | Pairs with backend Socket.io           |
| Supabase Client  | **@supabase/supabase-js**          | Auth state, session data, file uploads |
| Slide Rendering  | **reveal.js** or **custom canvas** | Flexible slide engine                  |
| Styling          | **Tailwind CSS**                   | Rapid UI development                   |
| State Management | **Zustand**                        | Predictable state for sync             |
| QR Code          | **qrcode.react**                   | Lightweight QR generation              |

### Infrastructure

- **Docker + Docker Compose** — consistent local dev environment
- **Nginx** — reverse proxy, WebSocket upgrade headers
- **Railway / Fly.io** — hosting for the Node.js server
- **Supabase** — managed PostgreSQL, Auth, and Storage (cloud)
- **Upstash** — serverless Redis (free tier, pairs well with Supabase)
- **Cloudflare** — CDN, DDoS protection

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT                           │
│  ┌──────────────────┐      ┌──────────────────────────┐ │
│  │  Presenter View  │      │      Viewer View          │ │
│  │  (Full Control)  │      │  (Synced / Delegated)     │ │
│  └────────┬─────────┘      └───────────┬──────────────┘ │
│           │ socket.io-client           │ socket.io-client│
│           │ @supabase/supabase-js      │                 │
└───────────┼────────────────────────────┼────────────────┘
            │                            │
            ▼                            ▼
┌───────────────────────────────────────────────────────┐
│            Node.js + Express + Socket.io              │
│  ┌──────────────────────────────────────────────────┐ │
│  │              Session Room Manager                │ │
│  │  room: session:{sessionId}                       │ │
│  │  - Tracks presenter socket                       │ │
│  │  - Tracks viewer sockets                         │ │
│  │  - Tracks permission grants                      │ │
│  └──────────────────────────────────────────────────┘ │
│                        │                              │
│          ┌─────────────┴──────────────┐               │
│          ▼                            ▼               │
│   Express REST API            Upstash Redis           │
│   (Session CRUD,              (Socket.io adapter,     │
│    validates Supabase JWT)     live session state)    │
└───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────┐
│                      Supabase                         │
│  ┌──────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │  PostgreSQL  │  │    Auth    │  │    Storage    │  │
│  │  (sessions,  │  │  (JWT,     │  │  (slide imgs, │  │
│  │   slides)    │  │   users)   │  │   uploads)    │  │
│  └──────────────┘  └────────────┘  └───────────────┘  │
└───────────────────────────────────────────────────────┘
```

---

## 4. Core Features

### 4.1 Session Management

- Create a uniquely identified session (short code or UUID)
- Session has a status: `idle | live | ended`
- Sessions store the current slide index on the server (source of truth)
- Sessions expire automatically after inactivity (e.g., 24 hours)

### 4.2 Real-Time Slide Sync

- Presenter emits `slide:change` with the new slide index
- Server validates the emitter has presenter (or delegated) permissions
- Server broadcasts `slide:update` to all viewers in the room
- Viewers cannot emit `slide:change` unless granted permission

### 4.3 QR Code & Link Sharing

- Each session generates a public viewer URL: `/view/{sessionCode}`
- The presenter dashboard shows a QR code of this URL
- No authentication required to join as a viewer

### 4.4 Viewer Control Delegation

- Presenter can grant control to a specific viewer socket
- Only one viewer can hold control at a time (or none)
- Presenter can revoke control at any time
- The granted viewer sees a control UI (prev/next buttons)
- Revocation is instant — the viewer's control UI disappears

### 4.5 Presentation Builder (Phase 3) _(Complete)_

- Drag-and-drop slide editor
- Import from **PDF** (client-side `pdf.js` → image slides) and **PPTX** (embedded raster images from `ppt/media/`)
- Text, image, and embed blocks per slide (TipTap rich text; YouTube + Vimeo iframes; sanitizer allowlist)
- Images uploaded directly to **Supabase Storage**

---

## 5. Data Models

> Data is stored in **Supabase (PostgreSQL)**. Use the Supabase dashboard to create tables and enable Row Level Security (RLS).

### users

Managed automatically by **Supabase Auth** in the `auth.users` table. Create a `profiles` table to store extra info:

```sql
create table profiles (
  id        uuid references auth.users(id) on delete cascade primary key,
  name      text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### sessions

```sql
create table sessions (
  id             uuid default gen_random_uuid() primary key,
  code           text unique not null,         -- short code e.g. "XKQP4"
  title          text not null,
  status         text default 'idle'            -- idle | live | ended
                   check (status in ('idle', 'live', 'ended')),
  current_slide  int default 0,
  total_slides   int default 0,
  presenter_id   uuid references auth.users(id) on delete cascade,
  control_granted text,                         -- socketId of delegated viewer
  created_at     timestamptz default now(),
  expires_at     timestamptz default now() + interval '24 hours'
);

-- Row Level Security: only presenter can modify their sessions
alter table sessions enable row level security;

create policy "Presenter manages own sessions"
  on sessions for all
  using (auth.uid() = presenter_id);

create policy "Anyone can read live sessions"
  on sessions for select
  using (status = 'live');
```

### slides

```sql
create table slides (
  id         uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade,
  "order"    int not null,
  content    jsonb not null,   -- { type: "image"|"html"|"markdown", data: "..." }
  created_at timestamptz default now()
);

alter table slides enable row level security;

create policy "Presenter manages own slides"
  on slides for all
  using (
    exists (
      select 1 from sessions
      where sessions.id = slides.session_id
        and sessions.presenter_id = auth.uid()
    )
  );

create policy "Anyone can read slides of live sessions"
  on slides for select
  using (
    exists (
      select 1 from sessions
      where sessions.id = slides.session_id
        and sessions.status = 'live'
    )
  );
```

### Supabase Storage Bucket

```
Bucket: slide-assets
  - Public read access: yes (for viewer slide images)
  - Folder structure: {sessionId}/{slideId}/image.png
```

---

## 6. Socket.io Event System

### Connection & Rooms

```
Client connects → sends "join:session" { sessionCode, role: "presenter" | "viewer", token? }
Server verifies Supabase JWT (for presenter) → adds to room "session:{sessionId}"
Server emits "session:joined" with current state
```

### Supabase JWT Verification on Socket

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY, // service role for server-side auth
);

async function verifyPresenter(token) {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser(token);
	if (error || !user) return null;
	return user;
}

io.on('connection', (socket) => {
	socket.on('join:session', async ({ sessionCode, role, token }) => {
		if (role === 'presenter') {
			const user = await verifyPresenter(token);
			if (!user)
				return socket.emit('session:error', { message: 'Unauthorized' });
			// verify user owns this session
		}
		// proceed to join room...
	});
});
```

### Event Reference

| Event             | Direction                   | Payload                                                        | Description                                          |
| ----------------- | --------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| `join:session`    | Client → Server             | `{ sessionCode, role, token? }`                                | Join a session room                                  |
| `session:joined`  | Server → Client             | `{ sessionId, currentSlide, totalSlides, status, hasControl }` | Confirm join with state                              |
| `session:error`   | Server → Client             | `{ message }`                                                  | Join failed                                          |
| `slide:change`    | Client → Server             | `{ sessionId, slideIndex }`                                    | Request slide change (presenter or delegated viewer) |
| `slide:update`    | Server → Client (broadcast) | `{ slideIndex }`                                               | Broadcast new slide to all in room                   |
| `control:grant`   | Client → Server             | `{ sessionId, viewerSocketId }`                                | Presenter grants control to viewer                   |
| `control:granted` | Server → Client             | `{ grantedTo: socketId }`                                      | Notify all in room of new controller                 |
| `control:revoke`  | Client → Server             | `{ sessionId }`                                                | Presenter revokes delegated control                  |
| `control:revoked` | Server → Client             | —                                                              | Notify all in room control was removed               |
| `viewer:list`     | Server → Client (presenter) | `{ viewers: [{socketId, joinedAt}] }`                          | Live viewer list update                              |
| `session:end`     | Client → Server             | `{ sessionId }`                                                | Presenter ends session                               |
| `session:ended`   | Server → Client (broadcast) | —                                                              | Notify all viewers session is over                   |
| `presenter:ping`  | Server → Client             | —                                                              | Heartbeat to detect dropped presenter                |

### Server-Side Permission Guard

```javascript
function canControlSlide(socket, session) {
	const isPresenter = socket.id === session.presenterSocketId;
	const isDelegated = socket.id === session.controlGranted;
	return isPresenter || isDelegated;
}

socket.on('slide:change', async ({ sessionId, slideIndex }) => {
	const session = await getSessionFromRedis(sessionId);

	if (!canControlSlide(socket, session)) {
		return socket.emit('session:error', {
			message: 'Not authorized to control slides',
		});
	}

	if (slideIndex < 0 || slideIndex >= session.totalSlides) return;

	// Update Supabase DB and Redis cache
	await supabase
		.from('sessions')
		.update({ current_slide: slideIndex })
		.eq('id', sessionId);
	await redis.set(
		`session:state:${sessionId}`,
		JSON.stringify({ ...session, currentSlide: slideIndex }),
	);

	io.to(`session:${sessionId}`).emit('slide:update', { slideIndex });
});
```

---

## 7. Permission System

### Roles

```
PRESENTER  → Full control: change slides, grant/revoke control, end session
VIEWER     → Read-only by default
DELEGATED  → Temporary control: can change slides, cannot grant to others
```

### Control Delegation Flow

```
1. Presenter opens "Viewers" panel → sees live list of connected viewers
2. Presenter clicks "Give Control" next to a viewer's name
3. Server emits `control:grant` event
4. Server validates: only one viewer can hold control at a time
5. If another viewer had control → revoke first, then grant
6. Emit `control:granted` to the room — target viewer's UI updates to show controls
7. Presenter can click "Revoke" at any time → `control:revoke` → `control:revoked`
8. When presenter reconnects after disconnect → control is automatically revoked
```

### Security Rules

- Control can only be granted/revoked by the socket identified as the presenter
- Presenter socket is validated against their **Supabase JWT** on join
- Viewer socket IDs are ephemeral — if a viewer disconnects and rejoins, they lose delegated control
- Rate limit `slide:change` events: max 10 per second per socket to prevent abuse
- Supabase RLS policies enforce database-level access control as a second layer

---

## 8. API Endpoints

> With Supabase, many of these can be handled directly by the Supabase client on the frontend using RLS policies. The Express backend is primarily needed for **Socket.io** and any operations requiring the **service role key**.

### Auth

```
Handled entirely by Supabase Auth — no custom endpoints needed.
Use @supabase/supabase-js on the frontend:
  supabase.auth.signUp()
  supabase.auth.signInWithPassword()
  supabase.auth.signOut()
  supabase.auth.getSession()
```

### Sessions (Express — service role operations)

```
POST   /api/sessions              Create new session (generates unique code)
PATCH  /api/sessions/:id/status   Update session status (start/end)
DELETE /api/sessions/:id          Delete session + cleanup Redis state
GET    /api/sessions/:code/qr     Returns QR code PNG
```

### Sessions & Slides (Supabase client — direct from frontend with RLS)

```
supabase.from("sessions").select()          → List presenter's sessions
supabase.from("sessions").insert()          → Create session
supabase.from("slides").select()            → Get slides for a session
supabase.from("slides").insert/update()     → Manage slides
supabase.storage.from("slide-assets")       → Upload/fetch slide images
```

---

## 9. Frontend Structure

### Supabase Client Setup

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
	import.meta.env.VITE_SUPABASE_URL,
	import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

### Pages / Routes

| Route                   | Component       | Description                    |
| ----------------------- | --------------- | ------------------------------ |
| `/`                     | `LandingPage`   | Marketing + login/register CTA |
| `/dashboard`            | `Dashboard`     | Presenter's session list       |
| `/sessions/new`         | `CreateSession` | Create session form            |
| `/sessions/:id/edit`    | `SlideEditor`   | Build/edit slides              |
| `/sessions/:id/present` | `PresenterView` | Live presenting mode           |
| `/view/:code`           | `ViewerView`    | Public viewer page (no auth)   |

### PresenterView Component Structure

```
PresenterView
├── SlideDisplay          ← Renders current slide
├── SlideNavigator        ← Prev / Next / Jump to slide
├── ViewerPanel           ← List of connected viewers
│   └── ViewerRow         ← Viewer item with "Give Control" button
├── SessionControls       ← Start / End session, share link
└── QRCodeModal           ← Shows QR for sharing
```

### ViewerView Component Structure

```
ViewerView
├── SlideDisplay          ← Synced read-only slide view
├── ConnectionStatus      ← "Live" / "Reconnecting..." indicator
├── ControlBar            ← Only visible if viewer has delegated control
│   ├── PrevButton
│   └── NextButton
└── SessionEndedOverlay   ← Shown when presenter ends session
```

### Auth Hook (Supabase)

```javascript
// src/hooks/useAuth.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
	const [user, setUser] = useState(null);

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setUser(session?.user ?? null);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) =>
			setUser(session?.user ?? null),
		);

		return () => subscription.unsubscribe();
	}, []);

	return { user };
}
```

### Passing Supabase Token to Socket

```javascript
// src/socket/socket.js
import { io } from 'socket.io-client';
import { supabase } from '../lib/supabase';

export async function connectSocket() {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const token = session?.access_token;

	return io(import.meta.env.VITE_SOCKET_URL, {
		auth: { token }, // sent with every connection
		transports: ['websocket'],
	});
}
```

### State Management (Zustand Store)

```javascript
// src/store/sessionStore.js
{
  sessionId: null,
  sessionCode: null,
  status: "idle",           // idle | live | ended
  currentSlide: 0,
  totalSlides: 0,
  slides: [],               // fetched from Supabase on join
  role: null,               // "presenter" | "viewer"
  hasControl: false,        // viewer has delegated control
  viewers: [],              // presenter only: list of connected viewers

  // Actions
  setSlide(index),
  grantControl(socketId),
  revokeControl(),
  endSession(),
}
```

---

## 10. QR Code & Link Sharing

### Viewer URL Format

```
https://yourdomain.com/view/XKQP4
```

Where `XKQP4` is a short, human-readable, unique session code (5-6 chars, uppercase alphanumeric, excluding confusable characters like `O`, `0`, `I`, `1`).

### QR Code Implementation

**Frontend (React):**

```jsx
import QRCode from 'qrcode.react';

function QRCodeModal({ sessionCode }) {
	const viewerUrl = `${window.location.origin}/view/${sessionCode}`;
	return (
		<div>
			<QRCode value={viewerUrl} size={256} />
			<p>{viewerUrl}</p>
			<button onClick={() => navigator.clipboard.writeText(viewerUrl)}>
				Copy Link
			</button>
		</div>
	);
}
```

**Backend (PNG endpoint):**

```javascript
const QRCode = require('qrcode');

app.get('/api/sessions/:code/qr', async (req, res) => {
	const url = `${process.env.FRONTEND_URL}/view/${req.params.code}`;
	const buffer = await QRCode.toBuffer(url, { width: 512 });
	res.setHeader('Content-Type', 'image/png');
	res.send(buffer);
});
```

---

## 11. Security Best Practices

### Authentication & Authorization

- **Supabase Auth handles all JWT issuance and refresh** — no custom token logic needed
- Pass the Supabase `access_token` as the Socket.io `auth.token` on connection
- Verify the token server-side using the Supabase service role client (`supabase.auth.getUser(token)`)
- Presenter identity bound to socket on join; re-validated on sensitive events
- Viewer joins are unauthenticated but rate-limited per IP
- **Supabase RLS** enforces database-level access as a second security layer

### Socket.io Security

- Use `socket.io` with `cors` restricted to your frontend origin only
- Validate all event payloads with a schema library (Zod or Joi)
- Reject malformed events silently (no verbose error exposure)
- Rate limit `slide:change`: max 10 per second per socket
- Store presenter's socket ID server-side in Redis; never trust client claims of "I am the presenter"

### Session Codes

- Generate short codes with a cryptographically secure random source (`crypto.randomBytes`)
- Check for collisions before persisting to Supabase
- Avoid sequential/guessable patterns

### Transport

- Enforce HTTPS in production (Nginx + Let's Encrypt)
- Enable `transports: ['websocket']` to skip long-polling when possible
- Set WebSocket ping timeout and ping interval to detect dead connections

### Input Validation

- Sanitize slide content (HTML slides must run through DOMPurify server-side)
- Limit file upload size for Supabase Storage uploads (enforce via storage bucket policy)
- Restrict allowed file types for imports (PDF, PPTX only)

---

## 12. Scalability Considerations

### Horizontal Scaling with Upstash Redis Adapter

When running multiple Node.js instances, Socket.io rooms must be shared. Use Upstash Redis (serverless, HTTP-based):

```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

// Upstash provides a Redis-compatible URL
const pubClient = createClient({ url: process.env.UPSTASH_REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

### Live Session State in Upstash Redis

Cache the live session state for fast socket lookups — avoid hitting Supabase DB on every socket event:

```
Key: session:state:{sessionId}
Value: { currentSlide, presenterSocketId, controlGrantedTo, status, totalSlides }
TTL: 24h (refreshed on activity)
```

Write-through strategy: update Redis immediately for speed, then async-write to Supabase for persistence.

### Slide Sync Optimizations

- Only send `slideIndex` (integer) over the wire — not slide content. Viewers already have slide data loaded from Supabase.
- Use `socket.to(room)` to broadcast — never echo back to the sender
- Debounce `slide:change` client-side only if scrub/drag navigation is added (not needed for button-based navigation)

---

## 13. Folder Structure

```
presentation-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── supabase.js         # Supabase service role client
│   │   │   └── redis.js            # Upstash Redis client
│   │   ├── middleware/
│   │   │   ├── auth.js             # Supabase JWT verification
│   │   │   ├── rateLimiter.js      # Express rate limit
│   │   │   └── validate.js         # Zod schema validation
│   │   ├── routes/
│   │   │   ├── session.routes.js   # Session create/end/delete
│   │   │   └── qr.routes.js        # QR code generation
│   │   ├── socket/
│   │   │   ├── index.js            # Socket.io setup & Redis adapter
│   │   │   ├── handlers/
│   │   │   │   ├── joinHandler.js
│   │   │   │   ├── slideHandler.js
│   │   │   │   └── controlHandler.js
│   │   │   └── guards.js           # Permission checks
│   │   ├── services/
│   │   │   ├── session.service.js  # Supabase DB calls
│   │   │   └── qr.service.js
│   │   └── app.js
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── supabase.js         # Supabase anon client
│   │   ├── components/
│   │   │   ├── SlideDisplay.jsx
│   │   │   ├── SlideNavigator.jsx
│   │   │   ├── ViewerPanel.jsx
│   │   │   ├── QRCodeModal.jsx
│   │   │   └── ControlBar.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CreateSession.jsx
│   │   │   ├── SlideEditor.jsx
│   │   │   ├── PresenterView.jsx
│   │   │   └── ViewerView.jsx
│   │   ├── store/
│   │   │   └── sessionStore.js     # Zustand store
│   │   ├── socket/
│   │   │   ├── socket.js           # Socket.io client (attaches Supabase token)
│   │   │   └── useSocket.js        # Custom hook
│   │   ├── hooks/
│   │   │   ├── useAuth.js          # Supabase auth state
│   │   │   ├── useSession.js
│   │   │   └── usePresenter.js
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── docker-compose.yml              # Local dev (Node server + Nginx only; Supabase is cloud)
└── README.md
```

---

## 14. Development Phases

### ✅ Phase 1 — Core Real-Time MVP _(Complete)_

- [x] Project setup (Vite + Express + Socket.io)
- [x] User auth via **Supabase Auth**
- [x] Create & manage sessions (CRUD via Supabase)
- [x] Static slide support (images uploaded to **Supabase Storage**, bucket `slide-assets`)
- [x] Socket.io: presenter join, viewer join, `slide:change` → `slide:update` sync
- [x] QR code generation and link sharing
- [x] Basic Presenter and Viewer UIs

### ✅ Phase 2 — Permission & Control Delegation _(Complete)_

**Goal:** Viewer can control when granted permission

- [x] Viewer list in presenter panel (live, via socket)
- [x] `control:grant` and `control:revoke` socket events
- [x] Control UI for delegated viewer (prev/next + keyboard)
- [x] Automatic revocation on viewer disconnect (and presenter disconnect / session end)
- [x] Visual indicator: who currently has control (presenter + viewer)

### ✅ Phase 3 — Slide Builder _(Complete)_

**Goal:** Rich slide creation without external tools

- [x] Rich text slide editor (**TipTap**) + YouTube / Vimeo embeds (allowlisted iframes)
- [x] Image upload per slide → **Supabase Storage** (`slide-assets` bucket)
- [x] Slide reordering (drag and drop + atomic DB reorder + `current_slide` remap)
- [x] **PDF** import (render pages to JPEG slides) and **PPTX** import (embedded images → slides; text-only decks should use PDF export)

### ✅ Phase 4 — Polish & Scale _(Complete)_

**Goal:** Production-ready

- [x] **Upstash Redis** — optional `UPSTASH_REDIS_URL` + `@socket.io/redis-adapter` (multi-instance); in-memory when unset
- [x] Session expiry — `cleanup_expired_sessions()` SQL migration (schedule via **pg_cron** or **Edge Function**; commented example in migration)
- [x] Reconnection — socket `reconnect` → refetch public session / presenter session+slides; join still runs on every `connect`
- [x] Rate limiting — `/api/health` unthrottled; global API limiter; stricter limiter on `/api/sessions/public/*`; Zod-style **session code** path validation on public + QR routes; invalid **slide:change** emits `session:error`
- [x] Analytics — `live_started_at`, `live_ended_at`, `peak_viewer_count` + `bump_peak_viewer_count` RPC; dashboard shows peak viewers when above zero
- [x] Mobile-responsive **viewer** UI — safe-area padding, `min-h-11` controls, `100dvh`, flexible header

---

## 15. Best Practices Summary

### Supabase

- **Use RLS everywhere** — enable Row Level Security on all tables as a database-level guard
- **Anon key on frontend, service role key only on backend** — never expose the service role key to the client
- **Use Supabase Auth's `onAuthStateChange`** — keep your app's auth state in sync automatically
- **Pass `access_token` to Socket.io** — extract from `supabase.auth.getSession()` and send as `socket.auth.token`
- **Storage bucket policies** — set public read for viewer slide images; restrict write to authenticated presenters only

### Socket.io

- **Rooms over broadcasts** — always scope to `session:{sessionId}` room, never broadcast globally
- **Server is the source of truth** — slide index lives in Upstash Redis (fast) and Supabase DB (persistent); never trust client-reported state
- **Acknowledge critical events** — use Socket.io acknowledgements (`callback`) for `join:session` so the client knows if it succeeded
- **Handle reconnection** — Socket.io auto-reconnects; re-send `join:session` on reconnect; re-fetch current slide from Supabase
- **Heartbeat detection** — detect dropped presenter with Socket.io's built-in ping/pong; notify viewers if presenter disconnects

### State Sync

- **Optimistic UI for presenter** — update slide display immediately on presenter's side; don't wait for server roundtrip
- **No optimistic UI for viewer** — viewer only updates on receiving `slide:update` from server
- **Session state hydration** — when a viewer joins mid-session, send them the current slide index immediately in `session:joined`
- **Load slides from Supabase on join** — fetch slide content once on connect; only sync the index via socket after that

### UX

- Show a **live viewer count** to the presenter
- Show a **"Reconnecting..."** banner to viewers during socket disconnection
- Show a **"Session Ended"** overlay when presenter ends the session
- Add **keyboard shortcuts** for the presenter: `→` / `Space` = next slide, `←` = prev slide
- Display the **QR code prominently** at session start so the presenter can hold it up to a camera

### Code Quality

- **Validate all socket payloads** with Zod schemas before processing
- **Separate socket handlers** into individual files (not one giant `io.on("connection")` block)
- **Use environment variables** for all secrets — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_URL`
- **Never hardcode keys** — the service role key has full DB access; treat it like a root password
