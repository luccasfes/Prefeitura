import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCL1Nsx7quAA4fcInDGQf-VTYWSaESidZU",
  authDomain: "prefeitura-emendas.firebaseapp.com",
  projectId: "prefeitura-emendas",
  storageBucket: "prefeitura-emendas.firebasestorage.app",
  messagingSenderId: "93407787024",
  appId: "1:93407787024:web:2643786fb03ca0e87c3295"
};

// Inicializa a aplicação
const app = initializeApp(firebaseConfig);

// Instanciação explícita da base de dados e autenticação
export const db = getFirestore(app, "(default)");
export const auth = getAuth(app);