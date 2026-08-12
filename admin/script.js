/* ============ Zola — admin dashboard ============
   Uses ONLY the Supabase anon key + the logged-in admin's session.
   RLS gives `authenticated` users write access; signup is disabled,
   so only manually-created admins can log in. */

const SUPABASE_URL = "https://caclaqpyfspkarpzfpxu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhY2xhcXB5ZnNwa2FycHpmcHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODIzOTgsImV4cCI6MjEwMTg1ODM5OH0.Uyh-aUM0BWdaCOtoOmf0ofFJTG6399QhQh6S-C-Qcz4";

const CLOUDINARY_CLOUD = "gcjqhpfk";
const CLOUDINARY_PRESET = "maison confort";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

let WILAYAS = [];
let COMMUNE_NAMES = {}; // commune_id -> {ar, latin}

/* ================= i18n ================= */
const I18N = {
  ar: {
    pageTitle: "Zola — لوحة التحكم",
    tab_orders: "الطلبات", tab_stock: "المخزون", tab_content: "المحتوى",
    tab_delivery: "التوصيل", tab_settings: "الإعدادات", logout: "خروج",
    status_all: "كل الحالات", status_pending: "قيد الانتظار", status_confirmed: "مؤكد",
    status_shipped: "تم الشحن", status_delivered: "تم التسليم", status_cancelled: "ملغى",
    order_search_ph: "بحث بالاسم أو الهاتف…", refresh: "تحديث",
    col_name: "الاسم", col_phone: "الهاتف", col_location: "الولاية / البلدية",
    col_qty: "الكمية", col_total: "المجموع", col_delivery: "التوصيل",
    col_status: "الحالة", col_date: "التاريخ", no_orders: "لا توجد طلبات.",
    home: "منزل", desk: "مكتب",
    content_hint: "كل نصوص وصور صفحة الهبوط. عدّل ثم اضغط «حفظ» لكل عنصر.",
    delivery_hint: "أسعار التوصيل لكل ولاية (دج). «مكتب» = stopdesk. لإزالة ولاية من الموقع اضغط «حذف» في صفها — تختفي فورًا من نموذج الطلب ويمكن استعادتها في أي وقت.",
    save_all: "حفظ كل التغييرات",
    col_wilaya: "الولاية", col_home_fee: "سعر المنزل", col_desk_fee: "سعر المكتب", col_desk_avail: "مكتب متاح؟",
    fraud_title: "الحماية من الطلبات الوهمية",
    dedup_label: "منع تكرار نفس الهاتف خلال (دقائق)",
    rate_label: "أقصى عدد طلبات لكل IP في الساعة",
    store_info_title: "معلومات المتجر", store_phone_label: "هاتف المتجر (يظهر للزبائن)",
    save_settings: "حفظ الإعدادات",
    telegram_hint: "تحقّق أن البوت يرسل الإشعارات بشكل صحيح.", telegram_test: "إرسال رسالة تجريبية",
    login_wrong: "بيانات الدخول غير صحيحة",
    saving: "…", saved_ok: "✔ تم الحفظ", saved_err: "✖ فشل الحفظ",
    low_stock_warn: (n) => `⚠ المخزون منخفض: ${n}`,
    price_label: "السعر (دج)", stock_label: "المخزون", low_label: "حد التنبيه", active_label: "ظاهر في الموقع",
    yes: "نعم", no: "لا",
    name_ar: "الاسم AR", name_fr: "الاسم FR", name_en: "الاسم EN",
    desc_ar: "الوصف AR", desc_fr: "الوصف FR", desc_en: "الوصف EN",
    product_images: "صور المنتج", add_image: "+ إضافة صورة (Cloudinary)", save: "حفظ", delete_img: "حذف",
    lang_ar: "العربية", lang_fr: "Français", lang_en: "English",
    change_image: "تغيير الصورة ⬆ (Cloudinary)", image_suffix: "(صورة)",
    video_suffix: "(فيديو)", no_video: "لا يوجد فيديو", upload_video: "رفع فيديو ⬆ (Cloudinary)",
    remove_video: "حذف الفيديو", confirm_remove_video: "حذف الفيديو؟ سيختفي قسم الفيديو من صفحة الهبوط.",
    video_hint: "إن لم يوجد فيديو أو تم حذفه، يختفي القسم بالكامل من صفحة الهبوط تلقائيًا.",
    stat_suffix: "(رقم إحصائي)", stat_number_label: "الرقم", stat_suffix_label: "لاحقة (مثل + أو %)",
    faq_suffix: "(سؤال شائع)", faq_hint: "اترك السؤال فارغًا في كل اللغات لإخفاء هذا العنصر من صفحة الهبوط.",
    faq_q_ph: "السؤال…", faq_a_ph: "الجواب…",
    discount_title: "التخفيض", discount_percent_label: "نسبة التخفيض (%)",
    discount_hint: "اتركه ٠ لتعطيل التخفيض. يُطبَّق على السعر الأساسي عند عدم بلوغ أي حد كمية أدناه.",
    tiers_title: "أسعار الكمية (اشترِ أكثر بسعر أقل)",
    tiers_hint: "مثال: كمية ٢ → ٤٥٠٠ دج للوحدة. عند بلوغ الكمية هذا الحد، يُطبَّق هذا السعر بدل التخفيض العام. اتركها فارغة لتعطيل الميزة.",
    add_tier: "+ إضافة عتبة", tier_qty_label: "الكمية (على الأقل)", tier_price_label: "سعر الوحدة الواحدة",
    tier_total_preview: "= {qty} × {price} = {total} دج إجمالًا",
    bogo_title: "اشترِ X واحصل على Y مجانًا", bogo_buy_label: "الكمية المدفوعة", bogo_free_label: "الكمية المجانية",
    bogo_hint: "مثال: اشترِ ٣ واحصل على ١ مجانًا. تتكرر تلقائيًا (اشترِ ٦ = تحصل على ٢ مجانًا). لا تؤثر على السعر، فقط على الكمية المشحونة والمخزون. اترك الحقلين ٠ لتعطيلها.",
    bogo_preview: "اشترِ {buy}، احصل على {free} مجانًا ({total} في المجموع)",
    tab_account: "الحساب",
    multi_session_hint: "يمكنك تسجيل الدخول من عدة أجهزة أو متصفحات في نفس الوقت دون أن يؤثر ذلك على الجلسات الأخرى.",
    change_password_title: "تغيير كلمة المرور", current_password_label: "كلمة المرور الحالية",
    new_password_label: "كلمة المرور الجديدة", confirm_password_label: "تأكيد كلمة المرور",
    add_admin_title: "إضافة حساب مسؤول جديد",
    add_admin_hint: "أنشئ حسابًا لعضو فريق آخر ليتمكن من الدخول إلى لوحة التحكم بشكل مستقل.",
    new_admin_email_label: "البريد الإلكتروني", add_admin_btn: "إضافة الحساب",
    manage_admins_title: "الحسابات الحالية",
    col_email: "البريد الإلكتروني", col_created: "تاريخ الإنشاء", col_last_login: "آخر تسجيل دخول",
    delete_btn: "حذف", never_label: "لم يسجل دخول بعد", you_label: "(أنت)",
    pw_mismatch: "كلمتا المرور غير متطابقتين", pw_too_short: "كلمة المرور قصيرة جدًا (٨ أحرف على الأقل)",
    pw_wrong_current: "كلمة المرور الحالية غير صحيحة", pw_saved: "✔ تم تغيير كلمة المرور",
    admin_created: "✔ تم إنشاء الحساب", admin_create_failed: "✖ فشل إنشاء الحساب",
    confirm_delete_admin: "حذف هذا الحساب؟ لن يتمكن من الدخول إلى لوحة التحكم بعد الآن.",
    cannot_delete_self: "لا يمكنك حذف حسابك الخاص",
    tg_ok: "✔ وصلت الرسالة", tg_not_configured: "✖ لم يتم ضبط توكن البوت في أسرار Edge Functions",
    tg_failed: "✖ فشل الإرسال",
    col_actions: "", confirm_delete_order: "حذف هذا الطلب نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.",
    col_served: "متوفر للتوصيل؟", restore_btn: "استعادة",
    confirm_delete_wilaya: "إزالة هذه الولاية من التوصيل؟ لن تظهر بعد الآن في نموذج الطلب للزبائن. يمكنك استعادتها لاحقًا في أي وقت.",
    wilaya_not_served_badge: "غير متوفرة — مخفية عن الزبائن",
    free_delivery_title: "التوصيل المجاني", free_delivery_hint: "اختياري بالكامل — يتجاوز أسعار التوصيل لكل ولاية عند تفعيله.",
    free_delivery_all_label: "توصيل مجاني على كل الطلبات", free_delivery_threshold_label: "توصيل مجاني للطلبات التي تتجاوز (دج) — ٠ لتعطيله",
  },
  fr: {
    pageTitle: "Zola — Tableau de bord",
    tab_orders: "Commandes", tab_stock: "Stock", tab_content: "Contenu",
    tab_delivery: "Livraison", tab_settings: "Paramètres", logout: "Déconnexion",
    status_all: "Tous les statuts", status_pending: "En attente", status_confirmed: "Confirmée",
    status_shipped: "Expédiée", status_delivered: "Livrée", status_cancelled: "Annulée",
    order_search_ph: "Rechercher par nom ou téléphone…", refresh: "Actualiser",
    col_name: "Nom", col_phone: "Téléphone", col_location: "Wilaya / Commune",
    col_qty: "Qté", col_total: "Total", col_delivery: "Livraison",
    col_status: "Statut", col_date: "Date", no_orders: "Aucune commande.",
    home: "Domicile", desk: "Bureau",
    content_hint: "Tous les textes et images de la page. Modifiez puis cliquez « Enregistrer » pour chaque élément.",
    delivery_hint: "Frais de livraison par wilaya (DA). « Bureau » = stopdesk. Pour retirer une wilaya du site, cliquez « Supprimer » sur sa ligne — elle disparaît immédiatement du formulaire de commande et peut être restaurée à tout moment.",
    save_all: "Enregistrer tout",
    col_wilaya: "Wilaya", col_home_fee: "Frais domicile", col_desk_fee: "Frais bureau", col_desk_avail: "Bureau dispo ?",
    fraud_title: "Protection anti-fraude",
    dedup_label: "Bloquer le même téléphone pendant (minutes)",
    rate_label: "Max. de commandes par IP et par heure",
    store_info_title: "Informations boutique", store_phone_label: "Téléphone boutique (visible client)",
    save_settings: "Enregistrer les paramètres",
    telegram_hint: "Vérifiez que le bot envoie bien les notifications.", telegram_test: "Envoyer un test",
    login_wrong: "Identifiants incorrects",
    saving: "…", saved_ok: "✔ Enregistré", saved_err: "✖ Échec de l'enregistrement",
    low_stock_warn: (n) => `⚠ Stock faible : ${n}`,
    price_label: "Prix (DA)", stock_label: "Stock", low_label: "Seuil d'alerte", active_label: "Visible sur le site",
    yes: "Oui", no: "Non",
    name_ar: "Nom AR", name_fr: "Nom FR", name_en: "Nom EN",
    desc_ar: "Description AR", desc_fr: "Description FR", desc_en: "Description EN",
    product_images: "Images du produit", add_image: "+ Ajouter une image (Cloudinary)", save: "Enregistrer", delete_img: "Supprimer",
    lang_ar: "العربية", lang_fr: "Français", lang_en: "English",
    change_image: "Changer l'image ⬆ (Cloudinary)", image_suffix: "(image)",
    video_suffix: "(vidéo)", no_video: "Aucune vidéo", upload_video: "Téléverser une vidéo ⬆ (Cloudinary)",
    remove_video: "Supprimer la vidéo", confirm_remove_video: "Supprimer la vidéo ? La section vidéo disparaîtra de la page.",
    video_hint: "Sans vidéo (ou après suppression), la section entière disparaît automatiquement de la page.",
    stat_suffix: "(statistique)", stat_number_label: "Nombre", stat_suffix_label: "Suffixe (ex. + ou %)",
    faq_suffix: "(FAQ)", faq_hint: "Laissez la question vide dans toutes les langues pour masquer cet élément de la page.",
    faq_q_ph: "Question…", faq_a_ph: "Réponse…",
    discount_title: "Réduction", discount_percent_label: "Pourcentage de réduction (%)",
    discount_hint: "Laissez 0 pour désactiver. S'applique au prix de base tant qu'aucun palier de quantité ci-dessous n'est atteint.",
    tiers_title: "Prix par quantité (achetez plus, payez moins)",
    tiers_hint: "Exemple : quantité 2 → 4500 DA l'unité. Une fois ce seuil atteint, ce prix remplace la réduction générale. Laissez vide pour désactiver.",
    add_tier: "+ Ajouter un palier", tier_qty_label: "Quantité (à partir de)", tier_price_label: "Prix par unité",
    tier_total_preview: "= {qty} × {price} = {total} DA au total",
    bogo_title: "Achetez X, obtenez Y gratuit", bogo_buy_label: "Quantité payée", bogo_free_label: "Quantité offerte",
    bogo_hint: "Exemple : achetez 3, obtenez 1 gratuit. Se répète automatiquement (achetez 6 = 2 gratuits). N'affecte pas le prix, seulement la quantité expédiée et le stock. Laissez les deux champs à 0 pour désactiver.",
    bogo_preview: "Achetez {buy}, obtenez {free} gratuit(s) ({total} au total)",
    tab_account: "Compte",
    multi_session_hint: "Vous pouvez vous connecter depuis plusieurs appareils ou navigateurs en même temps sans affecter les autres sessions.",
    change_password_title: "Changer le mot de passe", current_password_label: "Mot de passe actuel",
    new_password_label: "Nouveau mot de passe", confirm_password_label: "Confirmer le mot de passe",
    add_admin_title: "Ajouter un compte administrateur",
    add_admin_hint: "Créez un compte pour un autre membre de l'équipe afin qu'il puisse accéder au tableau de bord de manière indépendante.",
    new_admin_email_label: "Adresse e-mail", add_admin_btn: "Ajouter le compte",
    manage_admins_title: "Comptes existants",
    col_email: "E-mail", col_created: "Créé le", col_last_login: "Dernière connexion",
    delete_btn: "Supprimer", never_label: "Jamais connecté", you_label: "(vous)",
    pw_mismatch: "Les mots de passe ne correspondent pas", pw_too_short: "Mot de passe trop court (8 caractères minimum)",
    pw_wrong_current: "Mot de passe actuel incorrect", pw_saved: "✔ Mot de passe modifié",
    admin_created: "✔ Compte créé", admin_create_failed: "✖ Échec de la création du compte",
    confirm_delete_admin: "Supprimer ce compte ? Il ne pourra plus accéder au tableau de bord.",
    cannot_delete_self: "Vous ne pouvez pas supprimer votre propre compte",
    tg_ok: "✔ Message reçu", tg_not_configured: "✖ Le token du bot n'est pas configuré dans les secrets Edge Functions",
    tg_failed: "✖ Échec de l'envoi",
    col_actions: "", confirm_delete_order: "Supprimer définitivement cette commande ? Cette action est irréversible.",
    col_served: "Livrée ?", restore_btn: "Restaurer",
    confirm_delete_wilaya: "Retirer cette wilaya de la livraison ? Elle n'apparaîtra plus dans le formulaire de commande. Vous pourrez la restaurer à tout moment.",
    wilaya_not_served_badge: "Non desservie — masquée aux clients",
    free_delivery_title: "Livraison gratuite", free_delivery_hint: "Entièrement optionnel — prime sur les frais de livraison par wilaya une fois activé.",
    free_delivery_all_label: "Livraison gratuite sur toutes les commandes", free_delivery_threshold_label: "Livraison gratuite au-delà de (DA) — 0 pour désactiver",
  },
  en: {
    pageTitle: "Zola — Admin dashboard",
    tab_orders: "Orders", tab_stock: "Stock", tab_content: "Content",
    tab_delivery: "Delivery", tab_settings: "Settings", logout: "Log out",
    status_all: "All statuses", status_pending: "Pending", status_confirmed: "Confirmed",
    status_shipped: "Shipped", status_delivered: "Delivered", status_cancelled: "Cancelled",
    order_search_ph: "Search by name or phone…", refresh: "Refresh",
    col_name: "Name", col_phone: "Phone", col_location: "Wilaya / Commune",
    col_qty: "Qty", col_total: "Total", col_delivery: "Delivery",
    col_status: "Status", col_date: "Date", no_orders: "No orders yet.",
    home: "Home", desk: "Desk",
    content_hint: "All landing-page text and images. Edit then click “Save” for each item.",
    delivery_hint: "Delivery fees per wilaya (DZD). “Desk” = stopdesk. To remove a wilaya from the site, click “Delete” on its row — it disappears from the order form immediately and can be restored anytime.",
    save_all: "Save all changes",
    col_wilaya: "Wilaya", col_home_fee: "Home fee", col_desk_fee: "Desk fee", col_desk_avail: "Desk available?",
    fraud_title: "Fraud protection",
    dedup_label: "Block same phone number for (minutes)",
    rate_label: "Max orders per IP per hour",
    store_info_title: "Store info", store_phone_label: "Store phone (shown to customers)",
    save_settings: "Save settings",
    telegram_hint: "Check the bot is sending notifications correctly.", telegram_test: "Send test message",
    login_wrong: "Invalid login credentials",
    saving: "…", saved_ok: "✔ Saved", saved_err: "✖ Save failed",
    low_stock_warn: (n) => `⚠ Low stock: ${n}`,
    price_label: "Price (DZD)", stock_label: "Stock", low_label: "Alert threshold", active_label: "Visible on site",
    yes: "Yes", no: "No",
    name_ar: "Name AR", name_fr: "Name FR", name_en: "Name EN",
    desc_ar: "Description AR", desc_fr: "Description FR", desc_en: "Description EN",
    product_images: "Product images", add_image: "+ Add image (Cloudinary)", save: "Save", delete_img: "Delete",
    lang_ar: "العربية", lang_fr: "Français", lang_en: "English",
    change_image: "Change image ⬆ (Cloudinary)", image_suffix: "(image)",
    video_suffix: "(video)", no_video: "No video", upload_video: "Upload video ⬆ (Cloudinary)",
    remove_video: "Remove video", confirm_remove_video: "Remove the video? The video section will disappear from the landing page.",
    video_hint: "With no video (or after removal), the whole section disappears from the landing page automatically.",
    stat_suffix: "(stat)", stat_number_label: "Number", stat_suffix_label: "Suffix (e.g. + or %)",
    faq_suffix: "(FAQ)", faq_hint: "Leave the question empty in every language to hide this item from the landing page.",
    faq_q_ph: "Question…", faq_a_ph: "Answer…",
    discount_title: "Discount", discount_percent_label: "Discount percentage (%)",
    discount_hint: "Leave at 0 to disable. Applies to the base price as long as no quantity tier below is reached.",
    tiers_title: "Quantity pricing (buy more, pay less)",
    tiers_hint: "Example: quantity 2 → 4500 DZD per unit. Once that quantity is reached, this price replaces the general discount. Leave empty to disable.",
    add_tier: "+ Add tier", tier_qty_label: "Quantity (at least)", tier_price_label: "Price per single unit",
    tier_total_preview: "= {qty} × {price} = {total} DZD total",
    bogo_title: "Buy X, get Y free", bogo_buy_label: "Paid quantity", bogo_free_label: "Free quantity",
    bogo_hint: "Example: buy 3, get 1 free. Repeats automatically (buy 6 = get 2 free). Doesn't affect price, only the shipped quantity and stock. Leave both fields at 0 to disable.",
    bogo_preview: "Buy {buy}, get {free} free ({total} total)",
    tab_account: "Account",
    multi_session_hint: "You can log in from multiple devices or browsers at the same time without affecting other sessions.",
    change_password_title: "Change password", current_password_label: "Current password",
    new_password_label: "New password", confirm_password_label: "Confirm new password",
    add_admin_title: "Add a new admin account",
    add_admin_hint: "Create an account for another team member so they can access the dashboard independently.",
    new_admin_email_label: "Email address", add_admin_btn: "Add account",
    manage_admins_title: "Existing accounts",
    col_email: "Email", col_created: "Created", col_last_login: "Last login",
    delete_btn: "Delete", never_label: "Never logged in", you_label: "(you)",
    pw_mismatch: "Passwords don't match", pw_too_short: "Password is too short (8 characters minimum)",
    pw_wrong_current: "Current password is incorrect", pw_saved: "✔ Password changed",
    admin_created: "✔ Account created", admin_create_failed: "✖ Failed to create account",
    confirm_delete_admin: "Delete this account? They will no longer be able to access the dashboard.",
    cannot_delete_self: "You can't delete your own account",
    tg_ok: "✔ Message delivered", tg_not_configured: "✖ Bot token not set in Edge Function secrets",
    tg_failed: "✖ Failed to send",
    col_actions: "", confirm_delete_order: "Permanently delete this order? This cannot be undone.",
    col_served: "Delivered here?", restore_btn: "Restore",
    confirm_delete_wilaya: "Remove this wilaya from delivery? It will no longer appear on the customer order form. You can restore it anytime.",
    wilaya_not_served_badge: "Not served — hidden from customers",
    free_delivery_title: "Free delivery", free_delivery_hint: "Fully optional — overrides the per-wilaya delivery fees once enabled.",
    free_delivery_all_label: "Free delivery on all orders", free_delivery_threshold_label: "Free delivery on orders over (DZD) — 0 to disable",
  },
};

