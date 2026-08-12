/* ============ Zola — login ============
   Uses ONLY the Supabase anon key. On success, redirects to admin/. */

const SUPABASE_URL = "https://caclaqpyfspkarpzfpxu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhY2xhcXB5ZnNwa2FycHpmcHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODIzOTgsImV4cCI6MjEwMTg1ODM5OH0.Uyh-aUM0BWdaCOtoOmf0ofFJTG6399QhQh6S-C-Qcz4";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

/* ---------- i18n ---------- */
const I18N = {
  ar: {
    pageTitle: "Zola — تسجيل الدخول",
    title: "لوحة التحكم",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    submit: "تسجيل الدخول",
    note: "لا يوجد تسجيل عمومي — الحسابات تُنشأ يدويًا من Supabase.",
    error: "بيانات الدخول غير صحيحة",
  },
  fr: {
    pageTitle: "Zola — Connexion",
    title: "Tableau de bord",
    email: "Adresse e-mail",
    password: "Mot de passe",
    submit: "Se connecter",
    note: "Pas d'inscription publique — les comptes sont créés manuellement depuis Supabase.",
    error: "Identifiants incorrects",
  },
  en: {
    pageTitle: "Zola — Login",
    title: "Admin dashboard",
    email: "Email address",
    password: "Password",
    submit: "Log in",
    note: "No public signup — accounts are created manually in Supabase.",
    error: "Invalid login credentials",
  },
};

let LOCALE = localStorage.getItem("zola_admin_locale") || "ar";

function applyLocale() {
  document.documentElement.lang = LOCALE;
  document.documentElement.dir = LOCALE === "ar" ? "rtl" : "ltr";
  localStorage.setItem("zola_admin_locale", LOCALE);

  document.querySelectorAll(".lang-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.lang === LOCALE));

  const dict = I18N[LOCALE];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = dict[el.dataset.i18n];
    if (v) el.textContent = v;
  });
  $("pageTitle").textContent = dict.pageTitle;
}

document.querySelectorAll(".lang-btn").forEach((b) =>
  b.addEventListener("click", () => { LOCALE = b.dataset.lang; applyLocale(); }));

applyLocale();

// Already logged in? skip straight to the dashboard.
db.auth.getSession().then(({ data: { session } }) => {
  if (session) location.replace("../admin/");
});

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("loginBtn");
  btn.disabled = true;
  $("loginError").hidden = true;

  const { error } = await db.auth.signInWithPassword({
    email: $("loginEmail").value.trim(),
    password: $("loginPass").value,
  });

  if (error) {
    btn.disabled = false;
    $("loginError").textContent = I18N[LOCALE].error;
    $("loginError").hidden = false;
    return;
  }
  location.replace("../admin/");
});
