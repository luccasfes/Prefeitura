import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCL1Nsx7quAA4fcInDGQf-VTYWSaESidZU",
  authDomain: "prefeitura-emendas.firebaseapp.com",
  projectId: "prefeitura-emendas",
  storageBucket: "prefeitura-emendas.firebasestorage.app",
  messagingSenderId: "93407787024",
  appId: "1:93407787024:web:2643786fb03ca0e87c3295"
};

const app = initializeApp(firebaseConfig);

// Instanciação explícita da base padrão
export const db = getFirestore(app, "(default)");
export const auth = getAuth(app);

// Proteção de rotas global
onAuthStateChanged(auth, (user) => {
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.endsWith("login.html") || currentPath.endsWith("login");

  if (!user && !isLoginPage) {
    window.location.href = "login.html";
  } else if (user && isLoginPage) {
    window.location.href = "index.html";
  }
});

// Função global para terminar sessão
window.fazerLogout = async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Erro ao encerrar sessão:", error);
  }
};