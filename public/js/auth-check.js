import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// Run this on protected pages only
onAuthStateChanged(auth, (user) => {
  if (!user || !user.emailVerified) {
    // Redirect if not signed in or not verified
    window.location.href = "login.html";
  }
});
