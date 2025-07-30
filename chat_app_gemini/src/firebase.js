import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA0GjSS-hcfq0zoTdWoXWgbb2gLdOpPCXE",
  authDomain: "universalchatboat.firebaseapp.com",
  projectId: "universalchatboat",
  storageBucket: "universalchatboat.appspot.com",
  messagingSenderId: "897759209009",
  appId: "1:897759209009:web:AIzaSyA0GjSS-hcfq0zoTdWoXWgbb2gLdOpPCXE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

