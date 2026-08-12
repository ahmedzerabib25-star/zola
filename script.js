/* ============ Zola landing page ============
   Public client. Uses ONLY the Supabase anon key (safe to expose).
   All writes go through Edge Functions — no direct table writes. */

const SUPABASE_URL = "https://caclaqpyfspkarpzfpxu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhY2xhcXB5ZnNwa2FycHpmcHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODIzOTgsImV4cCI6MjEwMTg1ODM5OH0.Uyh-aUM0BWdaCOtoOmf0ofFJTG6399QhQh6S-C-Qcz4";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- state ----------
let LOCALE = localStorage.getItem("zola_locale") || "ar";
let CONTENT = {};          // key -> {ar,fr,en} | {url}
let PRODUCT = null;        // active product row
let WILAYAS = [];          // [{wilaya_id, wilaya_name_latin, wilaya_name_arabic}]
let FEES = {};             // wilaya_id -> {home_fee, desk_fee, desk_available}
let SETTINGS = {};         // public settings key -> value
let COMMUNES_CACHE = {};   // wilaya_id -> communes[]
let PIXEL_READY = false;

const $ = (id) => document.getElementById(id);
const t = (key) => (CONTENT[key] && (CONTENT[key][LOCALE] || CONTENT[key].ar)) || "";

// ---------- theme ----------
// Applied immediately (script runs at end of body, header already exists)
// to avoid a flash of the wrong theme. Hero/story stay black+gold always —
// only the light product/order surfaces switch, via CSS variables.
const SUN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8"/></svg>';
const MOON_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.7A8.5 8.5 0 1 1 9.3 3.5a7 7 0 0 0 11.2 11.2Z"/></svg>';

let THEME = localStorage.getItem("zola_theme") || "dark";
function applyTheme() {
  document.documentElement.dataset.theme = THEME;
  localStorage.setItem("zola_theme", THEME);
  $("themeIcon").innerHTML = THEME === "dark" ? SUN_ICON : MOON_ICON;
  $("themeToggle").setAttribute("aria-label", THEME === "dark" ? "Switch to light mode" : "Switch to dark mode");
}
applyTheme();
$("themeToggle").addEventListener("click", () => {
  THEME = THEME === "dark" ? "light" : "dark";
  applyTheme();
});

// ---------- welcome splash ----------
// Plays on every visit (no localStorage skip) — a short cinematic brand moment, not a gate.
(function initSplash() {
  const splash = $("splash");
  if (!splash) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SPLASH_SUB = { ar: "لبان ظفار الأصيل", fr: "Encens de Dhofar", en: "Frankincense of Dhofar" };
  const subEl = $("splashSub");
  if (subEl) subEl.textContent = SPLASH_SUB[LOCALE] || SPLASH_SUB.ar;

  if (!reduced) {
    const field = $("splashParticles");
    const N = 16;
    for (let i = 0; i < N; i++) {
      const p = document.createElement("span");
      p.style.setProperty("--x", (6 + Math.random() * 88) + "%");
      p.style.setProperty("--s", (2 + Math.random() * 3).toFixed(1) + "px");
      p.style.setProperty("--d", (4.5 + Math.random() * 4).toFixed(2) + "s");
      p.style.setProperty("--delay", (Math.random() * 3).toFixed(2) + "s");
      p.style.setProperty("--drift", (Math.random() * 40 - 20).toFixed(0) + "px");
      field.appendChild(p);
    }
  }

  const dismiss = () => {
    splash.classList.add("splash-out");
    document.body.classList.remove("splash-lock");
    setTimeout(() => splash.classList.add("splash-hidden"), reduced ? 260 : 1100);
  };
  setTimeout(dismiss, reduced ? 300 : 2150);
})();

// ---------- hero headline stagger ----------
function wrapHeroWords() {
  const el = $("heroHeadline");
  if (!el.textContent.trim()) return;
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words
    .map((w, i) => `<span class="word" style="--i:${i}">${w}</span>`)
    .join(" ");
}