let LOCALE = localStorage.getItem("zola_admin_locale") || "ar";
const t = (key) => I18N[LOCALE][key];

function applyLocale() {
  document.documentElement.lang = LOCALE;
  document.documentElement.dir = LOCALE === "ar" ? "rtl" : "ltr";
  localStorage.setItem("zola_admin_locale", LOCALE);

  document.querySelectorAll(".lang-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.lang === LOCALE));

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = I18N[LOCALE][el.dataset.i18n];
    if (typeof v === "string") el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const v = I18N[LOCALE][el.dataset.i18nPh];
    if (typeof v === "string") el.placeholder = v;
  });
  $("pageTitle").textContent = t("pageTitle");

  // re-render dynamic parts that embed translated strings / locale-aware names
  if (appLoaded) {
    loadOrders();
    loadProducts();
    loadFees();
  }
}

document.querySelectorAll(".lang-btn").forEach((b) =>
  b.addEventListener("click", () => { LOCALE = b.dataset.lang; applyLocale(); }));

function wilayaName(w) { return LOCALE === "ar" ? w.wilaya_name_arabic : w.wilaya_name_latin; }
function communeName(c) { return LOCALE === "ar" ? c.ar : c.latin; }

/* ================= auth guard =================
   No session here → bounce to the standalone login page.
   Login lives in ../login/ so it can never be skipped. */
