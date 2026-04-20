import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCy1j0qtusBdDWYzhJ8wCO3_Py7u7uLXKo",
  authDomain: "smart-expense-analyzer-a8d0b.firebaseapp.com",
  projectId: "smart-expense-analyzer-a8d0b",
  storageBucket: "smart-expense-analyzer-a8d0b.firebasestorage.app",
  messagingSenderId: "720705861814",
  appId: "1:720705861814:web:5a3c2c6a75811e34cb8e17"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;