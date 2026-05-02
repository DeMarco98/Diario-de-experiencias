import { auth, db, storage } from "./firebase-config.js";
import {
  deleteUser,
  onAuthStateChanged,
  reload,
  signOut,
  updatePassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getDownloadURL,
  ref,
  uploadString,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const form = document.querySelector("#ratingForm");
const workspace = document.querySelector(".workspace");
const collapseFormButton = document.querySelector("#collapseFormButton");
const lockedPanel = document.querySelector("#lockedPanel");
const loginLink = document.querySelector("#loginLink");
const logoutButton = document.querySelector("#logoutButton");
const userChip = document.querySelector("#userChip");
const settingsButton = document.querySelector("#settingsButton");
const settingsModal = document.querySelector("#settingsModal");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const profileFirstNameInput = document.querySelector("#profileFirstNameInput");
const profileLastNameInput = document.querySelector("#profileLastNameInput");
const profileBirthDateInput = document.querySelector("#profileBirthDateInput");
const profilePasswordInput = document.querySelector("#profilePasswordInput");
const profileConfirmPasswordInput = document.querySelector("#profileConfirmPasswordInput");
const colorGastronomica = document.querySelector("#colorGastronomica");
const colorCinefila = document.querySelector("#colorCinefila");
const colorPasseio = document.querySelector("#colorPasseio");
const colorCultural = document.querySelector("#colorCultural");
const saveSettingsButton = document.querySelector("#saveSettingsButton");
const resetColorsButton = document.querySelector("#resetColorsButton");
const settingsMessage = document.querySelector("#settingsMessage");
const deleteAccountButton = document.querySelector("#deleteAccountButton");
const heroPanel = document.querySelector("#heroPanel");
const heroTitleInput = document.querySelector("#heroTitleInput");
const heroPhotoInput = document.querySelector("#heroPhotoInput");
const saveHeroButton = document.querySelector("#saveHeroButton");
const removeHeroPhotoButton = document.querySelector("#removeHeroPhotoButton");
const nameInput = document.querySelector("#experienceName");
const categoryInput = document.querySelector("#experienceCategory");
const customCategoryBox = document.querySelector("#customCategoryBox");
const customCategoryInput = document.querySelector("#customCategoryInput");
const addCategoryButton = document.querySelector("#addCategoryButton");
const deleteCategoryButton = document.querySelector("#deleteCategoryButton");
const dateInput = document.querySelector("#experienceDate");
const notesInput = document.querySelector("#experienceNotes");
const photosInput = document.querySelector("#experiencePhotos");
const photoPreview = document.querySelector("#photoPreview");
const submitButton = document.querySelector("#submitButton");
const submitLabel = document.querySelector("#submitLabel");
const cancelEditButton = document.querySelector("#cancelEditButton");
const starButtons = Array.from(document.querySelectorAll(".star"));
const experienceList = document.querySelector("#experienceList");
const emptyState = document.querySelector("#emptyState");
const totalCount = document.querySelector("#totalCount");
const averageRating = document.querySelector("#averageRating");
const clearButton = document.querySelector("#clearButton");
const deleteControls = document.querySelector("#deleteControls");
const deleteHint = document.querySelector("#deleteHint");
const confirmDeleteButton = document.querySelector("#confirmDeleteButton");
const cancelDeleteButton = document.querySelector("#cancelDeleteButton");
const searchFilter = document.querySelector("#searchFilter");
const typeFilter = document.querySelector("#typeFilter");
const categoryFilter = document.querySelector("#categoryFilter");
const ratingFilter = document.querySelector("#ratingFilter");
const dateFilter = document.querySelector("#dateFilter");
const resetFilters = document.querySelector("#resetFilters");
const photoModal = document.querySelector("#photoModal");
const modalPhoto = document.querySelector("#modalPhoto");
const modalCaption = document.querySelector("#modalCaption");
const closePhotoModal = document.querySelector("#closePhotoModal");

const categoryOptions = {
  gastronomica: [
    "Brasileira",
    "Italiana",
    "Japonesa",
    "Mexicana",
    "Hamburgueria",
    "Cafeteria",
    "Doces",
    "Bar",
  ],
  cinefila: ["Terror", "Romance", "Com&eacute;dia", "Drama", "A&ccedil;&atilde;o", "Fic&ccedil;&atilde;o", "Anima&ccedil;&atilde;o", "Document&aacute;rio"],
  passeio: ["Natureza", "Urbano", "Praia", "Parque", "Trilha", "Compras", "Viagem curta", "Ao ar livre"],
  cultural: ["Museu", "Teatro", "Show", "Exposi&ccedil;&atilde;o", "Festival", "Galeria", "Patrim&ocirc;nio", "Evento liter&aacute;rio"],
};

const defaultTypeColors = {
  gastronomica: "#6f7f22",
  cinefila: "#9b2f4b",
  passeio: "#2f6f9f",
  cultural: "#6e4aa8",
};

let currentUser = null;
let selectedRating = 4;
let experiences = [];
let customCategories = [];
let profileSettings = {};
let heroSettings = {};
let selectedPhotos = [];
let editingId = null;
let deleteMode = false;
let selectedForDeletion = new Set();
let unsubscribeExperiences = null;
let unsubscribeCategories = null;
let unsubscribeProfile = null;
let unsubscribeHero = null;

function getFriendlyFirebaseError(error) {
  const messages = {
    "auth/invalid-api-key": "A chave do Firebase esta invalida. Confira o firebase-config.js.",
    "auth/requires-recent-login": "Por seguranca, saia da conta, entre novamente e tente de novo.",
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
    "auth/unauthorized-domain": "Adicione demarco98.github.io aos dominios autorizados no Firebase Authentication.",
    "permission-denied": "Sem permissao no Firestore/Storage. Publique as regras do projeto no Firebase Console.",
    "storage/unauthorized": "Sem permissao no Firebase Storage. Publique as regras do arquivo storage.rules.",
  };

  return messages[error.code] || error.message || "Erro inesperado no Firebase.";
}

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function userDocRef() {
  return doc(db, "users", currentUser.uid);
}

function experiencesRef() {
  return collection(db, "users", currentUser.uid, "experiences");
}

function customCategoriesRef() {
  return collection(db, "users", currentUser.uid, "customCategories");
}

function settingsDocRef(name) {
  return doc(db, "users", currentUser.uid, "settings", name);
}

function clearSubscriptions() {
  [unsubscribeExperiences, unsubscribeCategories, unsubscribeProfile, unsubscribeHero].forEach((unsubscribe) => {
    if (unsubscribe) unsubscribe();
  });
  unsubscribeExperiences = null;
  unsubscribeCategories = null;
  unsubscribeProfile = null;
  unsubscribeHero = null;
}

function isAuthenticated() {
  return Boolean(currentUser?.uid && currentUser?.emailVerified);
}

function decodeHtml(text) {
  const parser = document.createElement("textarea");
  parser.innerHTML = text;
  return parser.value;
}

function getTypeKey(type) {
  return type
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getTypeClass(type) {
  const typeKey = getTypeKey(type);

  if (typeKey.includes("gastronomica")) return "type-gastronomica";
  if (typeKey.includes("cinefila")) return "type-cinefila";
  if (typeKey.includes("passeio")) return "type-passeio";
  if (typeKey.includes("cultural")) return "type-cultural";

  return "";
}

function getTypeKeyFromClass(typeKey) {
  return {
    gastronomica: "Gastronômica",
    cinefila: "Cinéfila",
    passeio: "Passeio",
    cultural: "Cultural",
  }[typeKey];
}

function getCategoriesForType(type) {
  const typeKey = getTypeKey(type);
  const defaults = categoryOptions[typeKey] || [];
  const custom = customCategories
    .filter((category) => category.typeKey === typeKey)
    .map((category) => category.name);

  return [...new Set([...defaults.map(decodeHtml), ...custom])].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

function getCustomCategory(type, categoryName) {
  const typeKey = getTypeKey(type);

  return customCategories.find((category) => category.typeKey === typeKey && category.name === categoryName);
}

function isCustomCategory(type, categoryName) {
  return Boolean(getCustomCategory(type, categoryName));
}

function hexToRgb(hex) {
  const cleanHex = hex.replace("#", "");
  const value = parseInt(cleanHex, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function mixWithWhite(hex, amount = 0.86) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (channel) => Math.round(channel + (255 - channel) * amount);

  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function darken(hex, amount = 0.34) {
  const { r, g, b } = hexToRgb(hex);
  const dark = (channel) => Math.round(channel * (1 - amount));

  return `rgb(${dark(r)}, ${dark(g)}, ${dark(b)})`;
}

function lineColor(hex) {
  const { r, g, b } = hexToRgb(hex);

  return `rgba(${r}, ${g}, ${b}, 0.32)`;
}

function applyTypeColor(typeKey, color) {
  document.documentElement.style.setProperty(`--${typeKey}-color`, color);
  document.documentElement.style.setProperty(`--${typeKey}-dark`, darken(color));
  document.documentElement.style.setProperty(`--${typeKey}-soft`, mixWithWhite(color));
  document.documentElement.style.setProperty(`--${typeKey}-line`, lineColor(color));
}

function getActiveTypeColors() {
  return { ...defaultTypeColors, ...(profileSettings.typeColors || {}) };
}

function getProfileNameParts() {
  const fallbackName = profileSettings.name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "";
  const [firstNameFallback, ...lastNameFallback] = fallbackName.split(" ").filter(Boolean);

  return {
    firstName: profileSettings.firstName || firstNameFallback || "",
    lastName: profileSettings.lastName || lastNameFallback.join(" "),
    birthDate: profileSettings.birthDate || "",
  };
}

function applyProfileSettings() {
  const colors = getActiveTypeColors();

  Object.entries(colors).forEach(([typeKey, color]) => applyTypeColor(typeKey, color));
  userChip.textContent = isAuthenticated()
    ? profileSettings.name || currentUser.displayName || currentUser.email
    : "";
  applyFormCollapseState();
}

function populateSettingsForm() {
  const colors = getActiveTypeColors();
  const profile = getProfileNameParts();

  profileFirstNameInput.value = profile.firstName;
  profileLastNameInput.value = profile.lastName;
  profileBirthDateInput.value = profile.birthDate;
  profilePasswordInput.value = "";
  profileConfirmPasswordInput.value = "";
  colorGastronomica.value = colors.gastronomica;
  colorCinefila.value = colors.cinefila;
  colorPasseio.value = colors.passeio;
  colorCultural.value = colors.cultural;
  settingsMessage.textContent = "";
  settingsMessage.classList.remove("error");
}

function applyFormCollapseState() {
  const collapsed = Boolean(profileSettings.formCollapsed);

  form.classList.toggle("collapsed", collapsed);
  workspace.classList.toggle("form-collapsed", collapsed);
  collapseFormButton.setAttribute("aria-expanded", String(!collapsed));
  collapseFormButton.setAttribute("aria-label", collapsed ? "Expandir painel" : "Encolher painel");
  collapseFormButton.title = collapsed ? "Expandir painel" : "Encolher painel";
}

function applyHeroSettings() {
  const title = heroSettings.title || "Classifique o que valeu a pena viver.";

  heroTitleInput.value = title;
  heroPanel.classList.toggle("has-photo", Boolean(heroSettings.photoUrl));
  heroPanel.style.setProperty("--hero-photo", heroSettings.photoUrl ? `url("${heroSettings.photoUrl}")` : "transparent");
  removeHeroPhotoButton.classList.toggle("hidden", !heroSettings.photoUrl);
}

function applyAuthState() {
  const authenticated = isAuthenticated();
  const displayName = profileSettings.name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "";

  workspace.classList.toggle("hidden", !authenticated);
  lockedPanel.classList.toggle("hidden", authenticated);
  loginLink.classList.toggle("hidden", authenticated);
  logoutButton.classList.toggle("hidden", !authenticated);
  settingsButton.classList.toggle("hidden", !authenticated);
  userChip.classList.toggle("hidden", !authenticated);
  userChip.textContent = authenticated ? displayName : "";

  if (!authenticated) {
    totalCount.textContent = "0";
    averageRating.textContent = "0.0";
    lockedPanel.querySelector("p").textContent = currentUser?.uid && !currentUser.emailVerified
      ? "Confirme seu e-mail antes de acessar suas experiências."
      : "As experiências, fotos, categorias e alterações só aparecem quando você estiver logado com uma conta confirmada.";
  }
}

function watchUserData() {
  clearSubscriptions();

  unsubscribeExperiences = onSnapshot(
    query(experiencesRef(), orderBy("createdAt", "desc")),
    (snapshot) => {
      experiences = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));
      renderExperiences();
    },
    (error) => {
      emptyState.classList.remove("hidden");
      emptyState.textContent = getFriendlyFirebaseError(error);
    },
  );

  unsubscribeCategories = onSnapshot(
    customCategoriesRef(),
    (snapshot) => {
      customCategories = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));
      populateCategorySelect(categoryInput, getSelectedType(), categoryInput.value);
      populateCategoryFilter();
    },
    (error) => {
      emptyState.classList.remove("hidden");
      emptyState.textContent = getFriendlyFirebaseError(error);
    },
  );

  unsubscribeProfile = onSnapshot(settingsDocRef("profile"), (snapshot) => {
    profileSettings = snapshot.exists() ? snapshot.data() : {};
    applyProfileSettings();
  });

  unsubscribeHero = onSnapshot(settingsDocRef("hero"), (snapshot) => {
    heroSettings = snapshot.exists() ? snapshot.data() : {};
    applyHeroSettings();
  });
}

async function ensureUserDocs(user) {
  const profileSnapshot = await getDoc(settingsDocRef("profile"));

  await setDoc(
    userDocRef(),
    {
      uid: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "",
      email: user.email,
      emailVerified: user.emailVerified,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  if (!profileSnapshot.exists()) {
    await setDoc(settingsDocRef("profile"), {
      name: user.displayName || user.email?.split("@")[0] || "",
      email: user.email,
      typeColors: defaultTypeColors,
      formCollapsed: false,
      updatedAt: serverTimestamp(),
    });
  }
}

function getSelectedType() {
  return document.querySelector('input[name="experienceType"]:checked').value;
}

function updateCustomCategoryControls() {
  const type = getSelectedType();
  const selectedCategory = categoryInput.value;
  const isOther = selectedCategory === "__other__";
  const isCustom = isCustomCategory(type, selectedCategory);

  customCategoryBox.classList.toggle("hidden", !isOther && !isCustom);
  customCategoryInput.classList.toggle("hidden", !isOther);
  addCategoryButton.classList.toggle("hidden", !isOther);
  deleteCategoryButton.classList.toggle("hidden", !isCustom);

  if (isOther) customCategoryInput.focus();
}

function populateCategorySelect(select, type, selectedValue = "") {
  select.innerHTML = "";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Selecione uma categoria";
  select.appendChild(emptyOption);

  getCategoriesForType(type).forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });

  const otherOption = document.createElement("option");
  otherOption.value = "__other__";
  otherOption.textContent = "Outro";
  select.appendChild(otherOption);

  select.value = [...select.options].some((option) => option.value === selectedValue)
    ? selectedValue
    : "";
  updateCustomCategoryControls();
}

function populateCategoryFilter() {
  const type = typeFilter.value;
  const selectedValue = categoryFilter.value;
  const categories = type
    ? getCategoriesForType(type)
    : [...new Set([...Object.values(categoryOptions).flat().map(decodeHtml), ...customCategories.map((category) => category.name)])];

  categoryFilter.innerHTML = '<option value="">Todas</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  categoryFilter.value = [...categoryFilter.options].some((option) => option.value === selectedValue)
    ? selectedValue
    : "";
}

function resetFormState() {
  form.reset();
  document.querySelector('input[name="experienceType"]').checked = true;
  populateCategorySelect(categoryInput, getSelectedType());
  dateInput.value = getToday();
  selectedRating = 4;
  selectedPhotos = [];
  editingId = null;
  photosInput.value = "";
  customCategoryInput.value = "";
  submitLabel.textContent = "Registrar experiência";
  cancelEditButton.classList.add("hidden");
  renderPhotoPreview();
  paintStars(selectedRating);
}

function paintStars(rating) {
  starButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.rating) <= rating);
  });
}