async function initAuth() {
  applyLocale();
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.replace("../login/"); return; }
  showApp();
  db.auth.onAuthStateChange((_ev, s) => { if (!s) location.replace("../login/"); });
}

let appLoaded = false;
async function showApp() {
  $("appView").hidden = false;
  if (!appLoaded) {
    appLoaded = true;
    const { data } = await db.from("wilayas").select("*").order("wilaya_id");
    WILAYAS = data || [];
    loadOrders();
    loadProducts();
    loadContent();
    loadFees();
    loadFreeDelivery();
    loadSettings();
    loadAdmins();
  }
}

$("logoutBtn").addEventListener("click", () => db.auth.signOut());

/* ================= tabs ================= */
$("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach((tb) => tb.classList.toggle("active", tb === btn));
  document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== "tab-" + btn.dataset.tab));
});

/* ================= orders ================= */
async function loadOrders() {
  let q = db.from("orders").select("*").order("created_at", { ascending: false }).limit(300);
  const st = $("orderStatusFilter").value;
  if (st) q = q.eq("status", st);
  const { data: orders, error } = await q;
  if (error) { console.error(error); return; }

  // resolve commune names in one query
  const ids = [...new Set((orders || []).map((o) => o.commune_id))].filter((id) => !(id in COMMUNE_NAMES));
  if (ids.length) {
    const { data: cs } = await db.from("communes").select("commune_id, commune_name_arabic, commune_name_latin").in("commune_id", ids);
    (cs || []).forEach((c) => (COMMUNE_NAMES[c.commune_id] = { ar: c.commune_name_arabic, latin: c.commune_name_latin }));
  }

  const search = $("orderSearch").value.trim().toLowerCase();
  const rows = (orders || []).filter((o) =>
    !search || o.full_name.toLowerCase().includes(search) || o.phone.includes(search));

  const tbody = $("ordersTable").querySelector("tbody");
  tbody.innerHTML = "";
  $("ordersEmpty").hidden = rows.length > 0;

  const statusLabel = (s) => t("status_" + s);

  rows.forEach((o) => {
    const w = WILAYAS.find((x) => x.wilaya_id === o.wilaya_id);
    const cn = COMMUNE_NAMES[o.commune_id];
    const tr = document.createElement("tr");
    tr.className = "status-" + o.status;
    tr.innerHTML = `
      <td>#${o.id}</td>
      <td>${esc(o.full_name)}</td>
      <td dir="ltr">${esc(o.phone)}</td>
      <td>${w ? esc(wilayaName(w)) : o.wilaya_id} / ${esc(cn ? communeName(cn) : "")}${o.address ? `<br><small>${esc(o.address)}</small>` : ""}</td>
      <td>${o.quantity}</td>
      <td><b>${o.total}</b> ${LOCALE === "ar" ? "دج" : "DA"}</td>
      <td>${o.delivery_type === "home" ? t("home") : t("desk")} (${o.delivery_fee})</td>
      <td></td>
      <td><small>${new Date(o.created_at).toLocaleString(LOCALE === "ar" ? "ar-DZ" : "fr-DZ")}</small></td>
      <td></td>`;
    const sel = document.createElement("select");
    ["pending", "confirmed", "shipped", "delivered", "cancelled"].forEach((v) => {
      const op = document.createElement("option");
      op.value = v; op.textContent = statusLabel(v);
      if (v === o.status) op.selected = true;
      sel.appendChild(op);
    });
    sel.addEventListener("change", async () => {
      sel.disabled = true;
      const { error: upErr } = await db.from("orders").update({ status: sel.value }).eq("id", o.id);
      sel.disabled = false;
      if (upErr) { alert(t("saved_err")); sel.value = o.status; }
      else { o.status = sel.value; tr.className = "status-" + o.status; }
    });
    tr.children[7].appendChild(sel);
    const delBtn = document.createElement("button");
    delBtn.className = "btn-ghost btn-sm";
    delBtn.textContent = t("delete_btn");
    delBtn.addEventListener("click", async () => {
      if (!confirm(t("confirm_delete_order"))) return;
      delBtn.disabled = true;
      const { error: delErr } = await db.from("orders").delete().eq("id", o.id);
      if (delErr) { alert(t("saved_err")); delBtn.disabled = false; return; }
      tr.remove();
    });
    tr.children[9].appendChild(delBtn);
    tbody.appendChild(tr);
  });
}

