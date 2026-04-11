import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBEpUog1zPTTSIG_oVX4o8ENZsDTO3krZE",
  authDomain: "net-ten-accounting.firebaseapp.com",
  projectId: "net-ten-accounting",
  storageBucket: "net-ten-accounting.appspot.com",
  messagingSenderId: "BOOM",
  appId: "1:1095937995425:web:9d2089d7044a007e6336e0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