// ---------- hero stats (admin-controlled, count-up on render) ----------
function renderStats() {
  const wrap = $("heroStats");
  wrap.innerHTML = "";
  const keys = Object.keys(CONTENT)
    .filter((k) => k.startsWith("stat_") && CONTENT[k] && typeof CONTENT[k] === "object" && "number" in CONTENT[k])
    .sort();

  keys.forEach((key) => {
    const s = CONTENT[key];
    const item = document.createElement("div");
    item.className = "stat-item";

    const num = document.createElement("div");
    num.className = "stat-num";
    const val = document.createElement("span");
    val.className = "stat-num-val";
    val.textContent = "0";
    num.appendChild(val);
    if (s.suffix) {
      const suf = document.createElement("span");
      suf.textContent = s.suffix;
      num.appendChild(suf);
    }

    const label = document.createElement("div");
    label.className = "stat-label";
    label.textContent = s[LOCALE] || s.ar || "";

    item.append(num, label);
    wrap.appendChild(item);
    countUpStat(val, Number(s.number) || 0);
  });
}

function countUpStat(el, target) {
  if (REDUCE_MOTION || !target) { el.textContent = fmt(target); return; }
  const duration = 1300;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---------- FAQ (admin-controlled; a slot with no question in the current
// locale is skipped, and the whole section hides itself if none remain) ----------
function renderFAQ() {
  const wrap = $("faqList");
  wrap.innerHTML = "";

  const keys = Object.keys(CONTENT)
    .filter((k) => k.startsWith("faq_") && k !== "faq_title" && CONTENT[k] && typeof CONTENT[k] === "object" && "q_ar" in CONTENT[k])
    .sort();

  const items = keys
    .map((key) => {
      const f = CONTENT[key];
      return { q: (f["q_" + LOCALE] || f.q_ar || "").trim(), a: (f["a_" + LOCALE] || f.a_ar || "").trim() };
    })
    .filter((item) => item.q);

  $("faqSection").hidden = items.length === 0;
  $("navFaqLink").hidden = items.length === 0;
  $("navFaqLinkMobile").hidden = items.length === 0;

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "faq-item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "faq-q";
    btn.setAttribute("aria-expanded", "false");
    const qText = document.createElement("span");
    qText.textContent = item.q;
    const chev = document.createElement("span");
    chev.className = "faq-chevron icon";
    chev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    btn.append(qText, chev);

    const answer = document.createElement("div");
    answer.className = "faq-a";
    const p = document.createElement("p");
    p.textContent = item.a;
    answer.appendChild(p);

    btn.addEventListener("click", () => {
      const isOpen = div.classList.contains("open");
      wrap.querySelectorAll(".faq-item.open").forEach((openItem) => {
        if (openItem !== div) {
          openItem.classList.remove("open");
          openItem.querySelector(".faq-a").style.maxHeight = "";
          openItem.querySelector(".faq-q").setAttribute("aria-expanded", "false");
        }
      });
      div.classList.toggle("open", !isOpen);
      btn.setAttribute("aria-expanded", String(!isOpen));
      answer.style.maxHeight = isOpen ? "" : answer.scrollHeight + "px";
    });

    div.append(btn, answer);
    wrap.appendChild(div);
  });
}

// ---------- i18n ----------
function applyLocale() {
  document.documentElement.lang = LOCALE;
  document.documentElement.dir = LOCALE === "ar" ? "rtl" : "ltr";
  localStorage.setItem("zola_locale", LOCALE);

  document.querySelectorAll(".lang-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.lang === LOCALE));

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = t(el.dataset.i18n);
    if (v) el.textContent = v;
  });
  wrapHeroWords(); // re-splits into staggered <span>s, replaying the entrance on every locale switch
  renderStats();   // rebuilds + replays the count-up on every locale switch too
  renderFAQ();
  renderMarquee();

  renderProduct();
  renderWilayas();
  renderCommunes();
  updateTotals();
}

// ---------- data loading ----------
async function loadAll() {
  const [contentQ, productQ, wilayasQ, feesQ, settingsQ] = await Promise.all([
    db.from("content").select("key,value"),
    db.from("products").select("*").eq("active", true).order("sort_order").limit(1),
    db.from("wilayas").select("*").order("wilaya_id"),
    db.from("delivery_fees").select("*"),
    db.from("settings").select("key,value"),
  ]);

  (contentQ.data || []).forEach((r) => (CONTENT[r.key] = r.value));
  PRODUCT = (productQ.data || [])[0] || null;
  WILAYAS = wilayasQ.data || [];
  (feesQ.data || []).forEach((r) => (FEES[r.wilaya_id] = r));
  (settingsQ.data || []).forEach((r) => (SETTINGS[r.key] = r.value));

  applyImages();
  applyVideo();
  applyLocale();
  initPixel();
}

