# 💖 BarbieGram Social Media Platform

A modern, full-stack social network built with **Node.js**, **Express**, **SQLite**, and **Vanilla Web Technologies** featuring an Instagram & Facebook hybrid Glassmorphism UI.

---

## 📁 Repository Structure

```
Social Media Platform/
├── 📂 backend/                  # Express Server, Database & File Storage
│   ├── src/
│   │   ├── config/              # Database setup & schema seeding (database.js)
│   │   ├── middleware/          # JWT authentication middleware (auth.js)
│   │   ├── routes/              # REST API endpoints (auth, users, posts, comments, upload)
│   │   └── server.js            # Express application entry point
│   ├── uploads/                 # Storage for user-uploaded image media
│   ├── social_app.db            # SQLite database file
│   └── package.json             # Backend dependencies and scripts
│
├── 📂 frontend/                 # Client Single Page Application (SPA)
│   ├── css/
│   │   └── styles.css           # Glassmorphic CSS styling & dark/light/neon themes
│   ├── js/                      # Modular JS (api.js, app.js, auth.js, ui.js)
│   └── index.html               # Main SPA HTML structure
│
├── 📄 README.md                 # Complete project documentation
```

---

## 🚀 Quick Start Guide

### 1. Installation
Install backend dependencies:
```bash
cd backend
npm install
```

### 2. Start Application
Run inside the `backend` folder:
```bash
cd backend
npm start
```

### 3. Open Browser
Navigate to **`http://localhost:5000`** in your web browser.

---

## ✨ Features & Architecture

### 1. 🔒 Strict Authentication Gate
- Access to the dashboard, feed, and search is protected. Unauthenticated visitors are presented with a dedicated **Login / Sign Up** screen.

### 2. 📸 Instagram-Style Stories Carousel
- Top horizontal stories stream with animated, glowing gradient rings (`.story-ring`) and story preview modals.

### 3. 👍 Facebook-Style Reactions System
- Hovering or clicking post like buttons opens a reaction popover: **Like 👍, Love ❤️, Sparkle ✨, Laugh 😂, Fire 🔥**.

### 4. 🔍 Live Search & Top Bar
- Instant user search bar in top navbar with real-time dropdown results.

### 5. 🎨 Multi-Theme Switcher
- One-click theme toggle between **Dark Glam Pink**, **Light Instagram Glam**, and **Neon Cyberpunk**.

### 6. 👤 Profile Banners & Cover Photos
- Full cover photo header, overlapping avatar, bio, and stat counters (**Posts**, **Followers**, **Following**).

---

## 📡 REST API Reference

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/auth/register` | `POST` | Create user account | No |
| `/api/auth/login` | `POST` | Authenticate user | No |
| `/api/auth/me` | `GET` | Get current user details | Yes |
| `/api/posts` | `GET` | Fetch post feed stream | Optional |
| `/api/posts` | `POST` | Publish new post | Yes |
| `/api/posts/:id` | `DELETE` | Delete owned post | Yes |
| `/api/posts/:id/like` | `POST` | Toggle post reaction/like | Yes |
| `/api/comments/post/:id` | `GET` | Fetch comments for post | Optional |
| `/api/comments/post/:id` | `POST` | Add comment to post | Yes |
| `/api/users/profile/:username` | `GET` | Get profile details | Optional |
| `/api/users/profile` | `PUT` | Update profile info & cover photo | Yes |
| `/api/users/:id/follow` | `POST` | Toggle follow user | Yes |
| `/api/upload` | `POST` | Upload image file | Optional |

---

## 🗄️ Database Schema

The SQLite database (`backend/social_app.db`) uses the following schema:
- `users`: Account details, display names, bios, avatar & cover image URLs.
- `posts`: User posts with optional image attachments.
- `comments`: Comments linked to posts and users.
- `likes`: Post likes with unique user constraints.
- `follows`: Follower and following relationships.
- `notifications`: User activity notifications.
