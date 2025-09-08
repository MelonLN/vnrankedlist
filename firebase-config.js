  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
  import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCV0_aY8FPopcjjV_WH_3Ia2yNdMy1QNtE",
  authDomain: "submition-ab076.firebaseapp.com",
  projectId: "submition-ab076",
  storageBucket: "submition-ab076.firebasestorage.app",
  messagingSenderId: "589882428266",
  appId: "1:589882428266:web:d9797acde6a00bc5f53313",
  measurementId: "G-VTTWDF59RX"
};

  const app = initializeApp(firebaseConfig);
  window.db = getFirestore(app);
  window.collection = collection;
  window.addDoc = addDoc;
  window.serverTimestamp = serverTimestamp;
  window.getDocs = getDocs;