// Promo video: entirely admin-controlled. No URL (or an admin-cleared one) → section stays hidden.
function applyVideo() {
  const url = CONTENT.video_promo && CONTENT.video_promo.url;
  const section = $("promoVideoSection");
  if (url) {
    $("promoVideoEl").src = url;
    section.hidden = false;
  } else {
    section.hidden = true;
  }
}

function applyImages() {
  // logoImg already ships with a local fallback (images/logo.png);
  // an admin-uploaded Cloudinary logo overrides it if one is set.
  const logo = CONTENT.img_logo && CONTENT.img_logo.url;
  if (logo) $("logoImg").src = cdn(logo, 160);

  // Hero background video (if set) takes priority over the static image —
  // applyHeroVideo() runs first and reports back whether it took over.
  if (applyHeroVideo()) return;

  const hero = CONTENT.img_hero && CONTENT.img_hero.url;
  if (hero) {
    const bg = $("heroBg");
    bg.style.backgroundImage = `url(${cdn(hero, 1400)})`;
    bg.classList.add("has-img");
  }
}

// Hero background video: fully optional. No URL → stays hidden, falls back
// to the static image (or plain gradient). Returns true if a video is active.
function applyHeroVideo() {
  const url = CONTENT.video_hero && CONTENT.video_hero.url;
  if (!url) return false;
  const video = $("heroVideoEl");
  video.src = url;
  video.hidden = false;
  $("heroBg").classList.add("has-video");
  return true;
}

