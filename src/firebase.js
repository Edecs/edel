// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, set, get, remove, push } from "firebase/database"; // استيراد push
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore"; // استيراد Firestore

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVBZM-PPlw7RQIZNfSbjXlmyR-yMjof8A",
  authDomain: "edecs-elearning.firebaseapp.com",
  databaseURL: "https://edecs-elearning-default-rtdb.firebaseio.com",
  projectId: "edecs-elearning",
  storageBucket: "edecs-elearning.appspot.com",
  messagingSenderId: "489244446050",
  appId: "1:489244446050:web:4fc23cb4c80db04a5af03b",
  measurementId: "G-HVRLR3CN70",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp); // Realtime Database
const firestoreDb = getFirestore(firebaseApp); // Firestore
const storage = getStorage(firebaseApp);

// Export services
export { auth, db, firestoreDb, storage, ref, set, get, remove, push }; // إضافة push هنا
