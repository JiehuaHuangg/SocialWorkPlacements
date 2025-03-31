// Import necessary modules
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth"
import { getFirestore, collection, doc, setDoc, addDoc, serverTimestamp } from "firebase/firestore"
import { initializeApp } from "firebase/app"
import { Modal } from "bootstrap"

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyAtaf5eAkVjCmy4JzBSzoerR-cLRkD4GRM",
  authDomain: "social-work-placement.firebaseapp.com",
  projectId: "social-work-placement",
  storageBucket: "social-work-placement.firebasestorage.app",
  messagingSenderId: "465758786519",
  appId: "1:465758786519:web:04ae2f164411dbcf4bb192"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and Firestore
const auth = getAuth(app)
const db = getFirestore(app)
const firebase = {
  firestore: {
    FieldValue: {
      serverTimestamp: serverTimestamp,
    },
  },
}
const bootstrap = {
  Modal: Modal,
}

// DOM elements
const loginForm = document.getElementById("loginForm")
const signupForm = document.getElementById("signupForm")
const loginError = document.getElementById("loginError")
const signupError = document.getElementById("signupError")
const contactForm = document.getElementById("contactForm")

// Login functionality
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault()

    // Get user info
    const email = loginForm["loginEmail"].value
    const password = loginForm["loginPassword"].value

    // Clear previous errors
    loginError.classList.add("d-none")

    // Sign in the user
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Close the login modal
        const modal = bootstrap.Modal.getInstance(document.getElementById("loginModal"))
        modal.hide()

        // Reset form
        loginForm.reset()

        // Redirect to import data page
        window.location.href = "upload-file.html"
      })
      .catch((error) => {
        // Display error message
        loginError.textContent = error.message
        loginError.classList.remove("d-none")
      })
  })
}

// Signup functionality
if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault()

    // Get user info
    const name = signupForm["signupName"].value
    const email = signupForm["signupEmail"].value
    const password = signupForm["signupPassword"].value
    const confirmPassword = signupForm["signupConfirmPassword"].value

    // Clear previous errors
    signupError.classList.add("d-none")

    // Check if passwords match
    if (password !== confirmPassword) {
      signupError.textContent = "Passwords do not match"
      signupError.classList.remove("d-none")
      return
    }

    // Create user
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Add user to Firestore
        return setDoc(doc(db, "users", userCredential.user.uid), {
          name: name,
          email: email,
          role: "coordinator", // Default role
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        })
      })
      .then(() => {
        // Close the signup modal
        const modal = bootstrap.Modal.getInstance(document.getElementById("signupModal"))
        modal.hide()

        // Reset form
        signupForm.reset()

        // Redirect to import data page
        window.location.href = "/upload-file.html"
      })
      .catch((error) => {
        // Display error message
        signupError.textContent = error.message
        signupError.classList.remove("d-none")
      })
  })
}

// Check auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    console.log("User logged in:", user.email)

    // Check if we're on the home page and redirect if needed
    if (window.location.pathname === "/" || window.location.pathname === "/login.html") {
      // Redirect to import page if already logged in
      window.location.href = "upload-file.html"
    }
  } else {
    // User is signed out
    console.log("User logged out")

    // Check if we're on a protected page and redirect if needed
    if (window.location.pathname !== "/" && window.location.pathname !== "/login.html") {
      // Redirect to home page if not logged in
      window.location.href = "login.html"
    }
  }
})

