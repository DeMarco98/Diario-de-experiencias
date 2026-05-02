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
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const loginTab = document.querySelector("#loginTab");
const signupTab = document.querySelector("#signupTab");
const formTitle = document.querySelector("#formTitle");
const nameField = document.querySelector("#nameField");
const authName = document.querySelector("#authName");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
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
  confirmationBox.classList.add("hidden");
  authName.required = isSignup;
  formTitle.textContent = isSignup ? "Criar conta" : "Login";
  authSubmitLabel.textContent = isSignup ? "Criar conta" : "Entrar";
  authPassword.autocomplete = isSignup ? "new-password" : "current-password";
  resetPasswordButton.classList.toggle("hidden", isSignup);
  setMessage("");
}

async function createUserProfile(user, name) {
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    doc(db, "users", user.uid, "settings", "profile"),
    {
      name,
      email: user.email,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function showVerificationBox(email) {
  confirmationText.textContent =
    `Enviamos um e-mail de confirmacao para ${email}. Confirme o e-mail antes de entrar no app.`;
  confirmationBox.classList.remove("hidden");
}

loginTab.addEventListener("click", () => setMode("login"));
signupTab.addEventListener("click", () => setMode("signup"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = authEmail.value.trim().toLowerCase();
  const password = authPassword.value;
  const name = authName.value.trim();

  if (!email || !password || (mode === "signup" && !name)) return;

  authSubmit.disabled = true;

  try {
    if (mode === "signup") {
      const credential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(credential.user, { displayName: name });
      await sendEmailVerification(credential.user);
      try {
        await createUserProfile(credential.user, name);
      } catch (profileError) {
        console.warn("Perfil sera criado apos login verificado.", profileError);
      }
      pendingVerificationUser = credential.user;
      await signOut(auth);

      authPassword.value = "";
      setMessage("Conta criada. Confirme seu e-mail para acessar.");
      showVerificationBox(email);
      return;
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (!credential.user.emailVerified) {
      pendingVerificationUser = credential.user;
      await sendEmailVerification(credential.user);
      await signOut(auth);
      setMessage("Seu e-mail ainda nao foi confirmado.", true);
      showVerificationBox(email);
      return;
    }

    await createUserProfile(credential.user, credential.user.displayName || email.split("@")[0]);
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
  const email = authEmail.value.trim().toLowerCase();

  if (!email) {
    setMessage("Digite seu e-mail para receber a recuperacao de senha.", true);
    return;
  }

  try {
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
    await sendEmailVerification(pendingVerificationUser);
    setMessage("Enviamos outro e-mail de confirmacao.");
  } catch (error) {
    setMessage(getFriendlyError(error), true);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user?.emailVerified) {
    window.location.href = "./index.html";
  }
});
