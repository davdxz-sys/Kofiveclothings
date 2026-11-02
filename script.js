import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://odynfbysfhvozuxjuarp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nrjQN5jgqvsJDE2LaxEoQQ_lCW1ZhEO";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let products = [];
const productsGrid = document.getElementById("productsGrid");
const productPage = document.getElementById("productPage");

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL"
  });
}

function mapProduct(row) {
  return {
    id: Number(row.id),
    name: row.name || "",
    category: row.category || "Classic",
    priceValue: Number(row.price || 0),
    price: formatPrice(row.price),
    description: row.description || "",
    front: row.front_image || "",
    back: row.back_image || ""
  };
}

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar produtos:", error);
    if (productsGrid) productsGrid.innerHTML =
      '<p class="store-message">Não foi possível carregar os produtos. Atualize a página.</p>';
    return [];
  }
  products = (data || []).map(mapProduct);
  return products;
}

function imageOrFallback(url, label) {
  return url
    ? `<img src="${escapeHTML(url)}" alt="${escapeHTML(label)}" onerror="this.style.display='none'">`
    : `<div class="product-image-placeholder">${escapeHTML(label)}</div>`;
}

function renderProducts(filter = "Todos") {
  if (!productsGrid) return;
  const filtered = filter === "Todos"
    ? products
    : products.filter(product => product.category === filter);

  if (!filtered.length) {
    productsGrid.innerHTML = '<p class="store-message">Nenhum produto nesta categoria no momento.</p>';
    return;
  }

  productsGrid.innerHTML = filtered.map(product => `
    <article class="product-card" data-product-id="${product.id}" tabindex="0" role="link" aria-label="Ver ${escapeHTML(product.name)}">
      <div class="product-images">
        ${imageOrFallback(product.front, `${product.name} frente`).replace("<img", '<img class="product-front"')}
        ${product.back ? `<img src="${escapeHTML(product.back)}" class="product-back" alt="${escapeHTML(product.name)} costas" onerror="this.style.display='none'">` : ""}
        <div class="image-indicator"><span></span><span></span></div>
      </div>
      <div class="product-info">
        <h3 class="product-name">${escapeHTML(product.name)}</h3>
        <div class="product-bottom">
          <span class="product-category">${escapeHTML(product.category)}</span>
          <span class="product-price">${product.price}</span>
        </div>
        <button class="product-action" type="button">VER PRODUTO →</button>
      </div>
    </article>
  `).join("");

  productsGrid.querySelectorAll(".product-card").forEach(card => {
    const open = () => openProduct(Number(card.dataset.productId));
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function openProduct(id) {
  window.location.href = `produto.html?id=${encodeURIComponent(id)}`;
}

function renderProductPage(product) {
  if (!productPage) return;
  const front = product.front;
  const back = product.back;
  const fallback = '<div class="product-image-placeholder">KOFIVE</div>';
  productPage.innerHTML = `
    <div class="product-detail">
      <div class="detail-gallery">
        <div class="detail-thumbnails">
          ${front ? `<button class="detail-thumb" type="button" data-image="${escapeHTML(front)}"><img src="${escapeHTML(front)}" alt="Frente"></button>` : ""}
          ${back ? `<button class="detail-thumb" type="button" data-image="${escapeHTML(back)}"><img src="${escapeHTML(back)}" alt="Costas"></button>` : ""}
        </div>
        <div class="detail-main-image">
          ${front ? `<img id="mainProductImage" src="${escapeHTML(front)}" alt="${escapeHTML(product.name)}">` : fallback}
        </div>
      </div>
      <div class="detail-info">
        <span class="detail-category">${escapeHTML(product.category)}</span>
        <h1>${escapeHTML(product.name)}</h1>
        <div class="detail-price">${product.price}</div>
        <p class="detail-description">${escapeHTML(product.description)}</p>
        <div class="size-title">ESCOLHA O TAMANHO</div>
        <div class="sizes">
          <button class="size" type="button">P</button>
          <button class="size active" type="button">M</button>
          <button class="size" type="button">G</button>
          <button class="size" type="button">GG</button>
        </div>
        <div class="address-box">
          <h3>ENDEREÇO DE ENTREGA</h3>
          <div class="address-grid">
            <input type="text" placeholder="Nome completo" required>
            <input type="text" placeholder="CEP" required>
            <input class="full" type="text" placeholder="Rua / Avenida" required>
            <input type="text" placeholder="Número" required>
            <input type="text" placeholder="Complemento">
            <input class="full" type="text" placeholder="Cidade" required>
            <input class="full" type="text" placeholder="Estado" required>
          </div>
          <button class="button button-primary buy-button" id="buyButton" type="button">CONTINUAR COMPRA →</button>
        </div>
      </div>
    </div>`;

  productPage.querySelectorAll(".detail-thumb").forEach(button => {
    button.addEventListener("click", () => changeMainImage(button.dataset.image));
  });
  productPage.querySelectorAll(".size").forEach(button => {
    button.addEventListener("click", () => {
      productPage.querySelectorAll(".size").forEach(size => size.classList.remove("active"));
      button.classList.add("active");
    });
  });
  document.getElementById("buyButton")?.addEventListener("click", fakeCheckout);
}

function changeMainImage(url) {
  const image = document.getElementById("mainProductImage");
  if (!image) return;
  image.style.opacity = "0";
  setTimeout(() => {
    image.src = url;
    image.style.opacity = "1";
  }, 180);
}

function fakeCheckout() {
  showToast("Pedido preparado! O pagamento será configurado posteriormente.");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    renderProducts(button.dataset.filter);
  });
});

