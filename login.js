import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const loginTab = document.querySelector("#loginTab");
const signupTab = document.querySelector("#signupTab");
const formTitle = document.querySelector("#formTitle");
const nameField = document.querySelector("#nameField");
const lastNameField = document.querySelector("#lastNameField");
const usernameField = document.querySelector("#usernameField");
const confirmPasswordField = document.querySelector("#confirmPasswordField");
const birthDateField = document.querySelector("#birthDateField");
const authName = document.querySelector("#authName");
const authLastName = document.querySelector("#authLastName");
const authUsername = document.querySelector("#authUsername");
const authEmail = document.querySelector("#authEmail");
const loginIdentifierLabel = document.querySelector("#loginIdentifierLabel");
const authPassword = document.querySelector("#authPassword");
const authConfirmPassword = document.querySelector("#authConfirmPassword");
const authBirthDate = document.querySelector("#authBirthDate");
const passwordMatchMessage = document.querySelector("#passwordMatchMessage");
const authSubmit = document.querySelector("#authSubmit");
const authSubmitLabel = document.querySelector("#authSubmitLabel");
const authMessage = document.querySelector("#authMessage");
const loginForm = document.querySelector("#loginForm");
const confirmationBox = document.querySelector("#confirmationBox");
const confirmationText = document.querySelector("#confirmationText");
const resendVerificationButton = document.querySelector("#resendVerificationButton");
const resetPasswordButton = document.querySelector("#resetPasswordButton");

let mode = "login";
let pendingVerificationUser = null;
let verificationTimer = null;

const productionLoginUrl = "https://demarco98.github.io/Diario-de-experiencias/login.html?verified=1";
const verificationActionSettings = {
  url: window.location.protocol === "file:"
    ? productionLoginUrl
    : `${window.location.origin}${window.location.pathname}?verified=1`,
  handleCodeInApp: false,
};

function setMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
}

function getFriendlyError(error) {
  const messages = {
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "A chave do Firebase esta invalida. Preencha o firebase-config.js com os dados reais do seu projeto.",
    "auth/configuration-not-found": "O Firebase Authentication nao esta configurado. Ative o provedor E-mail/senha no Firebase Console.",
    "auth/email-already-in-use": "Este e-mail ja esta cadastrado.",
    "auth/invalid-email": "Digite um e-mail valido.",
    "auth/invalid-api-key": "A chave do Firebase esta invalida. Confira o firebase-config.js.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/network-request-failed": "Nao foi possivel conectar ao Firebase. Verifique a internet e a configuracao do projeto.",
    "auth/operation-not-allowed": "O login por e-mail e senha nao esta ativado no Firebase Authentication.",
    "auth/unauthorized-domain": "Este dominio nao esta autorizado no Firebase. Adicione demarco98.github.io em Authentication > Settings > Authorized domains.",
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
    "auth/missing-password": "Digite sua senha.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente em alguns minutos.",
    "permission-denied": "Sem permissao no Firestore. Publique as regras de seguranca do arquivo firestore.rules no Firebase Console.",
  };

  return messages[error.code] || `Nao foi possivel concluir. Detalhe: ${error.code || error.message}`;
}

function setMode(nextMode) {
  mode = nextMode;
  const isSignup = mode === "signup";

  loginTab.classList.toggle("active", !isSignup);
  signupTab.classList.toggle("active", isSignup);
  nameField.classList.toggle("hidden", !isSignup);
  lastNameField.classList.toggle("hidden", !isSignup);
  usernameField.classList.toggle("hidden", !isSignup);
  confirmPasswordField.classList.toggle("hidden", !isSignup);
  birthDateField.classList.toggle("hidden", !isSignup);
  confirmationBox.classList.add("hidden");
  authName.required = isSignup;
  authLastName.required = isSignup;
  authUsername.required = isSignup;
  authConfirmPassword.required = isSignup;
  authBirthDate.required = isSignup;
  loginIdentifierLabel.textContent = isSignup ? "E-mail" : "E-mail ou nome de usuário";
  authEmail.placeholder = isSignup ? "" : "email@exemplo.com ou usuario";
  formTitle.textContent = isSignup ? "Criar conta" : "Login";
  authSubmitLabel.textContent = isSignup ? "Criar conta" : "Entrar";
  authPassword.autocomplete = isSignup ? "new-password" : "current-password";
  resetPasswordButton.classList.toggle("hidden", isSignup);
  updatePasswordMatchMessage();
  setMessage("");
}

