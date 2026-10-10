# Online Alumni Management System

A modern, full-featured web-based **Online Alumni Management System** designed for colleges and universities. The platform allows graduates to connect, maintain their professional profiles, view events, explore career opportunities, read official announcements, and showcase their achievements, while granting administrators complete control over alumni records, events, jobs, announcements, and feedback.

Built strictly using **HTML5, CSS3, Vanilla JavaScript (ES6+ Modules), Firebase Authentication, Cloud Firestore, and Firebase Storage** without any third-party UI frameworks (No React, Angular, Vue, Next.js, Bootstrap, or Tailwind CSS).

---

## 1. Project Overview

The system bridges the gap between academic institutions and their global graduate community. It provides role-based access control with two primary roles:

### 🎓 Alumni User Features
- **Account Registration:** Register with detailed academic, personal, and career data. Self-registration automatically assigns the `alumni` role (users cannot register as admin).
- **Authentication:** Secure Email & Password login, session persistence, and password reset via Firebase Auth.
- **Member Dashboard:** View personalized greeting, avatar, dynamic profile completion progress bar, upcoming events, and recent notices.
- **Profile Management:** View full profile and update personal, academic, and career details with real-time Firestore updates (prevents duplicate documents).
- **Alumni Directory:** Browse all registered graduates with dynamic multi-field search (by name, company, location) and dropdown filters (by department, graduation year, degree).
- **Events & Reunions:** Browse upcoming campus and alumni events with dates, venues, organizers, and RSVP action.
- **Career Opportunities:** View verified job openings with employment type badges, salary details, and application links.
- **Announcements:** Read official college bulletins with highlighted "Important Notice" badges.
- **Achievements Portfolio:** Add, edit, and delete personal awards, honors, and certificates. Strict ownership rules ensure alumni can only modify their own achievements.
- **Contact & Feedback:** Submit inquiries and messages directly to administrators.

### 🛡️ Administrator Features
- **Admin Authentication Guard:** Protected routes ensure normal alumni cannot access any administrative page.
- **Admin Dashboard:** Real-time statistics dynamically loaded from Firestore:
  - *Total Alumni*
  - *Total Events*
  - *Total Jobs*
  - *Total Announcements*
  - *Total Feedback*
  - Previews of recent alumni registrations and events.
- **Alumni Management (CRUD):** View responsive table, search, filter, add alumni, view detailed profile modal, edit existing record, and delete alumni with custom confirmation dialogs.
- **Events Management (CRUD):** Add events, view events table, edit event details/banners, and delete events with confirmation.
- **Jobs Management (CRUD):** Post career opportunities, view listings, update listings, and remove filled openings.
- **Announcements Management (CRUD):** Publish urgent notices, view notices, update descriptions, and remove expired announcements.
- **Feedback Management:** Read full inquiry messages received from the public contact page and delete handled inquiries.

---

## 2. Technologies Used

- **Frontend:**
  - **HTML5:** Semantic, accessible layout.
  - **CSS3:** Custom responsive styling using CSS Custom Properties (Theme variables), Flexbox, CSS Grid, and custom modals/toasts. No external CSS frameworks.
  - **Vanilla JavaScript (ES6+):** Clean modular architecture with native ES modules (`import`/`export`), `async`/`await`, and modular Firebase SDK.
- **Backend & Database:**
  - **Firebase Authentication:** Handles secure user authentication, password resets, and session tokens.
  - **Cloud Firestore (Modular SDK v10):** Real-time NoSQL cloud database for data storage and CRUD operations.
  - **Firebase Storage (Modular SDK v10):** Media and image asset management (avatars, event banners, achievement certificates).

---

## 3. Project Directory Structure

