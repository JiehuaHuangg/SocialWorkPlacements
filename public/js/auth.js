import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";



// DOM elements
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginError = document.getElementById("loginError");
const signupError = document.getElementById("signupError");

// Login functionality
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = loginForm["loginEmail"].value;
    const password = loginForm["loginPassword"].value;
    loginError.classList.add("d-none");

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;

        if (!user.emailVerified) {
          loginError.textContent = "Please verify your email address before logging in.";
          loginError.classList.remove("d-none");
          return;
        }

        const modalEl = document.getElementById("loginModal");
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
        loginForm.reset();
        window.location.href = "upload-file.html";
      })
      .catch((error) => {
        loginError.textContent = error.message;
        loginError.classList.remove("d-none");
      });
  });
}

// Signup functionality
if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = signupForm["signupName"].value;
    const email = signupForm["signupEmail"].value;
    const password = signupForm["signupPassword"].value;
    const confirmPassword = signupForm["signupConfirmPassword"].value;
    signupError.classList.add("d-none");

    if (password !== confirmPassword) {
      signupError.textContent = "Passwords do not match";
      signupError.classList.remove("d-none");
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;

        // Send verification email
        return sendEmailVerification(user).then(() => {
          // Save user data in Firestore
          return setDoc(doc(db, "users", user.uid), {
            name,
            email,
            role: "coordinator",
            createdAt: serverTimestamp(),
          });
        });
      })
      .then(() => {
        // Show verification instruction message in modal
        const signupBody = document.querySelector("#signupModal .modal-body");
        signupBody.innerHTML = `
          <div class="text-center">
            <h5 class="text-success">Signup Successful!</h5>
            <p class="mt-3">Please check your <strong>@uwa.edu.au</strong> inbox and verify your email before logging in.</p>
            <button class="btn btn-primary mt-3" data-bs-dismiss="modal">Close</button>
          </div>
        `;
      })
      .catch((error) => {
        signupError.textContent = error.message;
        signupError.classList.remove("d-none");
      });
  });
}

// Auth state monitoring
onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;

  if (user && user.emailVerified) {
    console.log("Logged in:", user.email);
    if (path === "/" || path.endsWith("/login.html")) {
      window.location.href = "upload-file.html";
    }
  } else if (!user) {
    console.log("Logged out");
    if (!path.endsWith("/login.html") && !path.endsWith("/index.html")) {
      window.location.href = "login.html";
    }
  }
});
