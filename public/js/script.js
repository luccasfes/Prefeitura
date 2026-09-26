import { db, auth } from "/js/firebase-config.js";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  Timestamp, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let idContratoEdicao = null;

// --- Seletores do DOM ---
const modalContrato = document.getElementById("modal-contrato");
const modalTitulo = document.getElementById("modal-contrato-titulo");
const formContrato = document.getElementById("form-contrato");
const btnNovoContrato = document.getElementById("btn-novo-contrato");
const btnCancelarContrato = document.getElementById("btn-cancelar-contrato");
const listaContratos = document.getElementById("lista-contratos");
const badgeContratos = document.getElementById("badge-contratos");
const btnLogout = document.getElementById("btn-logout");

// --- Controle de Modais ---
const abrirModalContrato = (id = null, dados = null) => {
  if (!modalContrato) return;
  idContratoEdicao = id;

  if (dados) {
    modalTitulo.textContent = "Editar Contrato";
    document.getElementById("c-titulo").value = dados.titulo || "";
    document.getElementById("c-orgao").value = dados.orgao || "";
    document.getElementById("c-numero").value = dados.numero || "";
    document.getElementById("c-esfera").value = dados.esfera || "Municipal";
    document.getElementById("c-fornecedor").value = dados.fornecedor || "";
    document.getElementById("c-obs").value = dados.observacoes || "";

    if (dados.data_vencimento && typeof dados.data_vencimento.toDate === "function") {
      document.getElementById("c-vencimento").value = dados.data_vencimento.toDate().toISOString().split("T")[0];
    } else {
      document.getElementById("c-vencimento").value = "";
    }
  } else {
    modalTitulo.textContent = "Novo Contrato";
    formContrato.reset();
    document.getElementById("c-esfera").value = "Municipal";
  }

  modalContrato.classList.add("open");
};

const fecharModalContrato = () => {
  if (!modalContrato) return;
  modalContrato.classList.remove("open");
  formContrato.reset();
  idContratoEdicao = null;
};

// --- Ações de Escuta nos Botões do DOM ---
if (btnNovoContrato) {
  btnNovoContrato.addEventListener("click", () => abrirModalContrato());
}

if (btnCancelarContrato) {
  btnCancelarContrato.addEventListener("click", fecharModalContrato);
}

if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    if (typeof window.fazerLogout === "function") {
      window.fazerLogout();
    }
  });
}

// --- Salvar / Atualizar Contrato no Firestore ---
if (formContrato) {
  formContrato.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titulo = document.getElementById("c-titulo").value.trim();
    const vencimentoStr = document.getElementById("c-vencimento").value;

    if (!titulo || !vencimentoStr) {
      alert("Informe o título e a data de vencimento.");
      return;
    }

    const payload = {
      titulo,
      orgao: document.getElementById("c-orgao").value.trim(),
      numero: document.getElementById("c-numero").value.trim(),
      esfera: document.getElementById("c-esfera").value,
      fornecedor: document.getElementById("c-fornecedor").value.trim(),
      data_vencimento: Timestamp.fromDate(new Date(vencimentoStr + "T00:00:00")),
      observacoes: document.getElementById("c-obs").value.trim()
    };

    try {
      if (idContratoEdicao) {
        await updateDoc(doc(db, "contratos", idContratoEdicao), payload);
      } else {
        payload.criadoEm = serverTimestamp();
        await addDoc(collection(db, "contratos"), payload);
      }
      fecharModalContrato();
    } catch (err) {
      console.error("Erro ao salvar contrato no Firestore:", err);
      alert("Erro ao persistir os dados: " + err.message);
    }
  });
}

// --- Funções Globais para Edição e Exclusão Inline ---
window.iniciarEdicaoContrato = (id, dadosString) => {
  const dados = JSON.parse(decodeURIComponent(dadosString));
  if (dados.data_vencimento_ms) {
    dados.data_vencimento = { toDate: () => new Date(dados.data_vencimento_ms) };
  }
  abrirModalContrato(id, dados);
};

window.excluirContrato = async (id) => {
  if (confirm("Deseja realmente excluir este contrato?")) {
    try {
      await deleteDoc(doc(db, "contratos", id));
    } catch (err) {
      console.error("Erro ao excluir documento:", err);
      alert("Erro ao remover: " + err.message);
    }
  }
};

// --- Leitura em Tempo Real (Snapshot) ---
if (listaContratos) {
  onSnapshot(collection(db, "contratos"), (snapshot) => {
    if (badgeContratos) badgeContratos.textContent = snapshot.size;

    listaContratos.innerHTML = "";

    if (snapshot.empty) {
      listaContratos.innerHTML = '<p class="placeholder-text">Nenhum contrato cadastrado.</p>';
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      let dataTexto = "Sem data";
      let dataMs = null;
      if (data.data_vencimento && typeof data.data_vencimento.toDate === "function") {
        const dateObj = data.data_vencimento.toDate();
        dataTexto = dateObj.toLocaleDateString("pt-BR");
        dataMs = dateObj.getTime();
      }

      // Prepara objeto seguro para transitar no inline onclick
      const dadosSerializados = encodeURIComponent(JSON.stringify({
        titulo: data.titulo || "",
        orgao: data.orgao || "",
        numero: data.numero || "",
        esfera: data.esfera || "Municipal",
        fornecedor: data.fornecedor || "",
        observacoes: data.observacoes || "",
        data_vencimento_ms: dataMs
      }));

      const card = document.createElement("div");
      card.className = "card-item";
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div>
            <h4 style="margin: 0;">${data.titulo || "Contrato sem título"}</h4>
            <small style="color: #666;">${data.orgao || ""} ${data.numero ? "· nº " + data.numero : ""}</small><br>
            <small style="color: #444;">Vencimento: <strong>${dataTexto}</strong></small>
          </div>
          <div style="display: flex; gap: 4px;">
            <button type="button" class="btn-icon" onclick="iniciarEdicaoContrato('${docSnap.id}', '${dadosSerializados}')">✏️</button>
            <button type="button" class="btn-icon" onclick="excluirContrato('${docSnap.id}')">🗑️</button>
          </div>
        </div>
      `;
      listaContratos.appendChild(card);
    });
  }, (err) => {
    console.error("Falha ao sincronizar coleção contratos:", err);
  });
}

// --- Registro do Service Worker ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Falha no registro do service worker:", err);
    });
  });
}