function normalizeUsername(username) {
  return username
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

function validateUsername(username) {
  if (username.length < 3) return "Use um nome de usuário com pelo menos 3 caracteres.";
  if (username.length > 24) return "Use um nome de usuário com até 24 caracteres.";
  if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(username)) {
    return "O usuário deve começar e terminar com letra ou número.";
  }

  return "";
}

function syncModeUrl() {
  const url = mode === "signup" ? "./login.html?mode=signup" : "./login.html";
  window.history.replaceState({}, document.title, url);
}

function getSignupProfile() {
  const firstName = authName.value.trim();
  const lastName = authLastName.value.trim();
  const username = normalizeUsername(authUsername.value);

  return {
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    username,
    birthDate: authBirthDate.value,
  };
}

async function createUserProfile(user, profile = {}) {
  const fallbackName = user.displayName || user.email?.split("@")[0] || "";
  const name = profile.name || fallbackName;
  const userData = {
    uid: user.uid,
    name,
    email: user.email,
    emailVerified: user.emailVerified,
    updatedAt: serverTimestamp(),
  };
  const profileData = {
    name,
    email: user.email,
    updatedAt: serverTimestamp(),
  };

  if (profile.firstName !== undefined) {
    userData.firstName = profile.firstName;
    profileData.firstName = profile.firstName;
  }

  if (profile.lastName !== undefined) {
    userData.lastName = profile.lastName;
    profileData.lastName = profile.lastName;
  }

  if (profile.birthDate !== undefined) {
    userData.birthDate = profile.birthDate;
    profileData.birthDate = profile.birthDate;
  }

  if (profile.username !== undefined) {
    userData.username = profile.username;
    profileData.username = profile.username;
  }

  await setDoc(
    doc(db, "users", user.uid),
    {
      ...userData,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    doc(db, "users", user.uid, "settings", "profile"),
    {
      ...profileData,
    },
    { merge: true },
  );
}

function showVerificationBox(email) {
  confirmationText.textContent =
    `Enviamos um e-mail de confirmacao para ${email}. Estamos aguardando a confirmacao para liberar o login. Se nao encontrar o e-mail, confira tambem a caixa de spam ou lixo eletronico. Se o link nao aparecer clicavel, copie e cole o endereco do e-mail no navegador.`;
  confirmationBox.classList.remove("hidden");
}

async function saveUsernameLookup(user, profile) {
  await setDoc(doc(db, "usernames", profile.username), {
    uid: user.uid,
    email: user.email,
    username: profile.username,
    name: profile.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function resolveLoginEmail(identifier) {
  const value = identifier.trim().toLowerCase();

  if (value.includes("@")) return value;

  const username = normalizeUsername(value);
  const validationMessage = validateUsername(username);

  if (validationMessage) {
    throw new Error("Digite um e-mail válido ou um nome de usuário válido.");
  }

  const usernameSnapshot = await getDoc(doc(db, "usernames", username));

  if (!usernameSnapshot.exists()) {
    throw new Error("Nome de usuário não encontrado.");
  }

  return usernameSnapshot.data().email;
}

function stopVerificationWatcher() {
  if (verificationTimer) window.clearInterval(verificationTimer);
  verificationTimer = null;
}

function startVerificationWatcher(user) {
  stopVerificationWatcher();

  verificationTimer = window.setInterval(async () => {
    try {
      await user.reload();

      if (!user.emailVerified) return;

      stopVerificationWatcher();
      await signOut(auth);
      window.location.href = "./login.html?verified=1";
    } catch (error) {
      console.warn("Nao foi possivel verificar a confirmacao do e-mail.", error);
    }
  }, 4000);
}

function applyInitialMessage() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("mode") === "signup") {
    setMode("signup");
  }

  if (params.get("verified") === "1") {
    setMode("login");
    setMessage("E-mail confirmado. Agora entre com seu e-mail e senha.");
    window.history.replaceState({}, document.title, "./login.html");
  }
}

function updatePasswordMatchMessage() {
  if (mode !== "signup") {
    passwordMatchMessage.textContent = "";
    passwordMatchMessage.classList.remove("valid", "invalid");
    return true;
  }

  const password = authPassword.value;
  const confirmPassword = authConfirmPassword.value;

  if (!password && !confirmPassword) {
    passwordMatchMessage.textContent = "";
    passwordMatchMessage.classList.remove("valid", "invalid");
    return false;
  }

  const matches = password === confirmPassword;
  passwordMatchMessage.textContent = matches ? "As senhas correspondem" : "As senhas n\u00e3o correspondem";
  passwordMatchMessage.classList.toggle("valid", matches);
  passwordMatchMessage.classList.toggle("invalid", !matches);

  return matches;
}

loginTab.addEventListener("click", () => {
  setMode("login");
  syncModeUrl();
});

signupTab.addEventListener("click", () => {
  setMode("signup");
  syncModeUrl();
});

document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.querySelector(`#${button.dataset.target}`);
    const isPassword = input.type === "password";

    input.type = isPassword ? "text" : "password";
    button.classList.toggle("active", isPassword);
    button.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Visualizar senha");
  });
});

