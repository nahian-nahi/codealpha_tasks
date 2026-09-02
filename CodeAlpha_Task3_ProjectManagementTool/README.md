# ⚡ PulseWork - Real-Time Collaborative Project Management Tool

**PulseWork** is a full-stack, real-time collaborative workspace application inspired by Trello and Asana. It empowers teams to organize projects, track tasks via interactive Kanban boards & List views, assign work, discuss tasks in real time, and receive instant WebSocket notifications.

---

## ✨ Features

- **🔐 User Authentication & Roles**:
  - Secure JWT authentication & bcrypt password hashing.
  - Multi-tenant group project workspaces with role permissions (`owner`, `admin`, `member`).
  - Pre-configured demo accounts with 1-click login buttons for instant multi-user testing.

- **📋 Interactive Project Boards (Kanban & List Views)**:
  - Custom drag-and-drop Kanban board columns ("To Do", "In Progress", "In Review", "Done").
  - Tabular list view with status filtering.
  - Custom column creation and column title editing.

- **📌 Rich Task Cards & Checklists**:
  - Task priority badges (`low`, `medium`, `high`, `urgent`).
  - Interactive subtask checklists with dynamic progress bar calculation.
  - Due date picker and multi-assignee member tagging.

- **💬 Real-Time Discussions & Comments**:
  - In-task comment threads with user avatars and timestamps.
  - Mentions and automatic activity logging.

- **⚡ WebSocket Synchronization (Socket.io)**:
  - **Live Card Movements**: When User A drags a task card, User B's board updates live in real time without refreshing.
  - **Instant Toast Alerts**: Real-time push notifications when tagged in a task or assigned to work.
  - **In-App Notification Center**: Unread badge counter and alert history drawer.

- **💾 Zero-Configuration Persistent Storage**:
  - Powered by embedded SQLite (`sqlite3`).
  - Auto-seeding on boot with realistic sample projects, columns, task cards, checklists, and discussions.

---

## 📁 Directory Structure

```
Project Management Tool/
├── backend/
│   ├── config/
│   │   ├── db.js              # SQLite connection & schema initialization
│   │   └── seed.js            # Default sample data generator
│   ├── middleware/
│   │   └── auth.js            # JWT token validation middleware
│   ├── routes/
│   │   ├── auth.js            # Registration, login, profile endpoints
│   │   ├── projects.js        # Project CRUD & team member endpoints
│   │   ├── columns.js         # Column management & positioning
│   │   ├── tasks.js           # Task cards, drag-and-drop move, checklists
│   │   ├── comments.js        # In-task comment threads
│   │   └── notifications.js   # User notification feed & read status
│   ├── database.sqlite        # Embedded SQLite database file
│   ├── server.js              # Express server & Socket.io WebSockets gateway
│   └── package.json
├── frontend/
│   ├── css/
│   │   └── style.css          # Glassmorphic dark design system & Kanban styles
│   ├── js/
│   │   └── app.js             # SPA state management & Socket.io integration
│   └── index.html             # Main web layout & interactive modals
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0.0 or higher)

### 1. Installation
Navigate to the `backend` directory and install dependencies:

```bash
cd backend
npm install
```

### 2. Start the Application
Run the backend server (which also serves the frontend Single Page App):

```bash
npm start
```

For development mode with automatic restarts on file changes:
```bash
npm run dev
```

### 3. Open in Browser
Open your browser and navigate to:
👉 **`http://localhost:5000`**

---

## 👥 Pre-Configured Demo Accounts

For testing multi-user real-time collaboration across multiple windows or devices, use these pre-filled credentials:

| Name | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Alex Rivera** | UI/UX Lead (Owner) | `alex@example.com` | `password123` |
| **Sarah Chen** | Senior Dev (Admin) | `sarah@example.com` | `password123` |
| **Mike Vance** | Backend Engineer | `mike@example.com` | `password123` |

> 💡 **Tip**: Click any of the **Quick Demo Buttons** on the login screen for instant 1-click access!

---

## 🧪 Testing Real-Time Sync Across Windows

1. Open `http://localhost:5000` in two separate browser windows (or standard + incognito window).
2. Log in as **Alex** in Window 1, and **Sarah** in Window 2.
3. Open the project **"NextGen E-Commerce Platform"** in both windows.
4. Drag a card from **In Progress** to **In Review** or post a comment in Window 1.
5. Watch Window 2 automatically move the card and trigger a live toast notification in real time!

---

## 🛠️ API Endpoint Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Create a new user account.
- `POST /api/auth/login`: Authenticate and receive JWT token.
- `GET /api/auth/me`: Fetch authenticated user profile.
- `GET /api/auth/users`: List all registered users for team assignments.

### Projects (`/api/projects`)
- `GET /api/projects`: Get projects joined by authenticated user.
- `POST /api/projects`: Create a new group project workspace.
- `GET /api/projects/:id`: Get detailed project payload with members, columns, and tasks.
- `POST /api/projects/:id/members`: Add a team member to a project.

### Tasks & Columns (`/api`)
- `POST /api/projects/:projectId/columns`: Add a new board column.
- `POST /api/projects/:projectId/tasks`: Create a task card.
- `GET /api/tasks/:id`: Fetch complete task card details.
- `PUT /api/tasks/:id/move`: Update task column/position (broadcasts live `task_moved` via WebSockets).
- `POST /api/tasks/:id/comments`: Add a comment to task discussion thread.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
