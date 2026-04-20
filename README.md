# 💊 Apothecary — Smart Medicine Reminder System

## 👨‍💻 Authors

**Shrihari  Misal*

**Omkar Jaware**

JSPM's Bhivarabai Sawant Institute of Technology, Pune
Full Stack College Project — 2026
Live: https://medi1-flame.vercel.app

## 🌐 Live Demo
- App: https://medi1-flame.vercel.app


---

## ✨ Features

| Feature | Status |
|---|---|
| Email/password signup & login (JWT via Firebase Auth) | ✅ |
| Caregiver mode — manage multiple profiles | ✅ |
| Dashboard with daily health overview | ✅ |
| Add medicines with dosage, times, expiry, image | ✅ |
| Browser notification reminders at dose time | ✅ |
| Taken / Not Taken / Snooze actions | ✅ |
| Auto-mark missed after 30 min + email alert | ✅ |
| Stock auto-reduction on every taken dose | ✅ |
| Low stock email alerts (25%, 10%, 5%) | ✅ |
| Expiry alerts 30 & 7 days before | ✅ |
| Vacation mode per medicine | ✅ |
| Full dose history with timestamps | ✅ |
| Calendar view — green/yellow/red days | ✅ |
| Weekly & monthly reports with charts | ✅ |
| Light & Dark mode | ✅ |
| Fully mobile responsive | ✅ |
| HTML email alerts via Nodemailer | ✅ |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router v6 |
| **Database** | Firebase Firestore (NoSQL) |
| **Auth** | Firebase Authentication |
| **Storage** | Firebase Storage (prescription images) |
| **Charts** | Recharts |
| **Backend** | Node.js, Express.js |
| **Emails** | Nodemailer (Gmail SMTP) |
| **Cron Jobs** | node-cron (auto-miss, expiry checks) |
| **Hosting** | Vercel (frontend) |
| **Styling** | Custom CSS with CSS variables |

---

## 🚀 Setup & Deployment

### Step 1 — Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → name it `apothecary`
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database** → Start in test mode
5. Enable **Storage** → Start in test mode
6. Go to **Project Settings** → Your apps → Add Web App
7. Copy your config values

### Step 2 — Configure Environment
```bash
# Copy the example env file
cp .env.example .env

# Open .env and fill in your Firebase values
```

### Step 3 — Install & Run Locally
```bash
# Install frontend dependencies
npm install

# Start development server
npm run dev
# → Opens at http://localhost:5173
```

### Step 4 — Seed Demo Data
```bash
# Run the seed script to create demo user + sample medicines
npm run seed
# Demo login: demo@medreminder.com / Demo@1234
```

### Step 5 — Deploy to Vercel (Free Hosting)
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy!
vercel

# Add environment variables in Vercel dashboard:
# Settings → Environment Variables → add all VITE_FIREBASE_* values
```

### Step 6 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - Apothecary Medicine Reminder System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/apothecary.git
git push -u origin main
```

---

## 🔧 Backend Email Server (Optional)

The backend handles real email alerts for missed doses, low stock, and expiry warnings.

```bash
cd backend

# Install dependencies
npm install

# Create backend .env
cp ../.env.example .env
# Edit backend/.env with your Gmail credentials

# Download Firebase service account key:
# Firebase Console → Project Settings → Service Accounts → Generate New Private Key
# Save as backend/serviceAccountKey.json

# Start backend
npm start
# → Runs on http://localhost:3001
```

**Gmail App Password Setup:**
1. Google Account → Security → 2-Step Verification → Enable
2. Security → App Passwords → Create one for "Mail"
3. Use that 16-character password as `EMAIL_PASS`

---

## 📁 Project Structure

```
apothecary/
├── src/
│   ├── components/
│   │   ├── Auth/           # Login, Signup
│   │   ├── Dashboard/      # Main overview with stats + chart
│   │   ├── Medicines/      # List, Add, Edit medicines
│   │   ├── Calendar/       # Color-coded monthly calendar
│   │   ├── History/        # Dose log with filters
│   │   ├── Reports/        # Weekly/monthly charts
│   │   ├── Layout/         # Sidebar + Navbar
│   │   └── Notifications/  # Reminder system
│   ├── contexts/
│   │   ├── AuthContext.jsx  # Firebase auth + user profiles
│   │   └── ThemeContext.jsx # Light/Dark mode
│   ├── firebase/
│   │   ├── config.js        # Firebase initialization
│   │   └── seed.js          # Demo data seeder
│   └── index.css            # Global styles + design system
├── backend/
│   ├── server.js            # Express + Nodemailer + cron jobs
│   └── package.json
├── .env.example             # Environment variable template
├── vercel.json              # Vercel deployment config
└── README.md
```

---

## 🗃 Firestore Database Schema

```
users/{uid}
  ├── email, name, profiles[], emergencyContacts[]
  ├── medicines/{medicineId}
  │     ├── name, dosage, type, times[], quantity
  │     ├── totalQuantity, expiryDate, color
  │     ├── vacationMode, vacationDates[]
  │     └── prescriptionImage, profileId
  └── doseHistory/{entryId}
        ├── medicineId, medicineName
        ├── date (yyyy-MM-dd), time (HH:mm)
        ├── status (taken|missed|snoozed)
        └── timestamp, profileId, autoMissed
```

---

## 👨‍💻 Author

Built as a college project demonstrating full-stack development with React, Firebase, and Node.js.

---

## 📄 License

MIT
