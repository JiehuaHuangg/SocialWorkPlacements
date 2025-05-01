// firebase-config.js

// 从CDN引入 initializeApp 和 getFirestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase配置（你的配置信息是对的）
const firebaseConfig = {
  apiKey: "AIzaSyAtaf5eAkVjCmy4JzBSzoerR-cLRkD4GRM",
  authDomain: "social-work-placement.firebaseapp.com",
  projectId: "social-work-placement",
  storageBucket: "social-work-placement.firebasestorage.app",
  messagingSenderId: "465758786519",
  appId: "1:465758786519:web:04ae2f164411dbcf4bb192"
};

// 初始化Firebase App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// 导出firestore实例
export const db = getFirestore(app);
