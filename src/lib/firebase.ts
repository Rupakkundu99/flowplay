// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA8Iihz1t0irS5AUW6VBiyflRgSeXcqA_g",
  authDomain: "flowplay-888c6.firebaseapp.com",
  projectId: "flowplay-888c6",
  storageBucket: "flowplay-888c6.firebasestorage.app",
  messagingSenderId: "159451191557",
  appId: "1:159451191557:web:fe1fcc3bcd044bd49c3f6c",
  measurementId: "G-Z7SXZ6V55B"
};

// Initialize Firebase only if it hasn't been initialized already (helps with Next.js HMR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider, analytics };