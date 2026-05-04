import { auth, db, firebaseProjectId, storage } from "./firebase-config.js";
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
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
const notificationButton = document.querySelector("#notificationButton");
const notificationCount = document.querySelector("#notificationCount");
const notificationsModal = document.querySelector("#notificationsModal");
const closeNotificationsButton = document.querySelector("#closeNotificationsButton");
const notificationsList = document.querySelector("#notificationsList");
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
const settingsTabs = Array.from(document.querySelectorAll("[data-settings-tab]"));
const settingsPanels = Array.from(document.querySelectorAll("[data-settings-panel]"));
const themeToggleButton = document.querySelector("#themeToggleButton");
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
const formMessage = document.querySelector("#formMessage");
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
let notifications = [];
let selectedPhotos = [];
let editingId = null;
let deleteMode = false;
let selectedForDeletion = new Set();
let unsubscribeExperiences = null;
let unsubscribeCategories = null;
let unsubscribeProfile = null;
let unsubscribeHero = null;
let unsubscribeNotifications = null;

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

function notificationsRef(uid = currentUser.uid) {
  return collection(db, "users", uid, "notifications");
}

function settingsDocRef(name) {
  return doc(db, "users", currentUser.uid, "settings", name);
}

function clearSubscriptions() {
  [unsubscribeExperiences, unsubscribeCategories, unsubscribeProfile, unsubscribeHero, unsubscribeNotifications].forEach((unsubscribe) => {
    if (unsubscribe) unsubscribe();
  });
  unsubscribeExperiences = null;
  unsubscribeCategories = null;
  unsubscribeProfile = null;
  unsubscribeHero = null;
  unsubscribeNotifications = null;
}

function isAuthenticated() {
  return Boolean(currentUser?.uid && currentUser?.emailVerified);
}

function decodeHtml(text) {
  const parser = document.createElement("textarea");
  parser.innerHTML = text;
  return parser.value;
}

function cleanText(text) {
  if (typeof text !== "string") return text;

  const mojibakeReplacements = [
    [[0xc3, 0x192, 0xc2, 0xa1], "á"],
    [[0xc3, 0x192, 0xc2, 0xa0], "à"],
    [[0xc3, 0x192, 0xc2, 0xa2], "â"],
    [[0xc3, 0x192, 0xc2, 0xa3], "ã"],
    [[0xc3, 0x192, 0xc2, 0xa9], "é"],
    [[0xc3, 0x192, 0xc2, 0xaa], "ê"],
    [[0xc3, 0x192, 0xc2, 0xad], "í"],
    [[0xc3, 0x192, 0xc2, 0xb3], "ó"],
    [[0xc3, 0x192, 0xc2, 0xb4], "ô"],
    [[0xc3, 0x192, 0xc2, 0xb5], "õ"],
    [[0xc3, 0x192, 0xc2, 0xba], "ú"],
    [[0xc3, 0x192, 0xc2, 0xa7], "ç"],
    [[0xc3, 0xa1], "á"],
    [[0xc3, 0xa0], "à"],
    [[0xc3, 0xa2], "â"],
    [[0xc3, 0xa3], "ã"],
    [[0xc3, 0xa9], "é"],
    [[0xc3, 0xaa], "ê"],
    [[0xc3, 0xad], "í"],
    [[0xc3, 0xb3], "ó"],
    [[0xc3, 0xb4], "ô"],
    [[0xc3, 0xb5], "õ"],
    [[0xc3, 0xba], "ú"],
    [[0xc3, 0xa7], "ç"],
  ];

  return mojibakeReplacements.reduce(
    (currentText, [codes, replacement]) => currentText.replaceAll(String.fromCharCode(...codes), replacement),
    text,
  );
}

function cleanData(value) {
  if (Array.isArray(value)) return value.map(cleanData);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cleanData(item)]),
    );
  }

  return cleanText(value);
}

