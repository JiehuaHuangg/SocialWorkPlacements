import { auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// Find and attach logout button event
const logoutButton = document.getElementById("logoutBtn");

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        console.log("User signed out.");
        window.location.href = "/public/pages/login.html"; // Redirect to login page
      })
      .catch((error) => {
        console.error("Logout error:", error);
        alert("An error occurred while logging out.");
      });
  });
}