$("orderStatusFilter").addEventListener("change", loadOrders);
$("orderSearch").addEventListener("input", debounce(loadOrders, 300));
$("ordersRefresh").addEventListener("click", loadOrders);

/* ================= stock / products ================= */
async function loadProducts() {
  const { data: products } = await db.from("products").select("*").order("sort_order");
  const wrap = $("productsList");
  wrap.innerHTML = "";
  (products || []).forEach((p) => wrap.appendChild(productCard(p)));
}

function productCard(p) {
  const card = document.createElement("div");
  card.className = "card";
  const low = p.stock <= p.low_stock_threshold;
  card.innerHTML = `
    <h3>${esc(p.name.ar || "")} <small dir="ltr">/ ${esc(p.name.fr || "")}</small></h3>
    ${low ? `<div class="low-warn">${t("low_stock_warn")(p.stock)}</div>` : ""}
    <div class="card-grid cols-4">
      <div class="field"><label>${t("price_label")}</label><input type="number" min="0" class="f-price" value="${p.price}" dir="ltr"></div>
      <div class="field"><label>${t("stock_label")}</label><input type="number" min="0" class="f-stock" value="${p.stock}" dir="ltr"></div>
      <div class="field"><label>${t("low_label")}</label><input type="number" min="0" class="f-low" value="${p.low_stock_threshold}" dir="ltr"></div>
      <div class="field"><label>${t("active_label")}</label><select class="f-active"><option value="true"${p.active ? " selected" : ""}>${t("yes")}</option><option value="false"${p.active ? "" : " selected"}>${t("no")}</option></select></div>
    </div>

    <div class="card discount-card">
      <h4 style="margin-bottom:.6rem">${t("discount_title")}</h4>
      <div class="card-grid cols-3">
        <div class="field">
          <label>${t("discount_percent_label")}</label>
          <input type="number" min="0" max="90" class="f-discount" value="${p.discount_percent || 0}" dir="ltr" placeholder="0">
        </div>
        <div class="field" style="grid-column: span 2; align-self:end">
          <p class="hint" style="margin:0">${t("discount_hint")}</p>
        </div>
      </div>
      <h4 style="margin:1rem 0 .5rem">${t("tiers_title")}</h4>
      <p class="hint" style="margin-bottom:.6rem">${t("tiers_hint")}</p>
      <div class="tiers-list"></div>
      <button type="button" class="btn-ghost btn-sm f-addtier">${t("add_tier")}</button>

      <h4 style="margin:1.2rem 0 .5rem">${t("bogo_title")}</h4>
      <p class="hint" style="margin-bottom:.6rem">${t("bogo_hint")}</p>
      <div class="card-grid cols-3">
        <div class="field">
          <label>${t("bogo_buy_label")}</label>
          <input type="number" min="0" class="f-bogo-buy" value="${p.bogo_buy_qty || 0}" dir="ltr" placeholder="0">
        </div>
        <div class="field">
          <label>${t("bogo_free_label")}</label>
          <input type="number" min="0" class="f-bogo-free" value="${p.bogo_free_qty || 0}" dir="ltr" placeholder="0">
        </div>
      </div>
      <div class="tier-total f-bogo-preview" style="margin-top:.5rem"></div>
    </div>

    <div class="card-grid cols-3">
      <div class="field"><label>${t("name_ar")}</label><textarea class="f-name-ar">${esc(p.name.ar || "")}</textarea></div>
      <div class="field"><label dir="ltr">${t("name_fr")}</label><textarea class="f-name-fr" dir="ltr">${esc(p.name.fr || "")}</textarea></div>
      <div class="field"><label dir="ltr">${t("name_en")}</label><textarea class="f-name-en" dir="ltr">${esc(p.name.en || "")}</textarea></div>
      <div class="field"><label>${t("desc_ar")}</label><textarea class="f-desc-ar">${esc(p.description.ar || "")}</textarea></div>
      <div class="field"><label dir="ltr">${t("desc_fr")}</label><textarea class="f-desc-fr" dir="ltr">${esc(p.description.fr || "")}</textarea></div>
      <div class="field"><label dir="ltr">${t("desc_en")}</label><textarea class="f-desc-en" dir="ltr">${esc(p.description.en || "")}</textarea></div>
    </div>
    <label style="font-weight:700; font-size:.9rem;">${t("product_images")}</label>
    <div class="prod-imgs"></div>
    <button class="btn-ghost btn-sm f-addimg">${t("add_image")}</button>
    <div style="margin-top:1rem;">
      <button class="btn-gold f-save">${t("save")}</button>
      <span class="save-status"></span>
    </div>`;

  const imgsWrap = card.querySelector(".prod-imgs");
  let images = Array.isArray(p.images) ? [...p.images] : [];
  function renderImgs() {
    imgsWrap.innerHTML = "";
    images.forEach((u, i) => {
      const box = document.createElement("div");
      box.className = "prod-img-box";
      box.innerHTML = `<img src="${esc(u)}" alt=""><button class="prod-img-del" title="${t("delete_img")}">×</button>`;
      box.querySelector("button").onclick = () => { images.splice(i, 1); renderImgs(); };
      imgsWrap.appendChild(box);
    });
  }
  renderImgs();

  card.querySelector(".f-addimg").onclick = () =>
    openCloudinary((url) => { images.push(url); renderImgs(); });

  const tiersWrap = card.querySelector(".tiers-list");
  let tiers = Array.isArray(p.qty_tiers) ? p.qty_tiers.map((t2) => ({ qty: t2.qty, price: t2.price })) : [];
  function renderTiers() {
    tiersWrap.innerHTML = "";
    tiers.forEach((tier, i) => {
      const row = document.createElement("div");
      row.className = "tier-row";
      row.innerHTML = `
        <div class="tier-field">
          <label>${t("tier_qty_label")}</label>
          <input type="number" min="2" class="tier-qty" value="${tier.qty}" dir="ltr">
        </div>
        <span class="tier-arrow">→</span>
        <div class="tier-field">
          <label>${t("tier_price_label")}</label>
          <input type="number" min="0" class="tier-price" value="${tier.price}" dir="ltr">
        </div>
        <div class="tier-total"></div>
        <button type="button" class="tier-del" title="${t("delete_img")}">×</button>`;
      const qtyInput = row.querySelector(".tier-qty");
      const priceInput = row.querySelector(".tier-price");
      const totalEl = row.querySelector(".tier-total");
      const updateTotal = () => {
        const q = Number(qtyInput.value) || 0;
        const pr = Number(priceInput.value) || 0;
        totalEl.textContent = t("tier_total_preview").replace("{qty}", q).replace("{price}", pr).replace("{total}", q * pr);
      };
      qtyInput.addEventListener("input", updateTotal);
      priceInput.addEventListener("input", updateTotal);
      updateTotal();
      row.querySelector(".tier-del").onclick = () => { tiers.splice(i, 1); renderTiers(); };
      tiersWrap.appendChild(row);
    });
  }
  renderTiers();

  card.querySelector(".f-addtier").onclick = () => {
    tiers.push({ qty: 2, price: p.price });
    renderTiers();
  };

  const bogoBuyInput = card.querySelector(".f-bogo-buy");
  const bogoFreeInput = card.querySelector(".f-bogo-free");
  const bogoPreview = card.querySelector(".f-bogo-preview");
  function updateBogoPreview() {
    const buyQty = Number(bogoBuyInput.value) || 0;
    const freeQty = Number(bogoFreeInput.value) || 0;
    if (buyQty > 0 && freeQty > 0) {
      bogoPreview.hidden = false;
      bogoPreview.textContent = t("bogo_preview")
        .replace("{buy}", buyQty).replace("{free}", freeQty).replace("{total}", buyQty + freeQty);
    } else {
      bogoPreview.hidden = true;
    }
  }
  bogoBuyInput.addEventListener("input", updateBogoPreview);
  bogoFreeInput.addEventListener("input", updateBogoPreview);
  updateBogoPreview();

  card.querySelector(".f-save").onclick = async () => {
    const status = card.querySelector(".save-status");
    status.textContent = t("saving");
    const finalTiers = [...tiersWrap.querySelectorAll(".tier-row")]
      .map((row) => ({
        qty: Number(row.querySelector(".tier-qty").value),
        price: Number(row.querySelector(".tier-price").value),
      }))
      .filter((t2) => t2.qty >= 2 && t2.price >= 0);
    const { error } = await db.from("products").update({
      price: Number(card.querySelector(".f-price").value),
      stock: Number(card.querySelector(".f-stock").value),
      low_stock_threshold: Number(card.querySelector(".f-low").value),
      active: card.querySelector(".f-active").value === "true",
      discount_percent: Math.max(0, Math.min(90, Number(card.querySelector(".f-discount").value) || 0)),
      qty_tiers: finalTiers,
      bogo_buy_qty: Math.max(0, Number(bogoBuyInput.value) || 0),
      bogo_free_qty: Math.max(0, Number(bogoFreeInput.value) || 0),
      name: {
        ar: card.querySelector(".f-name-ar").value.trim(),
        fr: card.querySelector(".f-name-fr").value.trim(),
        en: card.querySelector(".f-name-en").value.trim(),
      },
      description: {
        ar: card.querySelector(".f-desc-ar").value.trim(),
        fr: card.querySelector(".f-desc-fr").value.trim(),
        en: card.querySelector(".f-desc-en").value.trim(),
      },
      images,
    }).eq("id", p.id);
    setStatus(status, error);
    if (!error) loadProducts();
  };
  return card;
}

