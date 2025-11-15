// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBIYfBY35eG171EvLShED8iYq_eP6k_I94",
  authDomain: "wwsm-ugt.firebaseapp.com",
  projectId: "wwsm-ugt",
  storageBucket: "wwsm-ugt.firebasestorage.app",
  messagingSenderId: "33969424541",
  appId: "1:33969424541:web:ad9077b5bbeff89cc96c74",
  measurementId: "G-58YFRMKG33"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);