function getStars(rating) {
  return "\u2605".repeat(rating) + "\u2606".repeat(5 - rating);
}

function formatDate(date) {
  if (!date) return "Sem data";

  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return "Sem data";

  return `${day}/${month}/${year}`;
}

function getFilteredExperiences() {
  const search = searchFilter.value.trim().toLowerCase();
  const type = typeFilter.value;
  const category = categoryFilter.value;
  const rating = Number(ratingFilter.value || 0);
  const date = dateFilter.value;

  return experiences.filter((experience) => {
    const searchableText = `${experience.name} ${experience.category || ""} ${experience.notes || ""}`.toLowerCase();
    const matchesSearch = !search || searchableText.includes(search);
    const matchesType = !type || experience.type === type;
    const matchesCategory = !category || experience.category === category;
    const matchesRating = !rating || experience.rating >= rating;
    const matchesDate = !date || experience.date === date;

    return matchesSearch && matchesType && matchesCategory && matchesRating && matchesDate;
  });
}

function exitDeleteMode() {
  deleteMode = false;
  selectedForDeletion = new Set();
  deleteControls.classList.add("hidden");
  clearButton.classList.remove("active");
}

function updateDeleteHint() {
  const total = selectedForDeletion.size;
  deleteHint.textContent =
    total === 0
      ? "Selecione as experiências que deseja deletar."
      : `${total} experiência${total > 1 ? "s" : ""} selecionada${total > 1 ? "s" : ""}.`;
}