/* ================= content ================= */
async function loadContent() {
  const { data: rows } = await db.from("content").select("*").order("key");
  const wrap = $("contentList");
  wrap.innerHTML = "";
  (rows || []).forEach((row) => {
    if (row.key.startsWith("video_") && "url" in row.value) wrap.appendChild(videoItem(row));
    else if (row.key.startsWith("stat_") && "number" in row.value) wrap.appendChild(statItem(row));
    else if (row.key.startsWith("faq_") && "q_ar" in row.value) wrap.appendChild(faqItem(row));
    else wrap.appendChild("url" in row.value ? imageItem(row) : textItem(row));
  });
}

function textItem(row) {
  const div = document.createElement("div");
  div.className = "content-item";
  div.innerHTML = `
    <div class="key">${esc(row.key)}</div>
    <div class="tri">
      <div><span class="lang-tag">${t("lang_ar")}</span><textarea class="c-ar">${esc(row.value.ar || "")}</textarea></div>
      <div><span class="lang-tag">${t("lang_fr")}</span><textarea class="c-fr" dir="ltr">${esc(row.value.fr || "")}</textarea></div>
      <div><span class="lang-tag">${t("lang_en")}</span><textarea class="c-en" dir="ltr">${esc(row.value.en || "")}</textarea></div>
    </div>
    <div class="content-actions">
      <button class="btn-gold btn-sm">${t("save")}</button>
      <span class="save-status"></span>
    </div>`;
  div.querySelector("button").onclick = async () => {
    const status = div.querySelector(".save-status");
    status.textContent = t("saving");
    const { error } = await db.from("content").update({
      value: {
        ar: div.querySelector(".c-ar").value,
        fr: div.querySelector(".c-fr").value,
        en: div.querySelector(".c-en").value,
      },
      updated_at: new Date().toISOString(),
    }).eq("key", row.key);
    setStatus(status, error);
  };
  return div;
}

