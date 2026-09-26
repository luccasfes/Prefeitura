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
export const db = getFirestore(app);
export const auth = getAuth(app);

// Proteção de rotas global
onAuthStateChanged(auth, (user) => {
    const isLoginPage = window.location.pathname.includes("login.html");
    if (!user && !isLoginPage) {
        window.location.href = "login.html"; // Joga para o login se não tiver acesso
    } else if (user && isLoginPage) {
        window.location.href = "index.html"; // Joga para o dashboard se já estiver logado
    }
});

// Função global para sair
window.fazerLogout = () => signOut(auth);