function startEdit(experience) {
  exitDeleteMode();
  editingId = experience.id;
  selectedPhotos = experience.photos || [];
  selectedRating = experience.rating;

  document.querySelector(`input[name="experienceType"][value="${experience.type}"]`).checked = true;
  populateCategorySelect(categoryInput, experience.type, experience.category || "");
  nameInput.value = experience.name;
  dateInput.value = experience.date || getToday();
  notesInput.value = experience.notes || "";
  photosInput.value = "";
  submitLabel.textContent = "Salvar alterações";
  cancelEditButton.classList.remove("hidden");
  renderPhotoPreview();
  paintStars(selectedRating);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  nameInput.focus();
}

function openPhotoModal(photo, caption, fallback) {
  modalPhoto.onerror = () => {
    if (fallback && modalPhoto.src !== fallback) modalPhoto.src = fallback;
  };
  modalPhoto.src = getPhotoSrc(photo);
  modalPhoto.alt = caption;
  modalCaption.textContent = caption;
  photoModal.classList.remove("hidden");
  closePhotoModal.focus();
}

function closeModal() {
  photoModal.classList.add("hidden");
  modalPhoto.removeAttribute("src");
  modalPhoto.alt = "";
  modalCaption.textContent = "";
}

function renderPhotoPreview() {
  photoPreview.innerHTML = "";

  selectedPhotos.forEach((photo) => {
    const image = document.createElement("img");
    image.src = getPhotoSrc(photo);
    image.alt = "Foto selecionada";
    applyImageFallback(image, getPhotoFallback(photo, getSelectedType()));
    photoPreview.appendChild(image);
  });
}