function getTypeKey(type) {
  return type
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeUsername(username) {
  return username
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

function getCurrentUsername() {
  return profileSettings.username || currentUser?.email?.split("@")[0] || "usuario";
}

function getCurrentSharePerson(status = "owner") {
  return {
    uid: currentUser.uid,
    username: getCurrentUsername(),
    name: profileSettings.name || currentUser.displayName || currentUser.email,
    status,
  };
}

function mergeSharedPeople(people = [], nextPerson) {
  const byUid = new Map();

  people.forEach((person) => {
    if (person?.uid) byUid.set(person.uid, person);
  });
  byUid.set(nextPerson.uid, { ...byUid.get(nextPerson.uid), ...nextPerson });

  return [...byUid.values()];
}

function getSharedGroupId(experience) {
  return experience.sharedGroupId || `${currentUser.uid}_${experience.id}`;
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

function getActiveTheme() {
  return profileSettings.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme = getActiveTheme()) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";

  document.documentElement.dataset.theme = normalizedTheme;

  if (themeToggleButton) {
    themeToggleButton.dataset.theme = normalizedTheme;
    themeToggleButton.setAttribute(
      "aria-label",
      normalizedTheme === "dark" ? "Alternar para modo claro" : "Alternar para modo escuro",
    );
  }
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
  applyTheme();
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
  applyTheme();
  colorGastronomica.value = colors.gastronomica;
  colorCinefila.value = colors.cinefila;
  colorPasseio.value = colors.passeio;
  colorCultural.value = colors.cultural;
  settingsMessage.textContent = "";
  settingsMessage.classList.remove("error");
}

function showSettingsPanel(panelName) {
  settingsTabs.forEach((tab) => {
    const active = tab.dataset.settingsTab === panelName;

    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  settingsPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.settingsPanel === panelName);
  });

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
  const authenticatedButtons = [logoutButton, settingsButton, themeToggleButton, notificationButton, userChip];

  workspace.classList.toggle("hidden", !authenticated);
  lockedPanel.classList.toggle("hidden", authenticated);
  loginLink.classList.toggle("hidden", authenticated);
  authenticatedButtons.forEach((element) => {
    element.classList.toggle("hidden", !authenticated);
  });
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
        ...cleanData(docSnapshot.data()),
      }));
      renderExperiences();
    },
    (error) => {
      emptyState.classList.remove("hidden");
      emptyState.textContent = getFriendlyFirebaseError(error);
      loadUserDataFromRest().catch((restError) => {
        emptyState.textContent = getFriendlyFirebaseError(restError);
      });
    },
  );

  unsubscribeCategories = onSnapshot(
    customCategoriesRef(),
    (snapshot) => {
      customCategories = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...cleanData(docSnapshot.data()),
      }));
      populateCategorySelect(categoryInput, getSelectedType(), categoryInput.value);
      populateCategoryFilter();
    },
    (error) => {
      emptyState.classList.remove("hidden");
      emptyState.textContent = getFriendlyFirebaseError(error);
      loadUserDataFromRest().catch((restError) => {
        emptyState.textContent = getFriendlyFirebaseError(restError);
      });
    },
  );

  unsubscribeProfile = onSnapshot(settingsDocRef("profile"), (snapshot) => {
    profileSettings = snapshot.exists() ? cleanData(snapshot.data()) : {};
    applyProfileSettings();
  });

  unsubscribeHero = onSnapshot(settingsDocRef("hero"), (snapshot) => {
    heroSettings = snapshot.exists() ? cleanData(snapshot.data()) : {};
    applyHeroSettings();
  });

  unsubscribeNotifications = onSnapshot(
    query(notificationsRef(), orderBy("createdAt", "desc")),
    (snapshot) => {
      notifications = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...cleanData(docSnapshot.data()),
      }));
      renderNotifications();
    },
    (error) => {
      console.warn("Nao foi possivel carregar notificacoes.", error);
    },
  );
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
      theme: "light",
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
  formMessage.textContent = "";
  formMessage.classList.remove("error");
  submitLabel.textContent = "Registrar experiência";
  cancelEditButton.classList.add("hidden");
  renderPhotoPreview();
  paintStars(selectedRating);
}

function setFormMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("error", isError);
}

function withTimeout(promise, message = "O Firebase demorou para responder. Tente novamente em alguns segundos.") {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), 12000);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function getRestDocumentId(name) {
  return name.split("/").pop();
}

function isServerTimestamp(value) {
  return Boolean(value && typeof value === "object" && value._methodName === "serverTimestamp");
}

