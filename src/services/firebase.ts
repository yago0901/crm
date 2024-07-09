import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuração do Firebase do seu aplicativo web
const firebaseConfig = {
  apiKey: "AIzaSyDejsQiYU9j_7wGEat0tgvWzlxaOGDEaYs",
  authDomain: "crm-dev-assina.firebaseapp.com",
  projectId: "crm-dev-assina",
  storageBucket: "crm-dev-assina.appspot.com",
  messagingSenderId: "846656781444",
  appId: "1:846656781444:web:56d557966e2f2ba052d6d1",
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);

// Inicializar serviços do Firebase
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

export { app, auth, firestore, storage };