function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const maxSize = 1200;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Nao foi possivel carregar a imagem."));
    };

    image.src = objectUrl;
  });
}

async function readPhotos(files) {
  const images = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, 4);

  return Promise.all(images.map((file) => resizePhoto(file)));
}

function getTypeKeyword(type, category = "") {
  const normalizedType = getTypeKey(type);
  const normalizedCategory = getTypeKey(category);

  if (normalizedType.includes("gastronomica")) return `${normalizedCategory} restaurant food`;
  if (normalizedType.includes("cinefila")) return `${normalizedCategory} movie poster cinema`;
  if (normalizedType.includes("passeio")) return `${normalizedCategory} travel experience`;
  if (normalizedType.includes("cultural")) return `${normalizedCategory} museum culture event`;

  return "experience lifestyle";
}

function getFallbackPhoto(type) {
  const normalizedType = getTypeKey(type);

  if (normalizedType.includes("gastronomica")) {
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80";
  }

  if (normalizedType.includes("cinefila")) {
    return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80";
  }

  if (normalizedType.includes("cultural")) {
    return "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=900&q=80";
  }

  return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80";
}

function createRepresentativePhoto(name, type, category) {
  const query = encodeURIComponent(`${name} ${category} ${getTypeKeyword(type, category)}`);

  return {
    url: `https://source.unsplash.com/900x900/?${query}`,
    fallback: getFallbackPhoto(type),
    source: "auto",
  };
}

