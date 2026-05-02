import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyD4B5G5ntAbItIz6s5zfUOuMCWBekBjNOE",
  authDomain: "diario-de-experiencias.firebaseapp.com",
  projectId: "diario-de-experiencias",
  storageBucket: "diario-de-experiencias.firebasestorage.app",
  messagingSenderId: "177581985308",
  appId: "1:177581985308:web:409c6e36f4bf3ab19b19d9",
  measurementId: "G-HK6FNLESZ7",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
