(() => {
  const CREDENTIAL_KEY = "rtcPortfolioOwnerCredentialsV1";
  const SESSION_KEY = "rtcPortfolioAdminSessionV1";
  const SESSION_DURATION = 2 * 60 * 60 * 1000;
  const byId = (id) => document.getElementById(id);
  const remote = Boolean(window.portfolioDb?.isConfigured());
  let credentials = loadCredentials();
  const isSetup = !remote && !credentials;

  function loadCredentials() {
    try {
      const value = JSON.parse(localStorage.getItem(CREDENTIAL_KEY));
      return value?.salt && value?.hash ? value : null;
    } catch {
      return null;
    }
  }

  function bytesToBase64(bytes) {
    let binary = "";
    bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
    return btoa(binary);
  }

  function base64ToBytes(value) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  }

  async function deriveHash(password, salt) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: 150000 },
      material,
      256,
    );
    return bytesToBase64(new Uint8Array(bits));
  }

  function setError(message) {
    byId("formError").textContent = message;
  }

  function startSession() {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ expiresAt: Date.now() + SESSION_DURATION }));
    window.location.replace("admin.html");
  }

  if (remote) {
    byId("emailGroup").hidden = false;
    byId("email").required = true;
    byId("formKicker").textContent = "Secure database access";
    byId("formTitle").textContent = "Owner sign in";
    byId("formDescription").textContent = "Use the portfolio owner account registered in Supabase.";
    byId("loginSubmit").textContent = "Sign in to studio";
    byId("securityNote").textContent = "Authentication and permissions are enforced by Supabase Auth and database security policies.";
  } else if (isSetup) {
    byId("formKicker").textContent = "First-time setup";
    byId("formTitle").textContent = "Create owner access";
    byId("formDescription").textContent = "Choose a password for this browser's private Content Studio.";
    byId("password").autocomplete = "new-password";
    byId("confirmGroup").hidden = false;
    byId("confirmPassword").required = true;
    byId("loginSubmit").textContent = "Create password";
    byId("securityNote").textContent = "Use at least 8 characters. The password cannot be recovered, so keep a private copy.";
  }

  byId("togglePassword").addEventListener("click", () => {
    const input = byId("password");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    byId("togglePassword").textContent = show ? "Hide" : "Show";
    byId("togglePassword").setAttribute("aria-label", show ? "Hide password" : "Show password");
  });

  byId("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setError("");
    const password = byId("password").value;
    const submit = byId("loginSubmit");
    if (!password) return setError("Enter your password.");
    if (!remote && password.length < 8) return setError("Use at least 8 characters.");
    submit.disabled = true;

    try {
      if (remote) {
        await window.portfolioDb.signIn(byId("email").value.trim(), password);
        if (!(await window.portfolioDb.isAdmin())) {
          await window.portfolioDb.signOut();
          throw new Error("This account is not authorized to manage the portfolio.");
        }
        window.location.replace("admin.html");
        return;
      }

      if (isSetup) {
        if (password !== byId("confirmPassword").value) throw new Error("Passwords do not match.");
        const salt = crypto.getRandomValues(new Uint8Array(16));
        credentials = { salt: bytesToBase64(salt), hash: await deriveHash(password, salt) };
        localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(credentials));
        startSession();
        return;
      }

      const candidate = await deriveHash(password, base64ToBytes(credentials.salt));
      if (candidate !== credentials.hash) throw new Error("Incorrect password. Please try again.");
      startSession();
    } catch (error) {
      setError(error.message || "Owner access could not be verified.");
      submit.disabled = false;
      byId("password").select();
    }
  });
})();