function imageItem(row) {
  const div = document.createElement("div");
  div.className = "content-item";
  div.innerHTML = `
    <div class="key">${esc(row.key)} ${t("image_suffix")}</div>
    <div class="img-item">
      ${row.value.url
        ? `<img class="img-preview" src="${esc(row.value.url)}" alt="">`
        : `<div class="img-preview empty-img">ZOLA</div>`}
      <div>
        <button class="btn-ghost btn-sm c-upload">${t("change_image")}</button>
        <span class="save-status"></span>
      </div>
    </div>`;
  div.querySelector(".c-upload").onclick = () =>
    openCloudinary(async (url) => {
      const status = div.querySelector(".save-status");
      status.textContent = t("saving");
      const { error } = await db.from("content").update({
        value: { url }, updated_at: new Date().toISOString(),
      }).eq("key", row.key);
      setStatus(status, error);
      if (!error) loadContent();
    });
  return div;
}

function videoItem(row) {
  const div = document.createElement("div");
  div.className = "content-item";
  const url = row.value.url;
  div.innerHTML = `
    <div class="key">${esc(row.key)} ${t("video_suffix")}</div>
    <div class="img-item">
      ${url
        ? `<video class="video-preview" src="${esc(url)}" muted playsinline></video>`
        : `<div class="img-preview empty-img">${t("no_video")}</div>`}
      <div>
        <button class="btn-ghost btn-sm v-upload">${t("upload_video")}</button>
        ${url ? `<button class="btn-ghost btn-sm v-remove">${t("remove_video")}</button>` : ""}
        <p class="hint" style="margin:.4rem 0 0">${t("video_hint")}</p>
        <span class="save-status"></span>
      </div>
    </div>`;
  div.querySelector(".v-upload").onclick = () =>
    openCloudinaryVideo(async (videoUrl) => {
      const status = div.querySelector(".save-status");
      status.textContent = t("saving");
      const { error } = await db.from("content").update({
        value: { url: videoUrl }, updated_at: new Date().toISOString(),
      }).eq("key", row.key);
      setStatus(status, error);
      if (!error) loadContent();
    });
  const removeBtn = div.querySelector(".v-remove");
  if (removeBtn) removeBtn.onclick = async () => {
    if (!confirm(t("confirm_remove_video"))) return;
    const status = div.querySelector(".save-status");
    status.textContent = t("saving");
    const { error } = await db.from("content").update({
      value: { url: "" }, updated_at: new Date().toISOString(),
    }).eq("key", row.key);
    setStatus(status, error);
    if (!error) loadContent();
  };
  return div;
}

function statItem(row) {
  const div = document.createElement("div");
  div.className = "content-item";
  const v = row.value;
  div.innerHTML = `
    <div class="key">${esc(row.key)} ${t("stat_suffix")}</div>
    <div class="card-grid cols-3" style="margin-bottom:.7rem">
      <div class="field"><label>${t("stat_number_label")}</label><input type="number" class="s-number" value="${Number(v.number) || 0}" dir="ltr"></div>
      <div class="field"><label>${t("stat_suffix_label")}</label><input type="text" class="s-suffix" value="${esc(v.suffix || "")}" dir="ltr" placeholder="+ / % / …"></div>
    </div>
    <div class="tri">
      <div><span class="lang-tag">${t("lang_ar")}</span><textarea class="s-ar">${esc(v.ar || "")}</textarea></div>
      <div><span class="lang-tag">${t("lang_fr")}</span><textarea class="s-fr" dir="ltr">${esc(v.fr || "")}</textarea></div>
      <div><span class="lang-tag">${t("lang_en")}</span><textarea class="s-en" dir="ltr">${esc(v.en || "")}</textarea></div>
    </div>
    <div class="content-actions">
      <button class="btn-gold btn-sm">${t("save")}</button>
      <span class="save-status"></span>
    </div>`;
  div.querySelector("button.btn-gold").onclick = async () => {
    const status = div.querySelector(".save-status");
    status.textContent = t("saving");
    const { error } = await db.from("content").update({
      value: {
        number: Number(div.querySelector(".s-number").value) || 0,
        suffix: div.querySelector(".s-suffix").value.trim(),
        ar: div.querySelector(".s-ar").value,
        fr: div.querySelector(".s-fr").value,
        en: div.querySelector(".s-en").value,
      },
      updated_at: new Date().toISOString(),
    }).eq("key", row.key);
    setStatus(status, error);
  };
  return div;
}

