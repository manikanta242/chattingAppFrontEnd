# Chat Application — Angular Frontend

Connects to your FastAPI backend at http://localhost:8000

## Project Structure

```
src/app/
├── core/
│   ├── guards/
│   │   └── auth.guard.ts          # Protects /chat and /friends routes
│   ├── interceptors/
│   │   └── auth.interceptor.ts    # Adds Bearer token to every HTTP request
│   ├── models/
│   │   ├── user.model.ts          # Matches auth/models.py Users table
│   │   ├── friend.model.ts        # Matches friends/models.py FriendRequest table
│   │   └── message.model.ts      # Matches message/models.py + WebSocket events
│   └── services/
│       ├── auth.service.ts        # POST /auth/login, /auth/register
│       ├── friend.service.ts      # POST /friends/* routes
│       ├── message.service.ts     # POST /message/* routes
│       └── websocket.service.ts   # ws://localhost:8000/ws/chat?token=...
├── features/
│   ├── auth/
│   │   ├── login/                 # Login page
│   │   └── register/              # Register page
│   ├── chat/                      # Main chat screen (real-time)
│   └── friends/
│       ├── friend-list/           # Find users, send friend requests
│       └── friend-requests/       # View & accept pending requests
└── app.routes.ts                  # All routes

src/environments/
└── environment.ts                 # apiUrl + wsUrl config
```

## Backend API mapping

| Angular Service         | Backend Route                    | Body                                      |
|------------------------|----------------------------------|-------------------------------------------|
| auth.register()        | POST /auth/register              | name, email, phonenumber, password, location |
| auth.login()           | POST /auth/login                 | email, password                           |
| auth.getAllUsers()      | GET /auth/user                   | —                                         |
| friend.sendRequest()   | POST /friends/connect            | from_user, to_user                        |
| friend.getPending()    | POST /friends/pending-request    | to_user                                   |
| friend.acceptRequest() | POST /friends/request            | from_user, to_user                        |
| friend.getFriendsList()| POST /friends/friend-list        | from_user                                 |
| message.getMessages()  | POST /message/get-messages       | sender_id, receiver_id                    |
| WebSocket connect      | ws://localhost:8000/ws/chat      | ?token=JWT                                |

## WebSocket events

**Send from Angular:**
```json
{ "type": "message",  "receiver_id": 2, "context": "Hello!" }
{ "type": "typing",   "receiver_id": 2, "is_typing": true }
{ "type": "read",     "receiver_id": 2 }
```

**Receive in Angular:**
```json
{ "type": "message",  "id": 5, "sender_id": 1, "context": "Hello!", "created_at": "..." }
{ "type": "typing",   "from_user_id": 1, "is_typing": true }
{ "type": "read",     "from_user_id": 1 }
{ "type": "presence", "user_id": 1, "status": "online" }
{ "type": "error",    "message": "reason" }
```

## Setup

```bash
# 1. Create Angular project
ng new chat-app --routing --style=css

# 2. Copy all files from this folder into src/

# 3. Run
ng serve

# 4. Make sure FastAPI backend is running
uvicorn main:app --reload
```

## CORS — add this to your FastAPI main.py

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```