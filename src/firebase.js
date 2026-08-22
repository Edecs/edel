// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, set, get, remove, push } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

export const firebaseConfig = {
  apiKey: "AIzaSyAVBZM-PPlw7RQIZNfSbjXlmyR-yMjof8A",
  authDomain: "edecs-elearning.firebaseapp.com",
  databaseURL: "https://edecs-elearning-default-rtdb.firebaseio.com",
  projectId: "edecs-elearning",
  storageBucket: "edecs-elearning.appspot.com",
  messagingSenderId: "489244446050",
  appId: "1:489244446050:web:4fc23cb4c80db04a5af03b",
  measurementId: "G-HVRLR3CN70",
};

const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);
const firestoreDb = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const functions = getFunctions(firebaseApp);

export {
  auth,
  db,
  firestoreDb,
  storage,
  functions,
  ref,
  set,
  get,
  remove,
  push,
};
