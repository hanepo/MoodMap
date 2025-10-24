# Admin Panel Setup Guide

## 🔐 How to Access the Admin Panel

### Option 1: Set Yourself as Admin in Firebase Console (Easiest)

1. **Open Firebase Console**
   - Go to https://console.firebase.google.com
   - Select your project: `moodmap-mobile`

2. **Navigate to Firestore Database**
   - Click "Firestore Database" in left sidebar
   - Click on the `users` collection

3. **Find Your User Document**
   - Look for the document with your user ID (uid)
   - Or search by your email address

4. **Add Admin Role**
   - Click on your user document to open it
   - Click "Add field" button
   - Field name: `role`
   - Field type: `string`
   - Field value: `admin`
   - Click "Update"

5. **Restart Your App**
   - Close and reopen the MoodMap app
   - The "Admin Panel" section will now appear in Settings

---

### Option 2: Modify SignUpScreen to Create Admin on Signup

Edit `src/auth/SignUpScreen.js` line 84-98:

```javascript
await setDoc(doc(db, 'users', user.uid), {
  displayName,
  email: user.email,
  role: 'admin', // <--- Change 'user' to 'admin' for admin accounts
  phoneNumber: null,
  photoURL: null,
  createdAt: new Date(),
  lastLogin: new Date(),
  // ... rest of fields
});
```

**Note:** After creating your admin account, change this back to `'user'` so normal users don't get admin access!

---

## 📍 How to Navigate to Admin Panel

### From Settings Screen:
1. Open your app
2. Tap on **Settings** (gear icon in bottom navigation)
3. Scroll down to the **"Admin Panel"** section (only visible if you're an admin)
4. Tap **"Admin Dashboard"**

### Admin Panel Features:
- **Admin Dashboard** - KPI cards (total users, active today, tasks, alerts)
- **User Management** - View, search, edit, deactivate, delete users
- **Quick Actions** - Navigate to Task Categories, Analytics, Reports, Logs, Docs (coming soon)

---

## 🗄️ Database Structure

Your user document in Firestore should look like this:

```
users/{userId}
  ├── displayName: "Your Name"
  ├── email: "your@email.com"
  ├── role: "admin"  <-- IMPORTANT!
  ├── isActive: true
  ├── createdAt: Timestamp
  ├── lastLogin: Timestamp
  ├── totalMoodEntries: 0
  ├── totalTasks: 0
  ├── completedTasks: 0
  └── preferences: { ... }
```

---

## 🧪 Testing Admin Access

1. **Sign in with your account**
2. **Check Settings screen** - You should see "Admin Panel" section
3. **Tap Admin Dashboard** - Should navigate to AdminHome screen
4. **Verify KPIs load** - Total users, active today, tasks, alerts
5. **Tap "User Management"** - Should show list of all users
6. **Try search/filter** - Search by name/email, filter by active/inactive status

---

## 🔒 Security Notes

- Admin access is controlled by the `role` field in Firestore
- Currently, this is client-side only (user can modify their own role)
- **For production**, implement Firebase Security Rules:

```javascript
// Firestore Security Rules (firestore.rules)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow admins to read all users
    match /users/{userId} {
      allow read: if request.auth != null &&
        (request.auth.uid == userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');

      allow write: if request.auth != null && request.auth.uid == userId;

      // Prevent users from changing their own role
      allow update: if request.auth != null &&
        request.auth.uid == userId &&
        request.resource.data.role == resource.data.role;
    }
  }
}
```

---

## ✅ Files Created

1. **Admin Service**: `src/services/adminService.js`
2. **Admin Home**: `src/screens/admin/AdminHome.js`
3. **User Management**: `src/screens/admin/UserManagement.js`
4. **Admin Guard**: `src/navigation/requireAdmin.js`
5. **Navigation**: Updated `App.js` and `src/screens/SettingsScreen.js`

---

## 🚀 Next Steps

After verifying admin access works:

1. **Add more admins** - Set `role: 'admin'` for other user documents
2. **Implement Phase 2** - Task Categories CRUD screen
3. **Implement Phase 3** - Analytics & Charts screen
4. **Implement Phase 4** - Reports & CSV Export
5. **Implement Phase 5** - System Logs viewer
6. **Implement Phase 6** - Documentation manager
7. **Add tests** - Unit and integration tests for admin features

---

## 🐛 Troubleshooting

**"Admin Panel" section not showing in Settings:**
- Check that `role: 'admin'` field exists in your Firestore user document
- Restart the app after adding the role
- Check console for errors with `useIsAdmin()` hook

**Admin screens show errors:**
- Verify Firebase config is correct in `src/config/firebase.js`
- Check that all admin screen files exist in `src/screens/admin/`
- Verify imports in `App.js` are correct

**Users list is empty:**
- Check that you have users in the `users` collection in Firestore
- Verify Firestore security rules allow reading user documents
- Check console for Firebase permission errors

---

Need help? Check the admin service implementation in `src/services/adminService.js` for detailed comments.
