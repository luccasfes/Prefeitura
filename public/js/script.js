import { db, auth } from "./firebase-config.js";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

window.db = db;

// Memória temporária para carregar os dados rapidamente ao clicar em "Editar"
window.contratosCache = {};
window.projetosCache = {};

// Variáveis de controlo de edição
let idContratoEdicao = null;
let idProjetoEdicao = null;

/* ---------- AUTENTICAÇÃO ---------- */
onAuthStateChanged(auth, (user) => {
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.endsWith("login.html") || currentPath.endsWith("login");

  if (!user && !isLoginPage) {
    window.location.href = "login.html";
  } else if (user && isLoginPage) {
    window.location.href = "index.html";
  }
});

window.fazerLogin = async function() {
  const email = document.getElementById("email")?.value;
  const senha = document.getElementById("senha")?.value;
  
  if (!email || !senha) {
    alert("Por favor, preencha o e-mail e a senha.");
    return;
  }
  
  try {
    await signInWithEmailAndPassword(auth, email, senha);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Erro no login:", error);
    alert("Falha ao entrar. Verifique as suas credenciais.");
  }
};

window.fazerLogout = async function() {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Erro ao sair:", error);
  }
};

/* ---------- FUNÇÕES AUXILIARES ---------- */
function diasRestantes(timestamp) {
  if (!timestamp) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const data = timestamp.toDate();
  data.setHours(0, 0, 0, 0);
  return Math.round((data - hoje) / (1000 * 60 * 60 * 24));
}

function formatarData(timestamp) {
  if (!timestamp) return "-";
  return timestamp.toDate().toLocaleDateString("pt-BR");
}