// Cloudinary width/quality optimization for fast mobile load
function cdn(url, w) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${w}/`);
}

// ---------- product ----------
// Mirrors the server-side pricing logic in the place_order() Postgres function
// exactly, so what's shown here always matches what gets charged. Purely
// optional: PRODUCT.discount_percent === 0 and qty_tiers === [] means no
// discount is configured at all, and prices behave exactly as before.
function effectiveUnitPrice(qty) {
  if (!PRODUCT) return 0;
  const tiers = Array.isArray(PRODUCT.qty_tiers) ? PRODUCT.qty_tiers : [];
  const match = tiers.filter((tr) => tr.qty <= qty).sort((a, b) => b.qty - a.qty)[0];
  if (match) return match.price;
  if (PRODUCT.discount_percent > 0) return Math.round(PRODUCT.price * (1 - PRODUCT.discount_percent / 100));
  return PRODUCT.price;
}

function tierTemplate(key, qty, price) {
  return t(key)
    .replace("{qty}", qty)
    .replace("{price}", fmt(price))
    .replace("{currency}", t("ui_currency"));
}

// Mirrors the "buy X get Y free" logic in place_order() exactly — repeats per
// full group (buy 3 get 1 free -> buy 6 get 2 free). Purely optional: 0/0 = off.
function freeUnitsFor(qty) {
  if (!PRODUCT || !PRODUCT.bogo_buy_qty || !PRODUCT.bogo_free_qty) return 0;
  return Math.floor(qty / PRODUCT.bogo_buy_qty) * PRODUCT.bogo_free_qty;
}

function bogoTemplate(key, freeQty, totalQty) {
  return t(key)
    .replace("{buy}", PRODUCT.bogo_buy_qty)
    .replace("{free}", freeQty)
    .replace("{total}", totalQty);
}

function renderPricing(qty) {
  if (!PRODUCT) return;
  const unit = effectiveUnitPrice(qty);
  $("productPrice").textContent = fmt(unit);

  const discounted = unit < PRODUCT.price;
  $("priceOriginal").hidden = !discounted;
  if (discounted) $("priceOriginal").textContent = fmt(PRODUCT.price) + " " + t("ui_currency");

  const pct = discounted ? Math.round((1 - unit / PRODUCT.price) * 100) : 0;
  $("discountBadge").hidden = pct <= 0;
  if (pct > 0) $("discountBadge").textContent = "-" + pct + "%";

  // dynamic hint next to the order form's quantity field
  const tiers = Array.isArray(PRODUCT.qty_tiers) ? PRODUCT.qty_tiers : [];
  const orderHint = $("orderTierHint");
  if (!tiers.length) {
    orderHint.hidden = true;
  } else {
    const active = tiers.filter((tr) => tr.qty <= qty).sort((a, b) => b.qty - a.qty)[0];
    const next = tiers.filter((tr) => tr.qty > qty).sort((a, b) => a.qty - b.qty)[0];
    if (active) {
      orderHint.hidden = false;
      orderHint.textContent = tierTemplate("tier_hint_active", active.qty, active.price);
    } else if (next) {
      orderHint.hidden = false;
      orderHint.textContent = tierTemplate("tier_hint_next", next.qty, next.price);
    } else {
      orderHint.hidden = true;
    }
  }

  // buy-X-get-Y-free: live hint + totals-box free-items row
  const free = freeUnitsFor(qty);
  const bogoHint = $("orderBogoHint");
  bogoHint.hidden = free <= 0;
  if (free > 0) bogoHint.textContent = bogoTemplate("bogo_active_hint", free, qty + free);

  $("tFreeRow").hidden = free <= 0;
  if (free > 0) {
    $("tFreeLabel").textContent = t("ui_free_items");
    $("tFreeVal").textContent = "+" + free;
  }
}

function renderProduct() {
  if (!PRODUCT) return;
  $("productName").textContent = PRODUCT.name[LOCALE] || PRODUCT.name.ar;
  $("productDesc").textContent = (PRODUCT.description && (PRODUCT.description[LOCALE] || PRODUCT.description.ar)) || "";
  renderPricing(clampQty());
  $("stockNote").hidden = PRODUCT.stock > 0;
  $("submitBtn").disabled = PRODUCT.stock <= 0;

  // static "buy X get Y free" badge (informational, always visible if configured)
  const bogoBadge = $("bogoBadge");
  if (PRODUCT.bogo_buy_qty > 0 && PRODUCT.bogo_free_qty > 0) {
    bogoBadge.hidden = false;
    $("bogoBadgeText").textContent = bogoTemplate("bogo_badge", PRODUCT.bogo_free_qty, PRODUCT.bogo_buy_qty + PRODUCT.bogo_free_qty);
  } else {
    bogoBadge.hidden = true;
  }

  // static "quantity pricing" list under the price (all configured tiers, informational)
  const tierWrap = $("tierHints");
  tierWrap.innerHTML = "";
  const tiers = Array.isArray(PRODUCT.qty_tiers) ? [...PRODUCT.qty_tiers].sort((a, b) => a.qty - b.qty) : [];
  if (tiers.length) {
    tiers.forEach((tr) => {
      const row = document.createElement("div");
      row.className = "tier-hint";
      row.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      row.append(document.createTextNode(tierTemplate("tier_hint_next", tr.qty, tr.price)));
      tierWrap.appendChild(row);
    });
  }

  const boxRaw = t("product_box_items");
  const ul = $("boxItems");
  ul.innerHTML = "";
  boxRaw.split("\n").filter(Boolean).forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    ul.appendChild(li);
  });

  const imgs = Array.isArray(PRODUCT.images) ? PRODUCT.images : [];
  const extra = ["img_product_1", "img_product_2", "img_product_3"]
    .map((k) => CONTENT[k] && CONTENT[k].url).filter(Boolean);
  const all = [...imgs, ...extra];
  const main = $("productMainImg");
  const thumbs = $("productThumbs");
  thumbs.innerHTML = "";
  if (all.length) {
    main.innerHTML = `<img src="${cdn(all[0], 800)}" alt="">`;
    all.forEach((u, i) => {
      const im = document.createElement("img");
      im.src = cdn(u, 160);
      im.alt = "";
      if (i === 0) im.classList.add("active");
      im.onclick = () => {
        main.innerHTML = `<img src="${cdn(u, 800)}" alt="">`;
        thumbs.querySelectorAll("img").forEach((x) => x.classList.remove("active"));
        im.classList.add("active");
      };
      thumbs.appendChild(im);
    });
  }
}

function fmt(n) { return Number(n).toLocaleString(LOCALE === "ar" ? "ar-DZ" : "fr-DZ"); }

// animate a total from its previous value to the new one (rAF, ~350ms, eased)
const REDUCE_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function animateNumber(el, to) {
  const from = Number(el.dataset.val || 0);
  el.dataset.val = to;
  if (REDUCE_MOTION || from === to) { el.textContent = fmt(to); return; }
  const duration = 350;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(from + (to - from) * eased));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---------- wilaya / commune cascade ----------
function wilayaName(w) { return LOCALE === "ar" ? w.wilaya_name_arabic : w.wilaya_name_latin; }
function communeName(c) { return LOCALE === "ar" ? c.commune_name_arabic : c.commune_name_latin; }

function renderWilayas() {
  const sel = $("fWilaya");
  const current = sel.value;
  sel.innerHTML = `<option value="">${t("ui_select")}</option>`;
  WILAYAS.filter((w) => FEES[w.wilaya_id]?.served !== false).forEach((w) => {
    const o = document.createElement("option");
    o.value = w.wilaya_id;
    o.textContent = `${w.wilaya_id} — ${wilayaName(w)}`;
    sel.appendChild(o);
  });
  if (current) sel.value = current;
}

async function loadCommunes(wilayaId) {
  if (!COMMUNES_CACHE[wilayaId]) {
    const { data } = await db.from("communes").select("*")
      .eq("wilaya_id", wilayaId).order("commune_name_latin");
    COMMUNES_CACHE[wilayaId] = data || [];
  }
  return COMMUNES_CACHE[wilayaId];
}

async function renderCommunes() {
  const wid = $("fWilaya").value;
  const sel = $("fCommune");
  const current = sel.value;
  if (!wid) { sel.innerHTML = `<option value="">${t("ui_select")}</option>`; sel.disabled = true; return; }
  const communes = await loadCommunes(wid);
  sel.innerHTML = `<option value="">${t("ui_select")}</option>`;
  communes.forEach((c) => {
    const o = document.createElement("option");
    o.value = c.commune_id;
    o.textContent = communeName(c);
    sel.appendChild(o);
  });
  sel.disabled = false;
  if (current && communes.some((c) => String(c.commune_id) === current)) sel.value = current;
}

// ---------- live total ----------
function freeDeliveryThreshold() {
  return Number(SETTINGS.free_delivery_threshold && SETTINGS.free_delivery_threshold.amount) || 0;
}
function freeDeliveryAll() {
  return !!(SETTINGS.free_delivery_all && SETTINGS.free_delivery_all.enabled);
}

function currentFee(sub) {
  const wid = $("fWilaya").value;
  if (!wid || !FEES[wid]) return null;
  const type = document.querySelector('input[name="dtype"]:checked').value;
  const nominal = type === "home" ? FEES[wid].home_fee : FEES[wid].desk_fee;
  const threshold = freeDeliveryThreshold();
  if (freeDeliveryAll() || (threshold > 0 && sub >= threshold)) return 0;
  return nominal;
}

function renderFreeDeliveryHint(sub, fee, nominalFee) {
  const el = $("freeDeliveryHint");
  if (!el) return;
  const threshold = freeDeliveryThreshold();
  if (freeDeliveryAll() || (fee === 0 && nominalFee > 0)) {
    el.hidden = false;
    el.textContent = t("free_delivery_badge");
    el.className = "free-delivery-hint active";
  } else if (threshold > 0 && sub < threshold) {
    el.hidden = false;
    el.textContent = t("free_delivery_threshold_hint")
      .replace("{amount}", fmt(threshold)).replace("{currency}", t("ui_currency"));
    el.className = "free-delivery-hint";
  } else {
    el.hidden = true;
  }
}

function updateTotals() {
  if (!PRODUCT) return;
  const qty = clampQty();
  renderPricing(qty); // keep the price tag / discount badge / tier hint in sync with quantity
  const sub = effectiveUnitPrice(qty) * qty;
  const wid = $("fWilaya").value;
  const type = document.querySelector('input[name="dtype"]:checked').value;
  const nominalFee = (wid && FEES[wid]) ? (type === "home" ? FEES[wid].home_fee : FEES[wid].desk_fee) : null;
  const fee = currentFee(sub);
  animateNumber($("tProduct"), sub);
  if (fee === null) { $("tDelivery").textContent = "—"; delete $("tDelivery").dataset.val; }
  else animateNumber($("tDelivery"), fee);
  animateNumber($("tTotal"), fee === null ? sub : sub + fee);
  renderFreeDeliveryHint(sub, fee, nominalFee || 0);
}

function clampQty() {
  const el = $("fQty");
  let q = parseInt(el.value, 10);
  if (isNaN(q) || q < 1) q = 1;
  if (q > 20) q = 20;
  el.value = q;
  return q;
}

// ---------- facebook pixel ----------
function initPixel() {
  const id = SETTINGS.facebook_pixel_id && SETTINGS.facebook_pixel_id.value;
  if (!id) return;
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", id);
  fbq("track", "PageView");
  if (PRODUCT) {
    fbq("track", "ViewContent", {
      content_name: PRODUCT.name.en || "Zola Frankincense",
      currency: "DZD", value: PRODUCT.price,
    });
  }
  PIXEL_READY = true;
}

// Accepts local (05/06/07...) and international (+213.../00213...) formats,
// normalizes to the local 10-digit form the backend expects.
function normalizeDzPhone(raw) {
  let p = String(raw ?? "").replace(/[\s.\-()]/g, "");
  if (p.startsWith("+213")) p = "0" + p.slice(4);
  else if (p.startsWith("00213")) p = "0" + p.slice(5);
  else if (/^213\d{9}$/.test(p)) p = "0" + p.slice(3);
  return p;
}

function getCookie(name) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? m[2] : undefined;
}

// ---------- order submit ----------
async function submitOrder(e) {
  e.preventDefault();
  if (!PRODUCT) return;

  // client-side validation
  let bad = false;
  const name = $("fName").value.trim();
  const phone = normalizeDzPhone($("fPhone").value);
  const wid = $("fWilaya").value;
  const cid = $("fCommune").value;

  markField($("fName"), name.length >= 3, 0); bad = bad || name.length < 3;
  const phoneOk = /^0[567]\d{8}$/.test(phone);
  markField($("fPhone"), phoneOk, 1); bad = bad || !phoneOk;
  markField($("fWilaya"), !!wid, 2); bad = bad || !wid;
  markField($("fCommune"), !!cid, 3); bad = bad || !cid;
  if (bad) return;

  const btn = $("submitBtn");
  btn.disabled = true;
  btn.querySelector("span").textContent = t("ui_sending");
  $("formError").hidden = true;

  const eventId = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());

  try {
    const { data, error } = await db.functions.invoke("submit-order", {
      body: {
        product_id: PRODUCT.id,
        quantity: clampQty(),
        full_name: name,
        phone,
        wilaya_id: Number(wid),
        commune_id: Number(cid),
        address: $("fAddress").value.trim() || null,
        delivery_type: document.querySelector('input[name="dtype"]:checked').value,
        locale: LOCALE,
        website: $("hpField").value, // honeypot
        event_id: eventId,
        source_url: location.href,
        fbp: getCookie("_fbp"),
        fbc: getCookie("_fbc"),
      },
    });

    let payload = data;
    if (error) {
      // supabase-js throws on non-2xx; try to read the function's JSON error
      try { payload = await error.context.json(); } catch (_) { payload = null; }
    }

    if (payload && payload.ok) {
      if (PIXEL_READY) {
        fbq("track", "Purchase",
          { currency: "DZD", value: payload.total, num_items: clampQty() },
          { eventID: eventId });
      }
      $("tyOrderNum").textContent = "#" + payload.order_id +
        (payload.free_qty > 0 ? " · " + bogoTemplate("bogo_active_hint", payload.free_qty, payload.ship_qty) : "");
      $("thankyou").hidden = false;
      document.body.style.overflow = "hidden";
      $("orderForm").reset();
      renderCommunes();
      updateTotals();
    } else {
      const code = payload && payload.error;
      const map = {
        OUT_OF_STOCK: "err_out_of_stock",
        DUPLICATE: "err_duplicate",
        RATE_LIMIT: "err_rate_limit",
        INVALID_PHONE: "err_phone",
      };
      showFormError(t(map[code] || "err_generic"));
    }
  } catch (err) {
    console.error(err);
    showFormError(t("err_generic"));
  } finally {
    btn.disabled = PRODUCT.stock <= 0;
    btn.querySelector("span").textContent = t("ui_submit");
  }
}

function markField(el, ok, errIdx) {
  el.classList.toggle("bad", !ok);
  const err = el.closest(".field").querySelector(".ferr");
  if (err) err.hidden = ok;
}

function showFormError(msg) {
  const box = $("formError");
  box.textContent = msg;
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------- contact submit ----------
function isValidContact(raw) {
  const phone = normalizeDzPhone(raw);
  if (/^0[567]\d{8}$/.test(phone)) return true;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw.trim());
}

async function submitContact(e) {
  e.preventDefault();
  $("contactError").hidden = true;
  $("contactOk").hidden = true;

  const name = $("cName").value.trim();
  const contactRaw = $("cContact").value.trim();
  const message = $("cMsg").value.trim();

  let bad = false;
  const nameOk = name.length >= 2;
  markField($("cName"), nameOk); bad = bad || !nameOk;
  const contactOk = isValidContact(contactRaw);
  markField($("cContact"), contactOk); bad = bad || !contactOk;
  const messageOk = message.length >= 5;
  markField($("cMsg"), messageOk); bad = bad || !messageOk;
  if (bad) return;

  // send the normalized local format when it's a phone; keep emails as-is
  const contact = /^0[567]\d{8}$/.test(normalizeDzPhone(contactRaw)) ? normalizeDzPhone(contactRaw) : contactRaw;

  const btn = $("contactBtn");
  btn.disabled = true;
  try {
    const { data, error } = await db.functions.invoke("submit-contact", {
      body: { name, contact, message, locale: LOCALE, website: $("hpField2").value },
    });
    let payload = data;
    if (error) { try { payload = await error.context.json(); } catch (_) { payload = null; } }
    if (payload && payload.ok) {
      $("contactOk").hidden = false;
      $("contactForm").reset();
    } else {
      const map = { INVALID_NAME: "err_name", INVALID_CONTACT: "err_contact", INVALID_MESSAGE: "err_message", RATE_LIMIT: "err_rate_limit" };
      $("contactError").textContent = t(map[payload?.error] || "err_generic");
      $("contactError").hidden = false;
    }
  } catch (_) {
    $("contactError").textContent = t("err_generic");
    $("contactError").hidden = false;
  } finally {
    btn.disabled = false;
  }
}

// ---------- scroll reveal + sticky CTA ----------
function initFx() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".rev, .rev-left, .rev-right, .rev-scale, #storyGrid").forEach((el) => io.observe(el));

  const cta = $("stickyCta");
  const orderSec = $("order");
  const hero = $("hero");
  const watch = new IntersectionObserver((entries) => {
    let heroVisible = false, orderVisible = false;
    entries.forEach((en) => {
      if (en.target === hero) heroVisible = en.isIntersecting;
      if (en.target === orderSec) orderVisible = en.isIntersecting;
    });
    // show after hero scrolled past, hide while the form is on screen
    if (typeof watch.hv === "undefined") { watch.hv = heroVisible; watch.ov = orderVisible; }
    entries.forEach((en) => {
      if (en.target === hero) watch.hv = en.isIntersecting;
      if (en.target === orderSec) watch.ov = en.isIntersecting;
    });
    cta.classList.toggle("show", !watch.hv && !watch.ov);
  }, { threshold: 0.15 });
  watch.observe(hero);
  watch.observe(orderSec);

  initScrollProgress();
  initGlowFollow();
  initTilt();
  initMobileMenu();
  initMagicCursor();
}

function initMobileMenu() {
  const toggle = $("menuToggle");
  const menu = $("mobileMenu");
  const backdrop = $("mobileMenuBackdrop");

  function close() {
    toggle.setAttribute("aria-expanded", "false");
    menu.classList.remove("open");
    backdrop.hidden = true;
    document.body.style.overflow = "";
  }
  function open() {
    toggle.setAttribute("aria-expanded", "true");
    menu.classList.add("open");
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";
  }
  toggle.addEventListener("click", () => {
    toggle.getAttribute("aria-expanded") === "true" ? close() : open();
  });
  backdrop.addEventListener("click", close);
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
}

function initScrollProgress() {
  const bar = $("scrollProgressBar");
  let ticking = false;
  function update() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}

// Soft cursor-follow glow on the dark sections — desktop pointer only, skipped on touch.
function initGlowFollow() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.querySelectorAll(".darksec").forEach((sec) => {
    sec.classList.add("glow-follow");
    sec.addEventListener("mouseenter", () => sec.classList.add("glow-active"));
    sec.addEventListener("mouseleave", () => sec.classList.remove("glow-active"));
    sec.addEventListener("mousemove", (e) => {
      const rect = sec.getBoundingClientRect();
      sec.style.setProperty("--mx", ((e.clientX - rect.left) / rect.width) * 100 + "%");
      sec.style.setProperty("--my", ((e.clientY - rect.top) / rect.height) * 100 + "%");
    });
  });
}

// Magnetic 3D tilt on the CTA + product image — desktop pointer only.
function initTilt() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.querySelectorAll(".tilt").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(600px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) scale(1.02)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });
}

// Golden magic cursor: a glowing dot that tracks the mouse exactly, leaving a
// trail of fading sparkles behind it. Desktop pointer only — never touches
// mobile (no cursor exists there), and skipped entirely under reduced-motion.
function initMagicCursor() {
  if (REDUCE_MOTION || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  document.body.classList.add("magic-cursor");
  const dot = $("customCursor");
  const interactiveSelector = "a, button, input, select, textarea, label, .tilt";
  let lastSpark = 0;

  document.addEventListener("mousemove", (e) => {
    dot.classList.add("show");
    dot.style.transform = `translate(-50%, -50%) translate(${e.clientX}px, ${e.clientY}px)`;
    dot.classList.toggle("hover", !!e.target.closest(interactiveSelector));

    const now = performance.now();
    if (now - lastSpark > 45) {
      lastSpark = now;
      spawnSpark(e.clientX, e.clientY);
    }
  });
  document.addEventListener("mouseleave", () => dot.classList.remove("show"));
  document.addEventListener("mouseenter", () => dot.classList.add("show"));

  function spawnSpark(x, y) {
    const s = document.createElement("span");
    s.className = "cursor-spark";
    const size = 4 + Math.random() * 4;
    s.style.width = size + "px";
    s.style.height = size + "px";
    s.style.left = x + (Math.random() * 10 - 5) + "px";
    s.style.top = y + (Math.random() * 10 - 5) + "px";
    document.body.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
  }
}

// Infinite marquee ticker, built from the same trust-badge copy so there's
// nothing new to manage in admin — duplicated once for a seamless loop.
function renderMarquee() {
  const track = $("marqueeTrack");
  const parts = [t("badge_1"), t("badge_2"), t("badge_3"), t("badge_4")].filter(Boolean);
  if (!parts.length) { track.innerHTML = ""; return; }
  const star = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1c0 6 2.2 9.8 7 11-4.8 1.2-7 5-7 11 0-6-2.2-9.8-7-11 4.8-1.2 7-5 7-11Z"/></svg>';
  const items = parts.map((p) => `<span class="marquee-item">${star}${p}</span>`).join("");
  track.innerHTML = items + items;
}

// ---------- wire up ----------
document.querySelectorAll(".lang-btn").forEach((b) =>
  b.addEventListener("click", () => { LOCALE = b.dataset.lang; applyLocale(); }));

$("fWilaya").addEventListener("change", async () => { await renderCommunes(); updateTotals(); });
document.querySelectorAll('input[name="dtype"]').forEach((r) => r.addEventListener("change", updateTotals));
$("fQty").addEventListener("input", updateTotals);
$("qtyMinus").addEventListener("click", () => { $("fQty").value = clampQty() - 1 || 1; updateTotals(); });
$("qtyPlus").addEventListener("click", () => { $("fQty").value = Math.min(clampQty() + 1, 20); updateTotals(); });
$("orderForm").addEventListener("submit", submitOrder);
$("contactForm").addEventListener("submit", submitContact);
$("tyClose").addEventListener("click", () => { $("thankyou").hidden = true; document.body.style.overflow = ""; });
$("footerYear").textContent = new Date().getFullYear();

initFx();
loadAll();