const menuButton = document.getElementById("menuButton");
const navLinks = document.getElementById("navLinks");
menuButton?.addEventListener("click", () => navLinks?.classList.toggle("open"));

const ideaForm = document.getElementById("ideaForm");
ideaForm?.addEventListener("submit", event => {
  event.preventDefault();
  const name = document.getElementById("ideaName")?.value || "";
  showToast(`Obrigado, ${name}! Sua ideia foi registrada.`);
  ideaForm.reset();
});

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

if (productsGrid || productPage) {
  loadProducts().then(items => {
    if (productsGrid) renderProducts();
    if (productPage) {
      const id = Number(new URLSearchParams(location.search).get("id"));
      const product = items.find(item => item.id === id);
      if (product) renderProductPage(product);
      else productPage.innerHTML = `
        <div class="glass product-not-found">
          <h1>Produto não encontrado.</h1><br>
          <a href="index.html" class="button button-primary">VOLTAR À LOJA</a>
        </div>`;
    }
  });
}


// HERO CAROUSEL — banners managed from the admin panel
let heroBanners = [];
let heroIndex = 0;
let heroTimer = null;
async function loadHeroBanners() {
  const image = document.getElementById("heroImage");
  if (!image) return;
  const { data, error } = await supabase.from("banners").select("*").eq("active", true).order("position", { ascending: true });
  if (error) { console.warn("Banners não carregados; usando banner padrão.", error.message); return; }
  heroBanners = data || [];
  if (!heroBanners.length) return; // mantém o banner padrão já presente no HTML
  renderHeroBanner(0, false);
  if (heroBanners.length > 1) {
    heroTimer = setInterval(() => renderHeroBanner((heroIndex + 1) % heroBanners.length, true), 5000);
  }
  document.getElementById("heroPrev")?.addEventListener("click", () => moveHero(-1));
  document.getElementById("heroNext")?.addEventListener("click", () => moveHero(1));
}
function renderHeroBanner(index, fade = true) {
  if (!heroBanners.length) return;
  heroIndex = index;
  const banner = heroBanners[index];
  const image = document.getElementById("heroImage");
  const content = document.getElementById("heroContent");
  const apply = () => {
    image.src = banner.image_url;
    image.alt = banner.title || "KOFIVE";
    document.getElementById("heroLabel").textContent = banner.label || "KOFIVE / DROP";
    document.getElementById("heroTitle").textContent = banner.title || "";
    if (banner.highlight) {
      const title = document.getElementById("heroTitle");
      title.innerHTML = `${escapeHTML(banner.title || "")} <span>${escapeHTML(banner.highlight)}</span>`;
    }
    document.getElementById("heroSubtitle").textContent = banner.subtitle || "";
    const button = document.getElementById("heroButton");
    button.textContent = banner.button_text || "EXPLORAR COLEÇÃO";
    const arrow = document.createElement("span"); arrow.textContent = "→"; button.append(" ", arrow);
    button.href = banner.button_url || "#colecao";
    const nav = document.getElementById("heroNavigation");
    nav.innerHTML = heroBanners.map((_, i) => `<button type="button" class="hero-dot ${i === index ? "active" : ""}" aria-label="Ir para banner ${i+1}" data-hero-index="${i}"></button>`).join("");
    nav.querySelectorAll("[data-hero-index]").forEach(dot => dot.addEventListener("click", () => { stopHeroTimer(); renderHeroBanner(Number(dot.dataset.heroIndex), true); startHeroTimer(); }));
  };
  if (!fade) { apply(); return; }
  image.classList.add("is-fading"); content.classList.add("is-fading");
  setTimeout(() => { apply(); image.classList.remove("is-fading"); content.classList.remove("is-fading"); }, 350);
}
function moveHero(direction) {
  if (!heroBanners.length) return;
  stopHeroTimer();
  renderHeroBanner((heroIndex + direction + heroBanners.length) % heroBanners.length, true);
  startHeroTimer();
}
function stopHeroTimer() { if (heroTimer) clearInterval(heroTimer); }
function startHeroTimer() {
  stopHeroTimer();
  if (heroBanners.length > 1) heroTimer = setInterval(() => renderHeroBanner((heroIndex + 1) % heroBanners.length, true), 5000);
}
loadHeroBanners();
