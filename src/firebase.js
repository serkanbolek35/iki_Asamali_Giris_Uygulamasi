import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔧 BURAYA KENDİ FIREBASE YAPILANDIRMANIZI GİRİN
// Firebase Console > Project Settings > Your apps > SDK Setup
const firebaseConfig = {
  apiKey: "AIzaSyDKSIt7lysRkQJQGkG88x2EPSbvd_T4NmA",
  authDomain: "ikiasamaligiris.firebaseapp.com",
  projectId: "ikiasamaligiris",
  storageBucket: "ikiasamaligiris.firebasestorage.app",
  messagingSenderId: "924227829522",
  appId: "1:924227829522:web:8365e59c9803ec8d547dcb",
  measurementId: "G-363ZQJDCG2"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;