```text
alumni-management-system/
│
├── index.html                  # Homepage with hero, stats, and dynamic previews
├── about.html                  # Mission, vision, objectives, and networking importance
├── login.html                  # Role-based login and forgot password modal
├── register.html               # Multi-field alumni registration (strictly role: alumni)
├── alumni.html                 # Public/member searchable & filterable directory
├── dashboard.html              # Authenticated alumni dashboard with progress bar
├── profile.html                # Alumni profile view & update (Firestore UPDATE)
├── achievements.html           # Alumni portfolio CRUD (Ownership-protected)
├── events.html                 # Upcoming campus and alumni events
├── jobs.html                   # Career listings and application links
├── announcements.html          # Official college announcements
├── contact.html                # Contact form saving to feedback collection
│
├── admin-dashboard.html        # Admin portal overview with dynamic statistics
├── admin-alumni.html           # Admin alumni management (Full CRUD)
├── admin-events.html           # Admin events management (Full CRUD)
├── admin-jobs.html             # Admin job listings management (Full CRUD)
├── admin-announcements.html    # Admin announcements management (Full CRUD)
├── admin-feedback.html         # Admin feedback and inquiry management
│
├── css/
│   ├── style.css               # Global theme (navy blue/slate), components, cards, tables, toasts
│   ├── auth.css                # Authentication pages (login, register)
│   ├── dashboard.css           # Alumni dashboard, completion bar, and achievements
│   ├── admin.css               # Admin layout, sidebar, stat cards, action toolbars
│   └── responsive.css          # Mobile drawer menu, stacked forms, responsive tables
│
├── js/
│   ├── firebase-config.js      # Centralized Firebase initialization (Modular SDK)
│   ├── utils.js                # Reusable toasts, modals, formatting, loading & empty states
│   ├── auth.js                 # Auth state observer, role checker, login, register, logout
│   ├── index.js                # Homepage dynamic data loader
│   ├── login.js                # Login & password reset form controller
│   ├── register.js             # Registration controller with client validation
│   ├── dashboard.js            # Alumni dashboard & profile completion calculation
│   ├── profile.js              # Profile view & Firestore update controller
│   ├── alumni.js               # Alumni directory search & filter controller
│   ├── events.js               # Events listing & RSVP modal controller
│   ├── jobs.js                 # Job opportunities search & filter controller
│   ├── announcements.js        # Announcements controller with priority sorting
│   ├── achievements.js         # Achievements CRUD controller with user ownership
│   ├── contact.js              # Contact form submission to Firestore feedback
│   ├── admin.js                # Admin dashboard statistics & sidebar layout controller
│   ├── admin-alumni.js         # Admin alumni CRUD controller
│   ├── admin-events.js         # Admin events CRUD controller
│   ├── admin-jobs.js           # Admin jobs CRUD controller
│   ├── admin-announcements.js  # Admin announcements CRUD controller
│   └── admin-feedback.js      # Admin feedback viewer and delete controller
│
├── assets/
│   └── images/
│       ├── logo.svg            # University Alumni Crest SVG logo
│       ├── avatar-default.svg  # Default avatar placeholder SVG
│       └── event-placeholder.svg # Event banner placeholder SVG
│
├── firestore.rules             # Role-based and ownership-checked Firestore security rules
└── README.md                   # Complete documentation and viva guide
```

---

## 4. Cloud Firestore Collections & Schemas

### 1. `users` Collection
Stores authentication metadata and security roles. Document ID matches `user.uid`.
```json
{
  "uid": "FIREBASE_AUTH_UID",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "alumni",       // "alumni" | "admin"
  "createdAt": "2026-10-08T00:00:00.000Z"
}
```

### 2. `alumni` Collection
Stores the comprehensive alumni profile. Document ID matches `user.uid`.
```json
{
  "uid": "FIREBASE_AUTH_UID",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1 555-0199",
  "gender": "Female",
  "dob": "1999-05-15",
  "graduationYear": "2022",
  "department": "Computer Science & Engineering",
  "degree": "B.Tech / B.E.",
  "company": "Google",
  "jobPosition": "Software Engineer",
  "location": "Seattle, WA, USA",
  "linkedin": "https://linkedin.com/in/janedoe",
  "bio": "Passionate about distributed systems and cloud architecture.",
  "profileImage": "https://...",
  "createdAt": "2026-10-08T00:00:00.000Z",
  "updatedAt": "2026-10-08T00:00:00.000Z"
}
```

### 3. `events` Collection
Document ID is auto-generated.
```json
{
  "title": "Annual Alumni Reunion 2026",
  "description": "Join us on campus for keynote speeches, dinner, and networking.",
  "date": "2026-11-20",
  "time": "18:00",
  "venue": "Grand University Auditorium",
  "organizer": "Alumni Affairs Office",
  "imageUrl": "assets/images/event-placeholder.svg",
  "createdAt": "2026-10-08T00:00:00.000Z",
  "updatedAt": "2026-10-08T00:00:00.000Z"
}
```