function toFirestoreValue(value) {
  if (isServerTimestamp(value)) return { timestampValue: new Date().toISOString() };
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value)
            .filter(([, item]) => item !== undefined)
            .map(([key, item]) => [key, toFirestoreValue(item)]),
        ),
      },
    };
  }

  return { stringValue: String(value) };
}

function fromFirestoreValue(value) {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue.fields || {});

  return null;
}

function fromFirestoreFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]),
  );
}

function toFirestoreFields(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toFirestoreValue(value)]),
  );
}

async function firestoreRestRequest(path, options = {}) {
  const token = await currentUser.getIdToken();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    },
  );

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.error?.message || `Erro ${response.status} no Firestore.`);
  }

  return response.json();
}

async function createDocumentWithFallback(sdkPromise, collectionPath, data) {
  try {
    return await withTimeout(sdkPromise);
  } catch (sdkError) {
    console.warn("Firestore SDK falhou, tentando REST.", sdkError);
    const documentData = await firestoreRestRequest(collectionPath, {
      method: "POST",
      body: JSON.stringify({ fields: toFirestoreFields(data) }),
    });

    return { id: getRestDocumentId(documentData.name) };
  }
}

async function updateDocumentWithFallback(sdkPromise, documentPath, data) {
  try {
    return await withTimeout(sdkPromise);
  } catch (sdkError) {
    console.warn("Firestore SDK falhou, tentando REST.", sdkError);
    const updateMask = Object.keys(data)
      .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
      .join("&");

    return firestoreRestRequest(`${documentPath}${updateMask ? `?${updateMask}` : ""}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: toFirestoreFields(data) }),
    });
  }
}

async function loadUserDataFromRest() {
  const [experienceResponse, categoryResponse] = await Promise.all([
    firestoreRestRequest(`users/${currentUser.uid}/experiences`).catch((error) => {
      if (error.message.includes("NOT_FOUND")) return { documents: [] };
      throw error;
    }),
    firestoreRestRequest(`users/${currentUser.uid}/customCategories`).catch((error) => {
      if (error.message.includes("NOT_FOUND")) return { documents: [] };
      throw error;
    }),
  ]);

  experiences = (experienceResponse.documents || [])
    .map((documentData) => ({
      id: getRestDocumentId(documentData.name),
      ...cleanData(fromFirestoreFields(documentData.fields)),
    }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  customCategories = (categoryResponse.documents || []).map((documentData) => ({
    id: getRestDocumentId(documentData.name),
    ...cleanData(fromFirestoreFields(documentData.fields)),
  }));

  populateCategorySelect(categoryInput, getSelectedType(), categoryInput.value);
  populateCategoryFilter();
  renderExperiences();
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

  await withTimeout(
    uploadString(fileRef, dataUrl, "data_url"),
    "O upload da foto demorou para responder. Tente novamente em alguns segundos.",
  );

  return {
    url: await withTimeout(
      getDownloadURL(fileRef),
      "Nao foi possivel obter o link da foto agora. Tente novamente.",
    ),
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
    const shareButton = document.createElement("button");
    const sharedBox = document.createElement("div");
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

    shareButton.className = "edit-button share-button";
    shareButton.type = "button";
    shareButton.title = "Compartilhar experiência";
    shareButton.setAttribute("aria-label", `Compartilhar ${experience.name}`);
    shareButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a3 3 0 1 0-2.8-4"/><path d="M6 14a3 3 0 1 0 2.8 4"/><path d="m8.6 15.4 6.8-3.8"/><path d="m8.6 8.6 6.8 3.8"/></svg>';
    shareButton.addEventListener("click", () => shareExperience(experience));

    cardActions.className = "card-actions";
    cardActions.append(rating, editButton, shareButton);

    content.append(heading);

    if (experience.notes) {
      notes.className = "experience-notes";
      notes.textContent = experience.notes;
      content.appendChild(notes);
    }

    if (experience.sharedWith?.length) {
      const sharedNames = experience.sharedWith
        .filter((person) => person.uid !== currentUser.uid)
        .map((person) => `@${person.username || person.name || "usuario"}${person.status === "pending" ? " (pendente)" : ""}`);

      if (sharedNames.length) {
        sharedBox.className = "shared-box";
        sharedBox.innerHTML = `<strong>Compartilhado com</strong><span>${sharedNames.join(", ")}</span>`;
        content.appendChild(sharedBox);
      }
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

async function findUserByUsername(username) {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) throw new Error("Digite um nome de usuário.");

  const usernameSnapshot = await getDoc(doc(db, "usernames", normalizedUsername));

  if (!usernameSnapshot.exists()) throw new Error("Usuário não encontrado.");

  return usernameSnapshot.data();
}

async function shareExperience(experience) {
  if (!isAuthenticated()) return;

  const username = window.prompt("Digite o nome de usuário para compartilhar:");

  if (!username) return;

  try {
    const targetUser = await findUserByUsername(username);

    if (targetUser.uid === currentUser.uid) {
      setFormMessage("Você não precisa compartilhar com você mesmo.", true);
      return;
    }

    const sharedGroupId = getSharedGroupId(experience);
    const ownerPerson = getCurrentSharePerson("owner");
    const targetPerson = {
      uid: targetUser.uid,
      username: targetUser.username,
      name: targetUser.name || targetUser.username,
      status: "pending",
    };
    const sharedWith = mergeSharedPeople(
      mergeSharedPeople(experience.sharedWith || [], ownerPerson),
      targetPerson,
    );
    const sharedParticipantUids = [...new Set(sharedWith.map((person) => person.uid))];

    await updateDoc(doc(db, "users", currentUser.uid, "experiences", experience.id), {
      shared: true,
      sharedGroupId,
      sharedOwnerUid: experience.sharedOwnerUid || currentUser.uid,
      sharedParticipantUids,
      sharedWith,
      updatedAt: serverTimestamp(),
    });

    experiences = experiences.map((item) =>
      item.id === experience.id
        ? { ...item, shared: true, sharedGroupId, sharedOwnerUid: experience.sharedOwnerUid || currentUser.uid, sharedParticipantUids, sharedWith }
        : item,
    );
    renderExperiences();

    await addDoc(notificationsRef(targetUser.uid), {
      type: "experience-share",
      status: "pending",
      fromUid: currentUser.uid,
      fromUsername: getCurrentUsername(),
      fromName: profileSettings.name || currentUser.displayName || currentUser.email,
      toUid: targetUser.uid,
      experienceId: experience.id,
      sharedGroupId,
      sharedOwnerUid: experience.sharedOwnerUid || currentUser.uid,
      sharedParticipantUids,
      sharedWith,
      experience: {
        name: experience.name,
        category: experience.category || "",
        date: experience.date || "",
        notes: experience.notes || "",
        photos: experience.photos || [],
        type: experience.type,
        typeKey: experience.typeKey || getTypeKey(experience.type),
        rating: experience.rating,
        shared: true,
        sharedGroupId,
        sharedOwnerUid: experience.sharedOwnerUid || currentUser.uid,
        sharedParticipantUids,
        sharedWith,
        sharedFromUid: currentUser.uid,
        sharedFromUsername: getCurrentUsername(),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setFormMessage(`Convite enviado para @${normalizeUsername(username)}.`);
  } catch (error) {
    setFormMessage(error.message || getFriendlyFirebaseError(error), true);
  }
}

function renderNotifications() {
  const pendingNotifications = notifications.filter((notification) => notification.status === "pending");

  notificationCount.textContent = pendingNotifications.length;
  notificationCount.classList.toggle("hidden", pendingNotifications.length === 0);
  notificationsList.innerHTML = "";

  if (notifications.length === 0) {
    notificationsList.innerHTML = '<p class="settings-note">Sem novas mensagens</p>';
    return;
  }

  notifications.forEach((notification) => {
    const item = document.createElement("article");
    const title = document.createElement("strong");
    const description = document.createElement("p");
    const actions = document.createElement("div");

    item.className = "notification-item";
    title.textContent = notification.status === "pending" ? "Convite de experiência" : "Convite respondido";
    description.textContent =
      notification.status === "pending"
        ? `${notification.fromName || notification.fromUsername} quer compartilhar "${notification.experience?.name || "uma experiência"}" com você.`
        : `Você ${notification.status === "accepted" ? "aceitou" : "recusou"} "${notification.experience?.name || "uma experiência"}".`;

    item.append(title, description);

    if (notification.status === "pending") {
      const acceptButton = document.createElement("button");
      const declineButton = document.createElement("button");

      actions.className = "notification-actions";
      acceptButton.className = "submit-button";
      acceptButton.type = "button";
      acceptButton.textContent = "Aceitar";
      acceptButton.addEventListener("click", () => respondToShare(notification, true));

      declineButton.className = "secondary-button";
      declineButton.type = "button";
      declineButton.textContent = "Recusar";
      declineButton.addEventListener("click", () => respondToShare(notification, false));

      actions.append(acceptButton, declineButton);
      item.appendChild(actions);
    }

    notificationsList.appendChild(item);
  });
}

async function respondToShare(notification, accepted) {
  if (!isAuthenticated()) return;

  try {
    if (accepted) {
      const acceptedPerson = {
        uid: currentUser.uid,
        username: getCurrentUsername(),
        name: profileSettings.name || currentUser.displayName || currentUser.email,
        status: "accepted",
      };
      const sharedWith = mergeSharedPeople(notification.sharedWith || notification.experience?.sharedWith || [], acceptedPerson);
      const sharedParticipantUids = [...new Set([...(notification.sharedParticipantUids || []), currentUser.uid])];

      await addDoc(experiencesRef(), {
        ...notification.experience,
        shared: true,
        sharedGroupId: notification.sharedGroupId,
        sharedOwnerUid: notification.sharedOwnerUid || notification.fromUid,
        sharedParticipantUids,
        sharedWith,
        sharedAcceptedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (notification.fromUid && notification.experienceId) {
        await updateDoc(doc(db, "users", notification.fromUid, "experiences", notification.experienceId), {
          sharedParticipantUids,
          sharedWith,
          updatedAt: serverTimestamp(),
        });
      }
    }

    await updateDoc(doc(db, "users", currentUser.uid, "notifications", notification.id), {
      status: accepted ? "accepted" : "declined",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    notificationsList.innerHTML = `<p class="settings-message error">${getFriendlyFirebaseError(error)}</p>`;
  }
}

async function findSharedExperienceCopies(experience) {
  if (!experience.sharedGroupId || !experience.sharedParticipantUids?.length) return [];

  const participantUids = experience.sharedParticipantUids.filter((uid) => uid && uid !== currentUser.uid);
  const copySnapshots = await Promise.all(
    participantUids.map(async (uid) => {
      const snapshot = await getDocs(
        query(
          collection(db, "users", uid, "experiences"),
          where("sharedGroupId", "==", experience.sharedGroupId),
        ),
      );

      return snapshot.docs.map((docSnapshot) => ({
        uid,
        id: docSnapshot.id,
      }));
    }),
  );

  return copySnapshots.flat();
}

async function syncSharedExperience(experience, experienceData) {
  if (!experience.sharedGroupId || !experience.sharedParticipantUids?.length) return;

  const copies = await findSharedExperienceCopies(experience);

  await Promise.all(
    copies.map((copy) =>
      updateDoc(doc(db, "users", copy.uid, "experiences", copy.id), {
        ...experienceData,
        shared: true,
        sharedGroupId: experience.sharedGroupId,
        sharedOwnerUid: experience.sharedOwnerUid || currentUser.uid,
        sharedParticipantUids: experience.sharedParticipantUids,
        sharedWith: experience.sharedWith || [],
        updatedAt: serverTimestamp(),
      }),
    ),
  );
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

  if (!category) {
    setFormMessage("Digite o nome da nova categoria.", true);
    customCategoryInput.focus();
    return;
  }

  addCategoryButton.disabled = true;
  setFormMessage("");

  try {
    if (!isCustomCategory(type, category) && !getCategoriesForType(type).includes(category)) {
      const temporaryId = `temp-${Date.now()}`;
      customCategories = [
        ...customCategories,
        {
          id: temporaryId,
          name: category,
          type,
          typeKey,
        },
      ];
      customCategoryInput.value = "";
      populateCategorySelect(categoryInput, type, category);
      setFormMessage("Categoria adicionada. Salvando...");

      const categoryData = {
        name: category,
        type,
        typeKey,
        createdAt: serverTimestamp(),
      };
      const categoryDoc = await createDocumentWithFallback(
        addDoc(customCategoriesRef(), categoryData),
        `users/${currentUser.uid}/customCategories`,
        categoryData,
      );

      customCategories = customCategories.map((item) =>
        item.id === temporaryId ? { ...item, id: categoryDoc.id } : item,
      );
      setFormMessage("Categoria salva.");
    } else {
      customCategoryInput.value = "";
      populateCategorySelect(categoryInput, type, category);
      setFormMessage("Categoria selecionada.");
    }
  } catch (error) {
    customCategories = customCategories.filter((item) => item.name !== category || item.typeKey !== typeKey);
    populateCategorySelect(categoryInput, type, "__other__");
    setFormMessage(getFriendlyFirebaseError(error), true);
  } finally {
    addCategoryButton.disabled = false;
  }
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
  showSettingsPanel("profile");
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

notificationButton.addEventListener("click", () => {
  if (!isAuthenticated()) return;

  renderNotifications();
  notificationsModal.classList.remove("hidden");
});

closeNotificationsButton.addEventListener("click", () => {
  notificationsModal.classList.add("hidden");
});

notificationsModal.addEventListener("click", (event) => {
  if (event.target === notificationsModal) notificationsModal.classList.add("hidden");
});

settingsTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showSettingsPanel(tab.dataset.settingsTab);
  });
});

themeToggleButton.addEventListener("click", async () => {
  if (!isAuthenticated()) return;

  const theme = getActiveTheme() === "dark" ? "light" : "dark";

  profileSettings = {
    ...profileSettings,
    theme,
  };
  applyTheme(theme);

  try {
    await setDoc(
      settingsDocRef("profile"),
      {
        ...profileSettings,
        theme,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    settingsMessage.textContent = getFriendlyFirebaseError(error);
    settingsMessage.classList.add("error");
  }
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
        theme: getActiveTheme(),
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

  if (!name || !category || category === "__other__" || !date) {
    setFormMessage("Preencha nome, categoria e data antes de registrar.", true);
    return;
  }

  submitButton.disabled = true;
  setFormMessage("");
  submitLabel.textContent = selectedPhotos.length
    ? editingId
      ? "Salvando..."
      : "Registrando..."
    : "Buscando foto...";

  let saved = false;

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
      const editedId = editingId;
      const originalExperience = experiences.find((experience) => experience.id === editedId);
      await updateDocumentWithFallback(
        updateDoc(doc(db, "users", currentUser.uid, "experiences", editedId), experienceData),
        `users/${currentUser.uid}/experiences/${editedId}`,
        experienceData,
      );
      if (originalExperience?.sharedGroupId) {
        await syncSharedExperience(originalExperience, experienceData);
      }
      experiences = experiences.map((experience) =>
        experience.id === editedId ? { ...experience, ...experienceData } : experience,
      );
    } else {
      const createdExperience = await createDocumentWithFallback(addDoc(experiencesRef(), {
        ...experienceData,
        createdAt: serverTimestamp(),
      }), `users/${currentUser.uid}/experiences`, {
        ...experienceData,
        createdAt: serverTimestamp(),
      });
      experiences = [
        {
          id: createdExperience.id,
          ...experienceData,
          createdAt: new Date().toISOString(),
        },
        ...experiences,
      ];
    }

    resetFormState();
    renderExperiences();
    nameInput.focus();
    saved = true;
  } catch (error) {
    setFormMessage(getFriendlyFirebaseError(error), true);
  } finally {
    submitButton.disabled = false;
    if (!saved) {
      submitLabel.textContent = editingId ? "Salvar alterações" : "Registrar experiência";
    }
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
    notifications = [];
    profileSettings = {};
    heroSettings = {};
    applyAuthState();
    applyProfileSettings();
    applyHeroSettings();
    renderNotifications();
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
    loadUserDataFromRest().catch((restError) => {
      emptyState.textContent = getFriendlyFirebaseError(restError);
    });
  }
});

populateCategorySelect(categoryInput, getSelectedType());
populateCategoryFilter();
dateInput.value = getToday();
paintStars(selectedRating);
