import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBEbJ7qaARO8Yk-dW0T8k2DGnDbxltZNtw",
  authDomain: "sneakers-for-less.firebaseapp.com",
  projectId: "sneakers-for-less",
  storageBucket: "sneakers-for-less.firebasestorage.app",
  messagingSenderId: "583903568327",
  appId: "1:583903568327:web:5be80a6c2b4e7745c979e2",
  measurementId: "G-2KVS05QJZT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