[authPassword, authConfirmPassword].forEach((input) => {
  input.addEventListener("input", updatePasswordMatchMessage);
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const identifier = authEmail.value.trim().toLowerCase();
  const password = authPassword.value;
  const confirmPassword = authConfirmPassword.value;
  const profile = getSignupProfile();

  if (!identifier || !password || (mode === "signup" && (!profile.firstName || !profile.lastName || !profile.username || !profile.birthDate))) return;

  if (mode === "signup" && !updatePasswordMatchMessage()) {
    authConfirmPassword.focus();
    return;
  }

  if (mode === "signup") {
    const usernameMessage = validateUsername(profile.username);

    if (usernameMessage) {
      setMessage(usernameMessage, true);
      authUsername.focus();
      return;
    }
  }

  authSubmit.disabled = true;

  try {
    const email = mode === "signup" ? identifier : await resolveLoginEmail(identifier);

    if (mode === "signup") {
      const usernameSnapshot = await getDoc(doc(db, "usernames", profile.username));

      if (usernameSnapshot.exists()) {
        setMessage("Este nome de usuário já está em uso.", true);
        authUsername.focus();
        return;
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(credential.user, { displayName: profile.name });
      await sendEmailVerification(credential.user, verificationActionSettings);
      await saveUsernameLookup(credential.user, profile);
      pendingVerificationUser = credential.user;
      startVerificationWatcher(credential.user);

      authPassword.value = "";
      authConfirmPassword.value = "";
      setMessage("Conta criada. Enviamos o e-mail e estamos aguardando a confirmacao. Confira tambem o spam se nao encontrar.");
      showVerificationBox(email);

      createUserProfile(credential.user, profile).catch((profileError) => {
        console.warn("Perfil sera criado apos login verificado.", profileError);
      });
      return;
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (!credential.user.emailVerified) {
      pendingVerificationUser = credential.user;
      await sendEmailVerification(credential.user, verificationActionSettings);
      await signOut(auth);
      setMessage("Seu e-mail ainda nao foi confirmado.", true);
      showVerificationBox(email);
      return;
    }

    await createUserProfile(credential.user, { name: credential.user.displayName || email.split("@")[0] });
    setMessage("Login realizado. Voltando para o app...");
    window.setTimeout(() => {
      window.location.href = "./index.html";
    }, 500);
  } catch (error) {
    setMessage(getFriendlyError(error), true);
  } finally {
    authSubmit.disabled = false;
  }
});

resetPasswordButton.addEventListener("click", async () => {
  const identifier = authEmail.value.trim().toLowerCase();

  if (!identifier) {
    setMessage("Digite seu e-mail ou usuário para receber a recuperacao de senha.", true);
    return;
  }

  try {
    const email = await resolveLoginEmail(identifier);

    await sendPasswordResetEmail(auth, email);
    setMessage("Enviamos o e-mail de recuperacao de senha.");
  } catch (error) {
    setMessage(getFriendlyError(error), true);
  }
});

resendVerificationButton.addEventListener("click", async () => {
  if (!pendingVerificationUser) {
    setMessage("Faça login novamente para reenviar a confirmacao.", true);
    return;
  }

  try {
    await sendEmailVerification(pendingVerificationUser, verificationActionSettings);
    setMessage("Enviamos outro e-mail de confirmacao.");
  } catch (error) {
    setMessage(getFriendlyError(error), true);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user?.emailVerified && mode === "login" && !new URLSearchParams(window.location.search).has("mode")) {
    window.location.href = "./index.html";
    return;
  }

  if (user && !user.emailVerified && mode === "signup") {
    pendingVerificationUser = user;
    startVerificationWatcher(user);
  }
});

applyInitialMessage();