### 4. `jobs` Collection
Document ID is auto-generated.
```json
{
  "title": "Cloud Solutions Architect",
  "company": "Microsoft",
  "location": "Redmond, WA / Remote",
  "type": "Full-time",
  "description": "Looking for alumni with 3+ years in Azure or AWS infrastructure.",
  "salary": "$130k - $160k",
  "applicationLink": "https://careers.microsoft.com",
  "postedDate": "2026-10-05",
  "createdAt": "2026-10-08T00:00:00.000Z"
}
```

### 5. `announcements` Collection
Document ID is auto-generated.
```json
{
  "title": "Call for Alumni Mentor Volunteers",
  "description": "Applications are now open for the Spring 2027 Student Mentorship Batch.",
  "date": "2026-10-08",
  "isImportant": true,
  "createdAt": "2026-10-08T00:00:00.000Z"
}
```

### 6. `achievements` Collection
Document ID is auto-generated. Strictly linked to authenticated user via `userId`.
```json
{
  "userId": "FIREBASE_AUTH_UID",
  "title": "Outstanding Young Engineer Award",
  "organization": "IEEE Regional Section",
  "date": "2026-08-14",
  "description": "Awarded for contributions to sustainable edge computing algorithms.",
  "imageUrl": "",
  "createdAt": "2026-10-08T00:00:00.000Z",
  "updatedAt": "2026-10-08T00:00:00.000Z"
}
```

### 7. `feedback` Collection
Document ID is auto-generated.
```json
{
  "name": "Alex Mercer",
  "email": "alex@example.com",
  "subject": "Starting a European Alumni Chapter",
  "message": "Hello, several graduates in Berlin would like to establish an official chapter...",
  "createdAt": "2026-10-08T00:00:00.000Z"
}
```

---

## 5. Firebase Setup Guide (Step-by-Step)

### Step 1: Create a Firebase Project
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Enter a project name (e.g. `alumni-management-system`) and click **Continue**.
4. (Optional) Disable Google Analytics for academic testing, then click **Create project**.

### Step 2: Enable Email/Password Authentication
1. In the Firebase Console left sidebar, click **Build** > **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Enable the first toggle: **Email/Password** (leave Email link passwordless disabled).
5. Click **Save**.

### Step 3: Create Cloud Firestore Database
1. In the left sidebar, click **Build** > **Firestore Database**.
2. Click **Create database**.
3. Choose a Firestore location close to your region (e.g., `nam5 (us-central)` or `asia-south1`).
4. Select **Start in production mode** (or test mode).
5. Click **Create**.
6. Switch to the **Rules** tab in Firestore and paste the contents of `firestore.rules` from this repository, then click **Publish**.

### Step 4: (Optional) Enable Firebase Storage
1. In the left sidebar, click **Build** > **Storage**.
2. Click **Get Started**, choose default security rules, and click **Done**.

### Step 5: Register Web Application & Copy Configuration
1. In the Firebase Console, click the **Project Overview** (gear icon ⚙️) > **Project settings**.
2. Under the **General** tab, scroll down to **Your apps**.
3. Click the Web icon `</>`.
4. Enter an App nickname (e.g. `AlumniWeb`), leave Firebase Hosting unchecked, and click **Register app**.
5. Copy the `firebaseConfig` object shown on the screen.

### Step 6: Paste Configuration into `js/firebase-config.js`
Open `js/firebase-config.js` in your project editor and replace the placeholder keys:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "alumni-management-system.firebaseapp.com",
    projectId: "alumni-management-system",
    storageBucket: "alumni-management-system.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};
```

---

## 6. Creating the Admin Account

To guarantee high security, **there is NO admin registration option on the public registration page**. Standard registration strictly assigns `role: "alumni"`.

Follow these simple steps to set up your Administrator account:

### Method 1: Using Firebase Console (Recommended for Viva)
1. Go to **Authentication** > **Users** in the Firebase Console.
2. Click **Add user**.
3. Enter your admin email and password:
   - Email: `admin@university.edu`
   - Password: `AdminPassword123`
4. Click **Add user**. Copy the generated **User UID** string (e.g., `4kL8j2X9...`).
5. Go to **Firestore Database** > **Data** tab.
6. Click **Start collection** (or click into the `users` collection).
   - Collection ID: `users`
   - Document ID: Paste the **User UID** copied from Authentication.
7. Add the following fields:
   - `uid` (string): Paste the User UID
   - `name` (string): `System Administrator`
   - `email` (string): `admin@university.edu`
   - `role` (string): `admin`   *(Must be exactly lowercase "admin")*
   - `createdAt` (string): `2026-10-08T00:00:00.000Z`
8. Click **Save**.

Now you can visit `login.html`, log in with `admin@university.edu`, and you will be immediately redirected to `admin-dashboard.html`!

---

## 7. How to Run the Project Locally

Because the application uses native JavaScript ES Modules (`import`/`export`), modern web browsers enforce CORS security and **will not load ES modules over the `file://` protocol**. You must run the project on a local HTTP development server.

