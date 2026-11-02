import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://odynfbysfhvozuxjuarp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nrjQN5jgqvsJDE2LaxEoQQ_lCW1ZhEO";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = id => document.getElementById(id);
const loginPanel = $("loginPanel");
const adminPanel = $("adminPanel");
const statusBox = $("adminStatus");
const loginStatusBox = $("loginStatus");
const form = $("productForm");
const saveButton = $("saveProduct");
let editingId = null;

function status(message, error = false) {
  const target = loginPanel.hidden ? statusBox : loginStatusBox;
  target.textContent = message;
  target.className = error ? "admin-status error" : "admin-status";
}

function priceNumber(value) {
  return Number(String(value).trim().replace(/\./g, "").replace(",", "."));
}

function validImageUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "i.imgur.com" || url.hostname === "imgur.com");
  } catch {
    return false;
  }
}

function clearForm() {
  form.reset();
  $("productId").value = "";
  editingId = null;
  saveButton.textContent = "PUBLICAR PRODUTO";
  $("cancelEdit").hidden = true;
}

async function refreshProducts() {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) {
    status("Não foi possível carregar os produtos: " + error.message, true);
    return;
  }
  $("adminProducts").innerHTML = (data || []).map(product => `
    <article class="admin-product">
      <div class="admin-product-thumb">
        ${product.front_image ? `<img src="${escapeAttr(product.front_image)}" alt="">` : "<span>K5</span>"}
      </div>
      <div class="admin-product-info">
        <strong>${escapeHTML(product.name)}</strong>
        <small>${escapeHTML(product.category)} · ${Number(product.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</small>
      </div>
      <div class="admin-product-actions">
        <button type="button" class="admin-secondary" data-edit="${product.id}">EDITAR</button>
        <button type="button" class="admin-danger" data-delete="${product.id}">EXCLUIR</button>
      </div>
    </article>`).join("") || '<p class="admin-muted">Nenhum produto cadastrado ainda.</p>';

  $("adminProducts").querySelectorAll("[data-edit]").forEach(button => {
    button.addEventListener("click", () => {
      const product = data.find(item => String(item.id) === button.dataset.edit);
      if (!product) return;
      editingId = product.id;
      $("productId").value = product.id;
      $("productName").value = product.name;
      $("productCategory").value = product.category;
      $("productPrice").value = String(product.price).replace(".", ",");
      $("productDescription").value = product.description || "";
      $("frontImage").value = product.front_image || "";
      $("backImage").value = product.back_image || "";
      saveButton.textContent = "SALVAR ALTERAÇÕES";
      $("cancelEdit").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  $("adminProducts").querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!confirm("Tem certeza que deseja excluir este produto?")) return;
      const { error } = await supabase.from("products").delete().eq("id", button.dataset.delete);
      if (error) status("Não foi possível excluir: " + error.message, true);
      else {
        status("Produto excluído.");
        if (String(editingId) === button.dataset.delete) clearForm();
        await refreshProducts();
      }
    });
  });
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function escapeAttr(value = "") { return escapeHTML(value); }

async function showAdmin(user) {
  loginPanel.hidden = true;
  adminPanel.hidden = false;
  loginStatusBox.textContent = "";
  $("adminEmail").textContent = user.email || "Administrador";
  await refreshProducts();
}

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  status("Verificando acesso...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: $("loginEmail").value.trim(),
    password: $("loginPassword").value
  });
  if (error) {
    status("Não foi possível entrar. Confira e-mail e senha.", true);
    return;
  }
  await showAdmin(data.user);
});

$("logoutButton").addEventListener("click", async () => {
  await supabase.auth.signOut();
  adminPanel.hidden = true;
  loginPanel.hidden = false;
  clearForm();
  status("Você saiu do painel.");
});

$("cancelEdit").addEventListener("click", clearForm);

form.addEventListener("submit", async event => {
  event.preventDefault();
  const name = $("productName").value.trim();
  const category = $("productCategory").value;
  const price = priceNumber($("productPrice").value);
  const front = $("frontImage").value.trim();
  const back = $("backImage").value.trim();

  if (!name || !Number.isFinite(price) || price <= 0) {
    status("Informe nome e preço válido.", true);
    return;
  }
  if (!validImageUrl(front) || !validImageUrl(back)) {
    status("Use links HTTPS diretos do Imgur (ex.: https://i.imgur.com/arquivo.png).", true);
    return;
  }

  const payload = {
    name, category, price,
    description: $("productDescription").value.trim(),
    front_image: front || null,
    back_image: back || null
  };

  saveButton.disabled = true;
  status("Salvando produto...");
  const result = editingId
    ? await supabase.from("products").update(payload).eq("id", editingId)
    : await supabase.from("products").insert(payload);

  saveButton.disabled = false;
  if (result.error) {
    status("Falha ao salvar. Verifique seu acesso e as políticas do banco: " + result.error.message, true);
    return;
  }
  status(editingId ? "Produto atualizado com sucesso!" : "Produto publicado com sucesso!");
  clearForm();
  await refreshProducts();
});

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) await showAdmin(session.user);
})();