function faqItem(row) {
  const div = document.createElement("div");
  div.className = "content-item";
  const v = row.value;
  div.innerHTML = `
    <div class="key">${esc(row.key)} ${t("faq_suffix")}</div>
    <p class="hint" style="margin-bottom:.6rem">${t("faq_hint")}</p>
    <div class="tri">
      <div>
        <span class="lang-tag">${t("lang_ar")}</span>
        <input type="text" class="f-q-ar" value="${esc(v.q_ar || "")}" placeholder="${t("faq_q_ph")}" style="margin-bottom:.4rem">
        <textarea class="f-a-ar" placeholder="${t("faq_a_ph")}">${esc(v.a_ar || "")}</textarea>
      </div>
      <div>
        <span class="lang-tag">${t("lang_fr")}</span>
        <input type="text" class="f-q-fr" dir="ltr" value="${esc(v.q_fr || "")}" placeholder="${t("faq_q_ph")}" style="margin-bottom:.4rem">
        <textarea class="f-a-fr" dir="ltr" placeholder="${t("faq_a_ph")}">${esc(v.a_fr || "")}</textarea>
      </div>
      <div>
        <span class="lang-tag">${t("lang_en")}</span>
        <input type="text" class="f-q-en" dir="ltr" value="${esc(v.q_en || "")}" placeholder="${t("faq_q_ph")}" style="margin-bottom:.4rem">
        <textarea class="f-a-en" dir="ltr" placeholder="${t("faq_a_ph")}">${esc(v.a_en || "")}</textarea>
      </div>
    </div>
    <div class="content-actions">
      <button class="btn-gold btn-sm">${t("save")}</button>
      <span class="save-status"></span>
    </div>`;
  div.querySelector("button.btn-gold").onclick = async () => {
    const status = div.querySelector(".save-status");
    status.textContent = t("saving");
    const { error } = await db.from("content").update({
      value: {
        q_ar: div.querySelector(".f-q-ar").value.trim(), a_ar: div.querySelector(".f-a-ar").value.trim(),
        q_fr: div.querySelector(".f-q-fr").value.trim(), a_fr: div.querySelector(".f-a-fr").value.trim(),
        q_en: div.querySelector(".f-q-en").value.trim(), a_en: div.querySelector(".f-a-en").value.trim(),
      },
      updated_at: new Date().toISOString(),
    }).eq("key", row.key);
    setStatus(status, error);
  };
  return div;
}

/* ================= free delivery promo ================= */
async function loadFreeDelivery() {
  const { data: rows } = await db.from("settings").select("key, value")
    .in("key", ["free_delivery_all", "free_delivery_threshold"]);
  const map = {};
  (rows || []).forEach((r) => (map[r.key] = r.value));
  $("freeDeliveryAll").checked = !!(map.free_delivery_all && map.free_delivery_all.enabled);
  $("freeDeliveryThreshold").value = (map.free_delivery_threshold && map.free_delivery_threshold.amount) || 0;
}

$("freeDeliverySave").addEventListener("click", async () => {
  const status = $("freeDeliveryStatus");
  status.textContent = t("saving"); status.className = "save-status";
  const updates = [
    { key: "free_delivery_all", value: { enabled: $("freeDeliveryAll").checked }, is_public: true },
    { key: "free_delivery_threshold", value: { amount: Number($("freeDeliveryThreshold").value) || 0 }, is_public: true },
  ];
  const { error } = await db.from("settings").upsert(updates);
  setStatus(status, error);
});

/* ================= delivery fees ================= */
async function loadFees() {
  const { data: fees } = await db.from("delivery_fees").select("*");
  const map = {};
  (fees || []).forEach((f) => (map[f.wilaya_id] = f));
  const tbody = $("feesTable").querySelector("tbody");
  tbody.innerHTML = "";
  WILAYAS.forEach((w) => {
    const f = map[w.wilaya_id] || { home_fee: 0, desk_fee: 0, desk_available: true, served: true };
    const served = f.served !== false;
    const tr = document.createElement("tr");
    tr.dataset.wid = w.wilaya_id;
    if (!served) tr.className = "wilaya-not-served";
    tr.innerHTML = `
      <td>${w.wilaya_id}</td>
      <td>${esc(wilayaName(w))}${!served ? `<br><small>${t("wilaya_not_served_badge")}</small>` : ""}</td>
      <td><input type="number" min="0" class="fee-home" value="${f.home_fee}" dir="ltr"></td>
      <td><input type="number" min="0" class="fee-desk" value="${f.desk_fee}" dir="ltr"></td>
      <td style="text-align:center"><input type="checkbox" class="fee-avail"${f.desk_available ? " checked" : ""}></td>
      <td style="text-align:center"><input type="checkbox" class="fee-served"${served ? " checked" : ""}></td>
      <td></td>`;
    const delBtn = document.createElement("button");
    delBtn.className = "btn-ghost btn-sm";
    const servedBox = tr.querySelector(".fee-served");
    const refreshBtnLabel = () => { delBtn.textContent = servedBox.checked ? t("delete_btn") : t("restore_btn"); };
    refreshBtnLabel();
    delBtn.addEventListener("click", async () => {
      const removing = servedBox.checked;
      if (removing && !confirm(t("confirm_delete_wilaya"))) return;
      delBtn.disabled = true;
      const { error: upErr } = await db.from("delivery_fees")
        .upsert({ wilaya_id: w.wilaya_id, home_fee: f.home_fee, desk_fee: f.desk_fee, desk_available: !!f.desk_available, served: !removing });
      delBtn.disabled = false;
      if (upErr) { alert(t("saved_err")); return; }
      servedBox.checked = !removing;
      f.served = !removing;
      refreshBtnLabel();
      loadFees();
    });
    servedBox.addEventListener("change", refreshBtnLabel);
    tr.children[6].appendChild(delBtn);
    tbody.appendChild(tr);
  });
}

$("feesSaveAll").addEventListener("click", async () => {
  const status = $("feesStatus");
  status.textContent = t("saving"); status.className = "save-status";
  const rows = [...$("feesTable").querySelectorAll("tbody tr")].map((tr) => ({
    wilaya_id: Number(tr.dataset.wid),
    home_fee: Number(tr.querySelector(".fee-home").value) || 0,
    desk_fee: Number(tr.querySelector(".fee-desk").value) || 0,
    desk_available: tr.querySelector(".fee-avail").checked,
    served: tr.querySelector(".fee-served").checked,
  }));
  const { error } = await db.from("delivery_fees").upsert(rows);
  setStatus(status, error);
});

/* ================= settings ================= */
async function loadSettings() {
  const { data: rows } = await db.from("settings").select("*");
  const map = {};
  (rows || []).forEach((r) => (map[r.key] = r.value));
  $("setPixel").value = map.facebook_pixel_id?.value ?? "";
  $("setDedup").value = map.order_dedup_minutes?.minutes ?? 30;
  $("setRate").value = map.rate_limit?.max_per_hour ?? 6;
  $("setPhone").value = map.store_phone?.value ?? "";
}