function formatToDateInput(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function badgePorDias(dias) {
  if (dias === null) return { classe: "success", texto: "Sem prazo" };
  if (dias < 0) return { classe: "danger", texto: `Atrasado há ${Math.abs(dias)} dia(s)` };
  if (dias <= 7) return { classe: "warning", texto: dias === 0 ? "Vence hoje" : `Vence em ${dias} dia(s)` };
  return { classe: "success", texto: `Vence em ${dias} dia(s)` };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function limparCamposModal(modalId) {
  document.querySelectorAll(`#${modalId} input, #${modalId} textarea, #${modalId} select`)
    .forEach((el) => {
      if (el.tagName === "SELECT") {
        el.selectedIndex = 0;
      } else {
        el.value = "";
      }
    });
}

/* ---------- CONTRATOS ---------- */
const contratosRef = query(collection(db, "contratos"), orderBy("data_vencimento", "asc"));

onSnapshot(contratosRef, (snap) => {
  const list = document.getElementById("contratos-list");
  if (!list) return; // Trava de segurança para páginas que não têm esta lista

  const countEl = document.getElementById("contratos-count");
  if (countEl) countEl.textContent = snap.size;
  
  window.contratosCache = {};

  if (snap.empty) {
    list.innerHTML = '<div class="list-empty">Nenhum contrato cadastrado.</div>';
    return;
  }

  list.innerHTML = "";
  snap.forEach((docSnap) => {
    const c = docSnap.data();
    window.contratosCache[docSnap.id] = c;
    const dias = diasRestantes(c.data_vencimento);
    const badge = badgePorDias(dias);

    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="action-buttons">
        <button class="del-btn" onclick="editarContrato('${docSnap.id}')">✏️</button>
        <button class="del-btn" style="color: var(--danger);" onclick="excluirContrato('${docSnap.id}')">✕</button>
      </div>
      <div class="item-title">${escapeHtml(c.titulo)}</div>
      <div class="item-sub">${escapeHtml(c.orgao || "")} ${c.numero ? "· nº " + escapeHtml(c.numero) : ""}</div>
      <div class="item-sub">Vencimento: ${formatarData(c.data_vencimento)}</div>
      <span class="badge ${badge.classe}">${badge.texto}</span>
    `;
    list.appendChild(el);
  });
});

window.editarContrato = (id) => {
  idContratoEdicao = id;
  const c = window.contratosCache[id];

  document.getElementById("c-titulo").value = c.titulo || "";
  document.getElementById("c-orgao").value = c.orgao || "";
  document.getElementById("c-numero").value = c.numero || "";
  document.getElementById("c-esfera").value = c.esfera || "Municipal";
  document.getElementById("c-fornecedor").value = c.fornecedor || "";
  document.getElementById("c-obs").value = c.observacoes || "";
  document.getElementById("c-vencimento").value = formatToDateInput(c.data_vencimento);

  document.getElementById("modal-contrato").classList.add("open");
  document.getElementById("modal-contrato").style.display = "flex";
};

window.salvarContrato = async function () {
  const titulo = document.getElementById("c-titulo").value.trim();
  const vencimentoStr = document.getElementById("c-vencimento").value;

  if (!titulo || !vencimentoStr) {
    alert("Preencha ao menos o título e a data de vencimento.");
    return;
  }

  const dadosParaSalvar = {
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
      await updateDoc(doc(db, "contratos", idContratoEdicao), dadosParaSalvar);
    } else {
      dadosParaSalvar.criadoEm = serverTimestamp();
      await addDoc(collection(db, "contratos"), dadosParaSalvar);
    }

    window.fecharModal("modal-contrato");
  } catch (erro) {
    console.error("Erro ao salvar contrato:", erro);
    alert("Erro: " + erro.message);
  }
};

window.excluirContrato = async function (id) {
  if (confirm("Excluir este contrato?")) {
    await deleteDoc(doc(db, "contratos", id));
  }
};

/* ---------- PROJETOS ---------- */
const projetosRef = query(collection(db, "projetos"), orderBy("data_prazo", "asc"));

onSnapshot(projetosRef, (snap) => {
  const list = document.getElementById("projetos-list");
  if (!list) return; // Trava de segurança

  const countEl = document.getElementById("projetos-count");
  if (countEl) countEl.textContent = snap.size;
  
  window.projetosCache = {};

  if (snap.empty) {
    list.innerHTML = '<div class="list-empty">Nenhum projeto cadastrado.</div>';
    return;
  }

  list.innerHTML = "";
  snap.forEach((docSnap) => {
    const p = docSnap.data();
    window.projetosCache[docSnap.id] = p;
    const dias = diasRestantes(p.data_prazo);
    const badge = badgePorDias(dias);

    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="action-buttons">
        <button class="del-btn" onclick="editarProjeto('${docSnap.id}')">✏️</button>
        <button class="del-btn" style="color: var(--danger);" onclick="excluirProjeto('${docSnap.id}')">✕</button>
      </div>
      <div class="item-title">${escapeHtml(p.titulo)}</div>
      <div class="item-sub">Próxima ação: ${escapeHtml(p.proxima_acao || "-")}</div>
      <div class="item-sub">Responsável: ${escapeHtml(p.responsavel || "-")} · Prioridade: ${escapeHtml(p.prioridade || "-")}</div>
      <span class="badge ${badge.classe}">${badge.texto}</span>
    `;
    list.appendChild(el);
  });
});

window.editarProjeto = (id) => {
  idProjetoEdicao = id;
  const p = window.projetosCache[id];

  document.getElementById("p-titulo").value = p.titulo || "";
  document.getElementById("p-descricao").value = p.descricao || "";
  document.getElementById("p-responsavel").value = p.responsavel || "";
  document.getElementById("p-proxima-acao").value = p.proxima_acao || "";
  document.getElementById("p-prioridade").value = p.prioridade || "Média";
  document.getElementById("p-prazo").value = formatToDateInput(p.data_prazo);

  document.getElementById("modal-projeto").classList.add("open");
  document.getElementById("modal-projeto").style.display = "flex";
};

window.salvarProjeto = async function () {
  const titulo = document.getElementById("p-titulo").value.trim();
  const prazoStr = document.getElementById("p-prazo").value;

  if (!titulo || !prazoStr) {
    alert("Preencha ao menos o título e o prazo da próxima ação.");
    return;
  }

  const dadosParaSalvar = {
    titulo,
    descricao: document.getElementById("p-descricao").value.trim(),
    responsavel: document.getElementById("p-responsavel").value.trim(),
    proxima_acao: document.getElementById("p-proxima-acao").value.trim(),
    data_prazo: Timestamp.fromDate(new Date(prazoStr + "T00:00:00")),
    prioridade: document.getElementById("p-prioridade").value
  };

  try {
    if (idProjetoEdicao) {
      await updateDoc(doc(db, "projetos", idProjetoEdicao), dadosParaSalvar);
    } else {
      dadosParaSalvar.criadoEm = serverTimestamp();
      await addDoc(collection(db, "projetos"), dadosParaSalvar);
    }

    window.fecharModal("modal-projeto");
  } catch (erro) {
    console.error("Erro ao salvar projeto:", erro);
    alert("Erro: " + erro.message);
  }
};

window.excluirProjeto = async function (id) {
  if (confirm("Excluir este projeto?")) {
    await deleteDoc(doc(db, "projetos", id));
  }
};

/* ---------- TAREFAS DIÁRIAS ---------- */
const tarefasRef = query(collection(db, "tarefas_diarias"), orderBy("criadoEm", "desc"));

onSnapshot(tarefasRef, (snap) => {
  const list = document.getElementById("tarefas-list");
  if (!list) return; // Trava de segurança

  const countEl = document.getElementById("tarefas-count");
  if (countEl) countEl.textContent = snap.size;

  if (snap.empty) {
    list.innerHTML = '<div class="list-empty">Nenhuma tarefa cadastrada.</div>';
    return;
  }

  list.innerHTML = "";
  snap.forEach((docSnap) => {
    const t = docSnap.data();
    const el = document.createElement("div");
    el.className = "tarefa-row" + (t.concluida ? " done" : "");
    el.innerHTML = `
      <input type="checkbox" ${t.concluida ? "checked" : ""} onchange="toggleTarefa('${docSnap.id}', this.checked)">
      <span class="tarefa-text">${escapeHtml(t.texto)}</span>
      <button class="del-btn" style="position: static; margin-left: auto;" onclick="excluirTarefa('${docSnap.id}')">✕</button>
    `;
    list.appendChild(el);
  });
});

window.adicionarTarefa = async function () {
  const input = document.getElementById("nova-tarefa-input");
  const texto = input.value.trim();
  if (!texto) return;

  await addDoc(collection(db, "tarefas_diarias"), {
    texto,
    concluida: false,
    criadoEm: serverTimestamp()
  });
  input.value = "";
};

window.toggleTarefa = async function (id, concluida) {
  await updateDoc(doc(db, "tarefas_diarias", id), { concluida });
};

window.excluirTarefa = async function (id) {
  await deleteDoc(doc(db, "tarefas_diarias", id));
};

/* ---------- CONTROLO DOS MODAIS ---------- */
window.abrirModalContrato = () => {
  idContratoEdicao = null; 
  limparCamposModal("modal-contrato");
  document.getElementById("c-esfera").value = "Municipal";
  const el = document.getElementById("modal-contrato");
  el.style.display = "flex";
  setTimeout(() => el.classList.add("open"), 10);
};

window.abrirModalProjeto = () => {
  idProjetoEdicao = null; 
  limparCamposModal("modal-projeto");
  document.getElementById("p-prioridade").value = "Média";
  const el = document.getElementById("modal-projeto");
  el.style.display = "flex";
  setTimeout(() => el.classList.add("open"), 10);
};

window.fecharModal = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("open");
  setTimeout(() => el.style.display = "none", 200); 
};

/* ---------- PWA SERVICE WORKER ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Falha ao registrar o service worker:", err);
    });
  });
}

import { getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Função auxiliar para formatar datas dos Timestamps do Firestore
function formatarDataSimples(timestamp) {
  if (!timestamp) return "-";
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toLocaleDateString("pt-BR");
  }
  return timestamp;
}

// --- EXPORTAR PARA EXCEL (.XLSX) ---
window.exportarExcel = async function() {
  try {
    const contratosSnap = await getDocs(collection(db, "contratos"));
    const projetosSnap = await getDocs(collection(db, "projetos"));
    const tarefasSnap = await getDocs(collection(db, "tarefas_diarias"));

    // 1. Mapear Contratos
    const contratosData = contratosSnap.docs.map(d => {
      const c = d.data();
      return {
        "Título / Objeto": c.titulo || "",
        "Órgão / Secretaria": c.orgao || "",
        "Nº do Contrato": c.numero || "",
        "Esfera": c.esfera || "",
        "Fornecedor": c.fornecedor || "",
        "Vencimento": formatarDataSimples(c.data_vencimento),
        "Observações": c.observacoes || ""
      };
    });

    // 2. Mapear Projetos
    const projetosData = projetosSnap.docs.map(d => {
      const p = d.data();
      return {
        "Título": p.titulo || "",
        "Descrição": p.descricao || "",
        "Responsável": p.responsavel || "",
        "Próxima Ação": p.proxima_acao || "",
        "Prioridade": p.prioridade || "",
        "Prazo": formatarDataSimples(p.data_prazo)
      };
    });

    // 3. Mapear Tarefas
    const tarefasData = tarefasSnap.docs.map(d => {
      const t = d.data();
      return {
        "Tarefa": t.texto || "",
        "Estado": t.concluida ? "Concluída" : "Pendente"
      };
    });

    // Criar o Livro de Excel (Workbook)
    const wb = XLSX.utils.book_new();

    if (contratosData.length > 0) {
      const wsContratos = XLSX.utils.json_to_sheet(contratosData);
      XLSX.utils.book_append_sheet(wb, wsContratos, "Contratos");
    }
    if (projetosData.length > 0) {
      const wsProjetos = XLSX.utils.json_to_sheet(projetosData);
      XLSX.utils.book_append_sheet(wb, wsProjetos, "Projetos");
    }
    if (tarefasData.length > 0) {
      const wsTarefas = XLSX.utils.json_to_sheet(tarefasData);
      XLSX.utils.book_append_sheet(wb, wsTarefas, "Tarefas");
    }

    // Gerar o ficheiro descarregável
    XLSX.writeFile(wb, `govdocs_relatorio_${new Date().toISOString().slice(0,10)}.xlsx`);
  } catch (erro) {
    console.error("Erro ao exportar Excel:", erro);
    alert("Não foi possível gerar o ficheiro Excel.");
  }
};

// --- EXPORTAR PARA PDF ---
window.exportarPDF = async function() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Título do Relatório
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Relatório de Gestão - GovDocs", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);

    let posY = 36;

    // Buscar Contratos para a tabela PDF
    const contratosSnap = await getDocs(collection(db, "contratos"));
    if (!contratosSnap.empty) {
      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235);
      doc.text("Contratos e Prazos", 14, posY);
      posY += 6;

      const contratosRows = contratosSnap.docs.map(d => {
        const c = d.data();
        return [
          c.titulo || "",
          c.orgao || "",
          c.numero || "",
          formatarDataSimples(c.data_vencimento)
        ];
      });

      doc.autoTable({
        startY: posY,
        head: [['Título / Objeto', 'Órgão', 'Nº Contrato', 'Vencimento']],
        body: contratosRows,
        theme: 'grid',
        headStyles: { fillColor: [15, 35, 63] }
      });

      posY = doc.lastAutoTable.finalY + 14;
    }

    // Buscar Projetos para a tabela PDF
    const projetosSnap = await getDocs(collection(db, "projetos"));
    if (!projetosSnap.empty) {
      // Verificar se cabe na página, senão cria nova página
      if (posY > 220) {
        doc.addPage();
        posY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235);
      doc.text("Projetos e Próximas Ações", 14, posY);
      posY += 6;

      const projetosRows = projetosSnap.docs.map(d => {
        const p = d.data();
        return [
          p.titulo || "",
          p.responsavel || "",
          p.proxima_acao || "",
          formatarDataSimples(p.data_prazo)
        ];
      });

      doc.autoTable({
        startY: posY,
        head: [['Título', 'Responsável', 'Próxima Ação', 'Prazo']],
        body: projetosRows,
        theme: 'grid',
        headStyles: { fillColor: [15, 35, 63] }
      });
    }

    // Guardar/Descarregar PDF
    doc.save(`govdocs_relatorio_${new Date().toISOString().slice(0,10)}.pdf`);
  } catch (erro) {
    console.error("Erro ao exportar PDF:", erro);
    alert("Não foi possível gerar o ficheiro PDF.");
  }
};