import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// This is your new manual config for Neon Nexus Remastered
const firebaseConfig = {
  apiKey: "AIzaSyAkU09HI8X4Y69VNxaf4K46XKZqe7bVJ1U",
  authDomain: "neon-nexus-remastered.firebaseapp.com",
  projectId: "neon-nexus-remastered",
  storageBucket: "neon-nexus-remastered.firebasestorage.app",
  messagingSenderId: "534985661126",
  appId: "1:534985661126:web:91e7f404e4718d508715c7",
  measurementId: "G-0X34RB2V1D"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// We simplified this line to use your default database
export const db = getFirestore(app);
export const auth = getAuth(app);