$("settingsSave").addEventListener("click", async () => {
  const status = $("settingsStatus");
  status.textContent = t("saving"); status.className = "save-status";
  const updates = [
    { key: "facebook_pixel_id", value: { value: $("setPixel").value.trim() }, is_public: true },
    { key: "order_dedup_minutes", value: { minutes: Number($("setDedup").value) || 0 }, is_public: false },
    { key: "rate_limit", value: { max_per_hour: Number($("setRate").value) || 6 }, is_public: false },
    { key: "store_phone", value: { value: $("setPhone").value.trim() }, is_public: true },
  ];
  const { error } = await db.from("settings").upsert(updates);
  setStatus(status, error);
});

$("tgTest").addEventListener("click", async () => {
  const status = $("tgStatus");
  status.textContent = t("saving"); status.className = "save-status";
  try {
    const { data, error } = await db.functions.invoke("admin-telegram-test", { body: {} });
    let payload = data;
    if (error) { try { payload = await error.context.json(); } catch (_) { payload = null; } }
    if (payload && payload.ok) { status.textContent = t("tg_ok"); status.className = "save-status ok"; }
    else {
      status.textContent = payload?.error === "TELEGRAM_NOT_CONFIGURED"
        ? t("tg_not_configured")
        : t("tg_failed") + (payload?.detail ? ": " + payload.detail : "");
      status.className = "save-status err";
    }
  } catch (_) {
    status.textContent = t("tg_failed"); status.className = "save-status err";
  }
});

/* ================= account: change password / manage admins ================= */
$("pwSave").addEventListener("click", async () => {
  const status = $("pwStatus");
  const current = $("pwCurrent").value;
  const next = $("pwNew").value;
  const confirm = $("pwConfirm").value;

  if (next.length < 8) { status.textContent = t("pw_too_short"); status.className = "save-status err"; return; }
  if (next !== confirm) { status.textContent = t("pw_mismatch"); status.className = "save-status err"; return; }

  status.textContent = t("saving"); status.className = "save-status";
  const { data: { user } } = await db.auth.getUser();
  // Re-verify the current password before changing anything, so a session left
  // open on a shared device can't have its password swapped without knowing it.
  const { error: reauthErr } = await db.auth.signInWithPassword({ email: user.email, password: current });
  if (reauthErr) { status.textContent = t("pw_wrong_current"); status.className = "save-status err"; return; }

  const { error } = await db.auth.updateUser({ password: next });
  if (error) { status.textContent = t("saved_err"); status.className = "save-status err"; return; }
  status.textContent = t("pw_saved"); status.className = "save-status ok";
  $("pwCurrent").value = ""; $("pwNew").value = ""; $("pwConfirm").value = "";
});

$("addAdminBtn").addEventListener("click", async () => {
  const status = $("addAdminStatus");
  const email = $("newAdminEmail").value.trim();
  const pass = $("newAdminPass").value;
  const confirm = $("newAdminPassConfirm").value;

  if (pass.length < 8) { status.textContent = t("pw_too_short"); status.className = "save-status err"; return; }
  if (pass !== confirm) { status.textContent = t("pw_mismatch"); status.className = "save-status err"; return; }

  status.textContent = t("saving"); status.className = "save-status";
  try {
    const { data, error } = await db.functions.invoke("admin-create-user", { body: { email, password: pass } });
    let payload = data;
    if (error) { try { payload = await error.context.json(); } catch (_) { payload = null; } }
    if (payload && payload.ok) {
      status.textContent = t("admin_created"); status.className = "save-status ok";
      $("newAdminEmail").value = ""; $("newAdminPass").value = ""; $("newAdminPassConfirm").value = "";
      loadAdmins();
    } else {
      status.textContent = t("admin_create_failed") + (payload?.detail ? ": " + payload.detail : "");
      status.className = "save-status err";
    }
  } catch (_) {
    status.textContent = t("admin_create_failed"); status.className = "save-status err";
  }
});

async function loadAdmins() {
  const tbody = $("adminsTable").querySelector("tbody");
  try {
    const { data, error } = await db.functions.invoke("admin-list-users", { body: {} });
    let payload = data;
    if (error) { try { payload = await error.context.json(); } catch (_) { payload = null; } }
    if (!payload || !payload.ok) { tbody.innerHTML = ""; return; }

    tbody.innerHTML = "";
    payload.users.forEach((u) => {
      const isSelf = u.id === payload.selfId;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${esc(u.email)}${isSelf ? ` <small>${t("you_label")}</small>` : ""}</td>
        <td><small>${new Date(u.created_at).toLocaleDateString(LOCALE === "ar" ? "ar-DZ" : "fr-DZ")}</small></td>
        <td><small>${u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString(LOCALE === "ar" ? "ar-DZ" : "fr-DZ") : t("never_label")}</small></td>
        <td></td>`;
      if (!isSelf) {
        const delBtn = document.createElement("button");
        delBtn.className = "btn-ghost btn-sm";
        delBtn.textContent = t("delete_btn");
        delBtn.onclick = async () => {
          if (!confirm(t("confirm_delete_admin"))) return;
          const { data: delData, error: delErr } = await db.functions.invoke("admin-delete-user", { body: { user_id: u.id } });
          let delPayload = delData;
          if (delErr) { try { delPayload = await delErr.context.json(); } catch (_) { delPayload = null; } }
          if (delPayload && delPayload.ok) loadAdmins();
          else alert(delPayload?.error === "CANNOT_DELETE_SELF" ? t("cannot_delete_self") : t("saved_err"));
        };
        tr.children[3].appendChild(delBtn);
      }
      tbody.appendChild(tr);
    });
  } catch (_) {
    tbody.innerHTML = "";
  }
}

/* ================= cloudinary ================= */
function openCloudinary(onDone) {
  const widget = cloudinary.createUploadWidget({
    cloudName: CLOUDINARY_CLOUD,
    uploadPreset: CLOUDINARY_PRESET,
    sources: ["local", "url", "camera"],
    multiple: false,
    maxFileSize: 8_000_000,
    clientAllowedFormats: ["image"],
  }, (err, result) => {
    if (!err && result && result.event === "success") {
      onDone(result.info.secure_url);
      widget.close();
    }
  });
  widget.open();
}

function openCloudinaryVideo(onDone) {
  const widget = cloudinary.createUploadWidget({
    cloudName: CLOUDINARY_CLOUD,
    uploadPreset: CLOUDINARY_PRESET,
    sources: ["local", "url"],
    multiple: false,
    resourceType: "video",
    maxFileSize: 100_000_000,
    clientAllowedFormats: ["mp4", "mov", "webm", "m4v"],
  }, (err, result) => {
    if (!err && result && result.event === "success") {
      onDone(result.info.secure_url);
      widget.close();
    }
  });
  widget.open();
}

/* ================= utils ================= */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function setStatus(el, error) {
  if (error) { console.error(error); el.textContent = t("saved_err"); el.className = "save-status err"; }
  else { el.textContent = t("saved_ok"); el.className = "save-status ok"; setTimeout(() => (el.textContent = ""), 2500); }
}
function debounce(fn, ms) {
  let tm; return (...a) => { clearTimeout(tm); tm = setTimeout(() => fn(...a), ms); };
}

initAuth();
