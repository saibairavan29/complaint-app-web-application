# Worker Welfare Complaint Management Portal

This repository contains the complete **Worker Welfare Complaint Management Portal** system. The platform allows workers to log welfare complaints and administrators to investigate, track, manage, and resolve them through a secure portal.

---

## 👥 System Architecture & Portal Usage Policies

The system is partitioned into three key areas, each designed for specific user groups:

### 1. 👷‍♂️ Worker Portal
* **Target Audience**: Workers
* **Primary URL**: `http://localhost:3000/`
* **Purpose**: Allows workers to easily submit welfare complaints (e.g., issues with water, electricity, accommodation, safety) in their preferred language. They can attach voice clips and photos.
* **Security**: Publicly accessible. No login required for submission.
* **Features**:
  - **Complaint Submission**: Clean, language-specific wizard form.
  - **Voice Recording**: In-browser audio recording via the Web Audio API with playback review before submission.
  - **Media Uploads**: Image selection/upload capability with real-time progress bars (integrated with Cloudinary).
  - **Reference Tracking**: Instantly generates a unique, human-readable tracker ID (e.g. `CMP-2026-XXXXX`) upon submission.
  - **Multi-language Translation**: Fully localized in English, Hindi, Tamil, Telugu, Marathi, and Odia.

### 2. 📊 Admin Dashboard
* **Target Audience**: Welfare / Admin Team (Daily Operations)
* **Primary URL**: `http://localhost:3000/admin-dashboard`
* **Purpose**: Custom management dashboard. The Welfare and Admin team conducts all daily complaint tracking, status updates, user management (Super-Admin only), and audit logging from this interface.
* **Security**: Requires active administrative credentials (`is_staff=True` or `is_superuser=True`).
* **Features**:
  - **Interactive Analytics**: SVG-based distribution charts with cross-click filtering for Category, Status, Project, Location, and Monthly Trend.
  - **Advanced Tooltips**: Viewport-safe cursor-following tooltips showing breakdown counts of Pending, In Progress, Completed, Resolved, and Rejected tickets.
  - **Complaint Management**: Complete database filter and search control. Detail inspection modal with next/prev ticket navigation, voice player, and image lightbox.
  - **Status History Timeline**: Full auditable timeline showing state transitions, timestamps, and the operator who processed the update.
  - **Notification System**: Sliding activities drawer capturing key occurrences (new complaints, status updates, auth actions, user creation/disabling). Supports mark-as-read and mark-all-read with persisting read timestamps.
  - **User Management**: (Super Admin only) Operator accounts list. Controls to edit emails/roles, reset passwords, and disable/enable admins. Enforces self-lockout safeguards.
  - **Audit Logs**: (Super Admin only) Tracks login/logout events, client IP addresses, browser names, device types (Desktop vs Mobile), and calculates elapsed session durations.

### 3. 🔐 Django Admin Portal (Developer Console)
* **Target Audience**: Developers / System Administrators (Only)
* **Primary URL**: `http://localhost:8000/admin/`
* **Purpose**: Limited strictly to system maintenance, emergency recovery, debugging, database inspections, and backend configuration changes. Daily operations should **never** be performed here.
* **Security**: Strict access control. Restructured to enforce `is_superuser=True` (non-superuser staff accounts are blocked from logging in). Includes a direct header link back to the custom Admin Dashboard.

---

## 🛠 Running the System Locally

### Step 1: Run the Backend Django Server
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Start the server:
   ```bash
   python manage.py runserver
   ```
   *(Running on `http://localhost:8000`)*

### Step 2: Run the Frontend Next.js Server
1. Navigate to the root folder.
2. Start the development server:
   ```cmd
   npm.cmd run dev
   ```
   *(Running on `http://localhost:3000`)*

### Step 3: Populate Database Seeds (Optional)
To populate the database with project metadata and simulated complaint entries for testing, navigate to the `backend` folder and run:
```bash
python manage.py seed_projects
python manage.py seed_complaints
```

---

## 🧪 Operational Commands & System Recovery

### Emergency Superuser Creation
If you get locked out or need to bootstrap a Super Administrator account:
```bash
python manage.py createsuperuser
```

### Run API Verification Suites
Ensure all authentication policies, audit logs, timelines, and user lockout protections are fully working:
```bash
python verify_apis.py
python verify_phase5_apis.py
```
