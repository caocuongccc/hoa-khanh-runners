import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // PASTE CONFIG BẠN COPY Ở BƯỚC 2.3.4 VÀO ĐÂY
  apiKey: "AIzaSyDDCwlyb_erTJVA-tlWyDOzvMEI0yNqGWg",
  authDomain: "hoa-khanh-runners.firebaseapp.com",
  projectId: "hoa-khanh-runners",
  storageBucket: "hoa-khanh-runners.firebasestorage.app",
  messagingSenderId: "1061154669873",
  appId: "1:1061154669873:web:23027c918161a6eb0e9c10",
  measurementId: "G-TQ3E1MKVND"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);