async function fetchRepresentativePhotos(name, type, category) {
  return [createRepresentativePhoto(name, type, category)];
}

function getPhotoSrc(photo) {
  if (typeof photo === "string") return photo;

  return photo.url || photo.src;
}

function getPhotoFallback(photo, type) {
  if (typeof photo === "string") return getFallbackPhoto(type);

  return photo.fallback || getFallbackPhoto(type);
}

function applyImageFallback(image, fallback) {
  image.onerror = () => {
    if (fallback && image.src !== fallback) image.src = fallback;
  };
}

async function uploadDataUrl(dataUrl, folder) {
  const fileRef = ref(storage, `users/${currentUser.uid}/${folder}/${crypto.randomUUID()}.jpg`);

  await uploadString(fileRef, dataUrl, "data_url");

  return {
    url: await getDownloadURL(fileRef),
    path: fileRef.fullPath,
    source: "storage",
  };
}

async function normalizePhotosForSave(photos, folder) {
  return Promise.all(
    photos.map((photo) => {
      if (typeof photo === "string" && photo.startsWith("data:image")) {
        return uploadDataUrl(photo, folder);
      }

      return photo;
    }),
  );
}

function renderExperiences() {
  const filteredExperiences = getFilteredExperiences();

  experienceList.innerHTML = "";
  emptyState.classList.toggle("hidden", filteredExperiences.length > 0);
  emptyState.textContent =
    experiences.length === 0
      ? "Nenhuma experiência registrada ainda."
      : "Nenhuma experiência encontrada com esses filtros.";
  totalCount.textContent = filteredExperiences.length;

  const average =
    filteredExperiences.length === 0
      ? 0
      : filteredExperiences.reduce((sum, item) => sum + item.rating, 0) / filteredExperiences.length;

  averageRating.textContent = average.toFixed(1);

  filteredExperiences.forEach((experience) => {
    const item = document.createElement("li");
    item.className = "experience-card";
    item.classList.add(getTypeClass(experience.type));
    item.classList.toggle("delete-mode", deleteMode);

    const deleteSelect = document.createElement("input");
    const content = document.createElement("div");
    const heading = document.createElement("div");
    const meta = document.createElement("div");
    const title = document.createElement("strong");
    const type = document.createElement("small");
    const category = document.createElement("small");
    const date = document.createElement("small");
    const rating = document.createElement("span");
    const cardActions = document.createElement("div");
    const editButton = document.createElement("button");
    const notes = document.createElement("p");
    const photos = document.createElement("div");

    deleteSelect.className = "delete-select";
    deleteSelect.type = "checkbox";
    deleteSelect.checked = selectedForDeletion.has(experience.id);
    deleteSelect.setAttribute("aria-label", `Selecionar ${experience.name} para deletar`);
    deleteSelect.addEventListener("change", () => {
      if (deleteSelect.checked) {
        selectedForDeletion.add(experience.id);
      } else {
        selectedForDeletion.delete(experience.id);
      }
      updateDeleteHint();
    });

    content.className = "experience-main";
    meta.className = "experience-meta";

    title.textContent = experience.name;
    type.textContent = experience.type;
    category.textContent = experience.category || "Sem categoria";
    date.textContent = formatDate(experience.date);
    meta.append(type, category, date);
    heading.append(title, meta);

    rating.className = "rating-pill";
    rating.textContent = getStars(experience.rating);
    rating.setAttribute("aria-label", `${experience.rating} de 5 estrelas`);

    editButton.className = "edit-button";
    editButton.type = "button";
    editButton.title = "Editar experiência";
    editButton.setAttribute("aria-label", `Editar ${experience.name}`);
    editButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    editButton.addEventListener("click", () => startEdit(experience));

    cardActions.className = "card-actions";
    cardActions.append(rating, editButton);

    content.append(heading);

    if (experience.notes) {
      notes.className = "experience-notes";
      notes.textContent = experience.notes;
      content.appendChild(notes);
    }

    item.append(deleteSelect, content, cardActions);

    if (experience.photos?.length) {
      photos.className = "card-photos";
      experience.photos.forEach((photo, index) => {
        const button = document.createElement("button");
        const image = document.createElement("img");
        const caption = `${experience.name} - foto ${index + 1}`;
        const fallback = getPhotoFallback(photo, experience.type);

        button.className = "photo-open-button";
        button.type = "button";
        button.setAttribute("aria-label", `Abrir foto ${index + 1} de ${experience.name}`);
        button.addEventListener("click", () => openPhotoModal(photo, caption, fallback));

        image.src = getPhotoSrc(photo);
        image.alt = `Foto ${index + 1} de ${experience.name}`;
        applyImageFallback(image, fallback);
        button.appendChild(image);
        photos.appendChild(button);
      });
      item.appendChild(photos);
    }

    experienceList.appendChild(item);
  });
}

starButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedRating = Number(button.dataset.rating);
    paintStars(selectedRating);
  });
});

document.querySelectorAll('input[name="experienceType"]').forEach((input) => {
  input.addEventListener("change", () => {
    populateCategorySelect(categoryInput, getSelectedType());
    renderPhotoPreview();
  });
});

categoryInput.addEventListener("change", updateCustomCategoryControls);

addCategoryButton.addEventListener("click", async () => {
  if (!isAuthenticated()) return;

  const type = getSelectedType();
  const typeKey = getTypeKey(type);
  const category = customCategoryInput.value.trim();

  if (!category) return;

  if (!isCustomCategory(type, category) && !getCategoriesForType(type).includes(category)) {
    await addDoc(customCategoriesRef(), {
      name: category,
      type,
      typeKey,
      createdAt: serverTimestamp(),
    });
  }

  customCategoryInput.value = "";
  populateCategorySelect(categoryInput, type, category);
});

customCategoryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCategoryButton.click();
  }
});

deleteCategoryButton.addEventListener("click", async () => {
  if (!isAuthenticated()) return;

  const type = getSelectedType();
  const category = categoryInput.value;
  const customCategory = getCustomCategory(type, category);

  if (!customCategory) return;

  await deleteDoc(doc(db, "users", currentUser.uid, "customCategories", customCategory.id));
  populateCategorySelect(categoryInput, type);
  renderExperiences();
});

photosInput.addEventListener("change", async () => {
  selectedPhotos = await readPhotos(photosInput.files);
  renderPhotoPreview();
});

