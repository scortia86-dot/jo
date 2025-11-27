import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// 제공된 Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBVUe5HxKS-tjihCGOX79inGiQHYoHLgLE",
  authDomain: "education-41f70.firebaseapp.com",
  projectId: "education-41f70",
  storageBucket: "education-41f70.firebasestorage.app",
  messagingSenderId: "686859048406",
  appId: "1:686859048406:web:fd4bb317be0c7481c20077",
  measurementId: "G-V4KXY3NNVZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Analytics Initialization (Optional)
let analytics;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Analytics initialization failed (usually fine in dev environments):", e);
  }
}

console.log("Firebase initialized with project:", firebaseConfig.projectId);

export { db, app, analytics, auth };