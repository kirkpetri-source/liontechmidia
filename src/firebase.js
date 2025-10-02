import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBfZgvgZNr0mXxDyWwEuoggMFYUXkyLUI0",
  authDomain: "lion-tech-midia.firebaseapp.com",
  projectId: "lion-tech-midia",
  storageBucket: "lion-tech-midia.firebasestorage.app",
  messagingSenderId: "853292395141",
  appId: "1:853292395141:web:b5acee093be30a58ce17ec"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);