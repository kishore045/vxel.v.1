# Firebase Setup for G.K Home Appliances

This website is now production-ready for Firebase Auth + Firestore. Demo login and demo student records are removed.

## 1. Create Firebase Project
- Go to Firebase Console.
- Create a project for the client.
- Add a Web App.
- Copy the Firebase config values into `config.js`.

## 2. Enable Admin Login
- Firebase Console > Authentication > Sign-in method.
- Enable Email/Password.
- Add only your admin email and password.
- Do not write the password anywhere in the website.

## 3. Create Firestore Database
- Firebase Console > Firestore Database.
- Create database in production mode.
- Collection name used by the site: `students`.

## 4. Firestore Rules
Use this basic admin-only rule:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /students/{studentId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

For stricter security, restrict to your admin email:

```
allow read, write: if request.auth != null && request.auth.token.email == "YOUR_ADMIN_EMAIL";
```

## 5. Deploy
- Firebase Hosting is recommended for Google deployment.
- Do not use demo credentials.
- Keep `admin-dashboard.html` and login pages marked noindex.
