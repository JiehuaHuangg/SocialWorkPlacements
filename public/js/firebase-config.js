// Import Firebase modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtaf5eAkVjCmy4JzBSzoerR-cLRkD4GRM",
  authDomain: "social-work-placement.firebaseapp.com",
  projectId: "social-work-placement",
  storageBucket: "social-work-placement.appspot.com",
  messagingSenderId: "465758786519",
  appId: "1:465758786519:web:04ae2f164411dbcf4bb192"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
