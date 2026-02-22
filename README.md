# 💊 MediTracker

MediTracker is a cross-platform mobile application designed to improve medication adherence for patients and enable caregivers to monitor treatment compliance remotely.

The system allows users to manage medication schedules, receive reminders, log adherence, and share adherence data with authorized caregivers.

---

## 🚀 Project Status

🟡 In Development (Agile – Sprint Based)

---

## 🎯 Objectives

- Help patients follow medication schedules
- Send timely medication reminders
- Track adherence history
- Enable caregiver monitoring
- Provide drug information lookup

---

## 🏗 System Architecture

MediTracker follows a three-tier architecture:

- Frontend: React Native (Expo)
- Backend: Node.js with Express
- Database: MongoDB
- Authentication: JWT-based authentication
- Notifications: Firebase Cloud Messaging
- External API: OpenFDA API (drug information)

---

## 📱 Core Features (MVP)

- User Registration & Login
- Role-Based Access (Patient / Caregiver)
- Add / Edit / Delete Medications
- Scheduled Reminder Notifications
- Mark Dose as Taken or Missed
- Adherence Tracking
- Caregiver Monitoring Dashboard

---

## 📂 Repository Structure

meditracker/
│
├── backend/          # Express API server
├── mobile/           # React Native application
├── docs/             # Documentation & diagrams
└── README.md

---

## 🔄 Agile Workflow

This project follows a lightweight Scrum methodology:

- 2-week sprints
- Trello board for task management
- Feature-based branching strategy
- Pull request workflow

Branch structure:

- main → Production-ready code
- develop → Active development
- feature/* → Individual features

---

## 🛠 Installation

### 1️⃣ Clone Repository

git clone https://github.com/MohamadKh01/MediTracker.git  
cd MediTracker  

---

### 2️⃣ Backend Setup

cd backend  
npm install  
npm run dev  

Environment variables will be required (see .env.example once created).

---

### 3️⃣ Mobile Setup

cd mobile  
npm install  
npx expo start  

---

## 📡 API Endpoints (Planned)

| Method    | Endpoint             | Description            |
|-----------|----------------------|------------------------|
| POST      | /api/auth/register   | Register user          |
| POST      | /api/auth/login      | Login user             |
| GET       | /api/medications     | Get user medications   |
| POST      | /api/medications     | Add medication         |
| POST      | /api/adherence       | Log dose               |

---

## 🔐 Security

- Passwords hashed using bcrypt
- JWT-based authentication
- Role-based access control
- Environment variables for secrets

---

## 📈 Future Enhancements

- Drug information lookup
- Offline-first support
- Smart reminder optimization
- Data visualization dashboard
- Improved caregiver analytics

---

## 👨‍💻 Author

Mohamad Khatib  
IN448 Project managment – 2026

---

## 📄 License

This project is developed for academic purposes.