### Option A: Using Python (Pre-installed on most machines)
Open your terminal or PowerShell in the project directory (`c:\project\alumni management system`):

```bash
# Python 3
python -m http.server 8000
```
Then open your browser and navigate to:
```
http://localhost:8000
```

### Option B: Using VS Code "Live Server" Extension
1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension by Ritwick Dey.
3. Right-click `index.html` in the file explorer and click **"Open with Live Server"**.
4. The application will launch automatically at `http://127.0.0.1:5500/index.html`.

### Option C: Using Node.js `npx serve`
```bash
npx serve .
```

---

## 8. Functional Flows & Architectural Lifecycle

### 1. Registration Flow
```
register.html 
   → Form validation (client-side checks)
   → createUserWithEmailAndPassword(auth, email, password)
   → Firebase Authentication generates UID
   → setDoc(doc(db, "users", uid), { role: "alumni", ... })
   → setDoc(doc(db, "alumni", uid), { ...profileData })
   → showToast("Account created successfully", "success")
   → Redirect to dashboard.html
```

### 2. Login & Role-Checking Flow
```
login.html 
   → signInWithEmailAndPassword(auth, email, password)
   → getDoc(doc(db, "users", user.uid))
   → Check doc.data().role
         ├── If role === 'admin'  → Redirect to admin-dashboard.html
         └── If role === 'alumni' → Redirect to dashboard.html
```
*Note: The role is never trusted from `localStorage`. The actual role is verified against the Firestore database upon each authenticated session.*

### 3. Alumni Profile Update Flow
```
profile.html 
   → Click "Edit Profile"
   → Modal opens populated with current data
   → User edits fields & selects optional new image
   → updateDoc / setDoc(..., { merge: true }) on alumni/{uid}
   → Updates updatedAt timestamp (No duplicate records created)
   → In-memory profile updated & UI refreshed dynamically without full page reload
```

### 4. Admin CRUD Operations Flow
```
Admin Page (e.g. admin-events.html)
   ├── READ:   getDocs(collection(db, "events")) → Renders responsive table
   ├── CREATE: addDoc(collection(db, "events"), payload) → Appends to table & shows toast
   ├── UPDATE: updateDoc(doc(db, "events", docId), payload) → Updates table row & shows toast
   └── DELETE: showConfirmModal() → deleteDoc(doc(db, "events", docId)) → Removes row & shows toast
```

---

## 9. Viva / Academic Presentation Q&A Guide

Here are standard questions examiners and professors frequently ask during project defense, along with sample concise explanations:

1. **Q: Why didn't you use React or Bootstrap?**
   *A:* Building with Vanilla HTML5, CSS3, and ES6 JavaScript demonstrates a deep understanding of core web fundamentals, DOM manipulation, asynchronous JavaScript, and CSS Grid/Flexbox architecture without relying on third-party framework abstractions.

2. **Q: How does the system prevent a user from making themselves an Admin?**
   *A:* 
   - On the client side, `register.html` contains no role selection input; the code hardcodes `role: "alumni"`.
   - On the server side, Firestore Security Rules strictly enforce `request.resource.data.role == 'alumni'` for self-registration.
   - Admin privileges can only be granted by existing admins or directly via the Firebase Console.

3. **Q: Why is role-checking done against Firestore instead of storing the role in `localStorage`?**
   *A:* `localStorage` is insecure and easily editable by any user using browser DevTools. Checking the role directly against Firestore ensures tamper-proof authorization.

4. **Q: How does the profile completion percentage work?**
   *A:* In `js/utils.js`, `calculateProfileCompletion()` tracks 13 key fields (name, phone, gender, dob, graduation year, department, degree, company, job position, location, linkedin, bio, and profile image). It calculates the ratio of completed fields over total tracked fields and animates a progress bar dynamically on the alumni dashboard.

5. **Q: How are database queries optimized during CRUD actions?**
   *A:* After a successful `updateDoc` or `addDoc`, the in-memory array is updated locally and re-rendered without triggering an expensive full database re-fetch or full page reload.

---

## 10. License
Developed for academic, college, and university final year project demonstrations. Free to adapt and customize.