saveHeroButton.addEventListener("click", async () => {
  if (!isAuthenticated()) return;

  await setDoc(
    settingsDocRef("hero"),
    {
      ...heroSettings,
      title: heroTitleInput.value.trim() || "Classifique o que valeu a pena viver.",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
});

heroTitleInput.addEventListener("blur", () => {
  saveHeroButton.click();
});

heroPhotoInput.addEventListener("change", async () => {
  if (!isAuthenticated() || !heroPhotoInput.files.length) return;

  const [photo] = await readPhotos(heroPhotoInput.files);
  const uploadedPhoto = await uploadDataUrl(photo, "hero");

  await setDoc(
    settingsDocRef("hero"),
    {
      ...heroSettings,
      photoUrl: uploadedPhoto.url,
      photoPath: uploadedPhoto.path,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  heroPhotoInput.value = "";
});

removeHeroPhotoButton.addEventListener("click", async () => {
  if (!isAuthenticated()) return;

  await setDoc(
    settingsDocRef("hero"),
    {
      title: heroSettings.title || "Classifique o que valeu a pena viver.",
      photoUrl: "",
      photoPath: "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
});

settingsButton.addEventListener("click", () => {
  if (!isAuthenticated()) return;

  populateSettingsForm();
  settingsModal.classList.remove("hidden");
  profileFirstNameInput.focus();
});

collapseFormButton.addEventListener("click", async () => {
  if (!isAuthenticated()) return;

  await setDoc(
    settingsDocRef("profile"),
    {
      ...profileSettings,
      formCollapsed: !profileSettings.formCollapsed,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
});

function closeSettings() {
  settingsModal.classList.add("hidden");
}

closeSettingsButton.addEventListener("click", closeSettings);

settingsModal.addEventListener("click", (event) => {
  if (event.target === settingsModal) closeSettings();
});

[colorGastronomica, colorCinefila, colorPasseio, colorCultural].forEach((input) => {
  input.addEventListener("input", () => {
    applyTypeColor("gastronomica", colorGastronomica.value);
    applyTypeColor("cinefila", colorCinefila.value);
    applyTypeColor("passeio", colorPasseio.value);
    applyTypeColor("cultural", colorCultural.value);
  });
});

saveSettingsButton.addEventListener("click", async () => {
  if (!isAuthenticated()) return;

  const firstName = profileFirstNameInput.value.trim();
  const lastName = profileLastNameInput.value.trim();
  const birthDate = profileBirthDateInput.value;
  const name = `${firstName} ${lastName}`.trim() || currentUser.displayName || currentUser.email;
  const password = profilePasswordInput.value;
  const confirmPassword = profileConfirmPasswordInput.value;

  settingsMessage.textContent = "";
  settingsMessage.classList.remove("error");
  saveSettingsButton.disabled = true;

  if (password || confirmPassword) {
    if (password !== confirmPassword) {
      settingsMessage.textContent = "As senhas nao correspondem.";
      settingsMessage.classList.add("error");
      saveSettingsButton.disabled = false;
      return;
    }

    try {
      await updatePassword(currentUser, password);
      profilePasswordInput.value = "";
      profileConfirmPasswordInput.value = "";
    } catch (error) {
      settingsMessage.textContent = getFriendlyFirebaseError(error);
      settingsMessage.classList.add("error");
      saveSettingsButton.disabled = false;
      return;
    }
  }

  try {
    await updateProfile(currentUser, { displayName: name });

    await setDoc(
      userDocRef(),
      {
        uid: currentUser.uid,
        name,
        firstName,
        lastName,
        birthDate,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await setDoc(
      settingsDocRef("profile"),
      {
        name,
        firstName,
        lastName,
        birthDate,
        email: currentUser.email,
        typeColors: {
          gastronomica: colorGastronomica.value,
          cinefila: colorCinefila.value,
          passeio: colorPasseio.value,
          cultural: colorCultural.value,
        },
        formCollapsed: Boolean(profileSettings.formCollapsed),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    settingsMessage.textContent = "Configuracoes salvas.";
  } catch (error) {
    settingsMessage.textContent = getFriendlyFirebaseError(error);
    settingsMessage.classList.add("error");
  } finally {
    saveSettingsButton.disabled = false;
  }
});

deleteAccountButton.addEventListener("click", async () => {
  if (!isAuthenticated()) return;

  const confirmed = window.confirm("Tem certeza que deseja excluir sua conta? Essa acao nao pode ser desfeita.");

  if (!confirmed) return;

  deleteAccountButton.disabled = true;
  settingsMessage.textContent = "";
  settingsMessage.classList.remove("error");

  try {
    await deleteUser(currentUser);
    window.location.href = "./login.html";
  } catch (error) {
    settingsMessage.textContent = getFriendlyFirebaseError(error);
    settingsMessage.classList.add("error");
    deleteAccountButton.disabled = false;
  }
});

resetColorsButton.addEventListener("click", () => {
  colorGastronomica.value = defaultTypeColors.gastronomica;
  colorCinefila.value = defaultTypeColors.cinefila;
  colorPasseio.value = defaultTypeColors.passeio;
  colorCultural.value = defaultTypeColors.cultural;
  Object.entries(defaultTypeColors).forEach(([typeKey, color]) => applyTypeColor(typeKey, color));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isAuthenticated()) return;

  const name = nameInput.value.trim();
  const category = categoryInput.value;
  const date = dateInput.value;
  const notes = notesInput.value.trim();
  const type = new FormData(form).get("experienceType");

  if (!name || !category || category === "__other__" || !date) return;

  submitButton.disabled = true;
  submitLabel.textContent = selectedPhotos.length
    ? editingId
      ? "Salvando..."
      : "Registrando..."
    : "Buscando foto...";

  try {
    const photos = selectedPhotos.length
      ? await normalizePhotosForSave(selectedPhotos, "experiences")
      : await fetchRepresentativePhotos(name, type, category);
    const experienceData = {
      name,
      category,
      date,
      notes,
      photos,
      type,
      typeKey: getTypeKey(type),
      rating: selectedRating,
      updatedAt: serverTimestamp(),
    };

    if (editingId) {
      await updateDoc(doc(db, "users", currentUser.uid, "experiences", editingId), experienceData);
    } else {
      await addDoc(experiencesRef(), {
        ...experienceData,
        createdAt: serverTimestamp(),
      });
    }

    resetFormState();
    nameInput.focus();
  } finally {
    submitButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  await signOut(auth);
});

clearButton.addEventListener("click", () => {
  deleteMode = !deleteMode;
  if (deleteMode) {
    selectedForDeletion = new Set();
    deleteControls.classList.remove("hidden");
    clearButton.classList.add("active");
    updateDeleteHint();
  } else {
    exitDeleteMode();
  }
  renderExperiences();
});

confirmDeleteButton.addEventListener("click", async () => {
  if (selectedForDeletion.size === 0 || !isAuthenticated()) return;

  await Promise.all(
    [...selectedForDeletion].map((experienceId) =>
      deleteDoc(doc(db, "users", currentUser.uid, "experiences", experienceId)),
    ),
  );
  exitDeleteMode();
});

cancelDeleteButton.addEventListener("click", () => {
  exitDeleteMode();
  renderExperiences();
});

cancelEditButton.addEventListener("click", () => {
  resetFormState();
  nameInput.focus();
});

closePhotoModal.addEventListener("click", closeModal);

photoModal.addEventListener("click", (event) => {
  if (event.target === photoModal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !photoModal.classList.contains("hidden")) closeModal();
  if (event.key === "Escape" && !settingsModal.classList.contains("hidden")) closeSettings();
});

searchFilter.addEventListener("input", renderExperiences);
typeFilter.addEventListener("change", () => {
  populateCategoryFilter();
  renderExperiences();
});
categoryFilter.addEventListener("change", renderExperiences);
ratingFilter.addEventListener("change", renderExperiences);
dateFilter.addEventListener("change", renderExperiences);

resetFilters.addEventListener("click", () => {
  searchFilter.value = "";
  typeFilter.value = "";
  categoryFilter.value = "";
  ratingFilter.value = "";
  dateFilter.value = "";
  populateCategoryFilter();
  renderExperiences();
});

onAuthStateChanged(auth, async (user) => {
  clearSubscriptions();
  currentUser = user;

  if (user) {
    try {
      await reload(user);
      currentUser = auth.currentUser;
    } catch (error) {
      console.warn("Nao foi possivel atualizar a sessao do usuario.", error);
    }
  }

  if (!isAuthenticated()) {
    experiences = [];
    customCategories = [];
    profileSettings = {};
    heroSettings = {};
    applyAuthState();
    applyProfileSettings();
    applyHeroSettings();
    renderExperiences();
    return;
  }

  applyAuthState();

  try {
    await ensureUserDocs(currentUser);
    watchUserData();
  } catch (error) {
    emptyState.classList.remove("hidden");
    emptyState.textContent = getFriendlyFirebaseError(error);
  }
});

populateCategorySelect(categoryInput, getSelectedType());
populateCategoryFilter();
dateInput.value = getToday();
paintStars(selectedRating);
