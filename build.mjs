// Builds _site/ from the photos/ folder. Run by GitHub Actions on every upload.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const SRC = process.env.SRC || "photos", OUT = "_site";
const IMG = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i, VID = /\.(mp4|webm|m4v|mov)$/i;
const FA = "۰۱۲۳۴۵۶۷۸۹";
const fa = (s) => String(s ?? "").replace(/\d/g, (d) => FA[d]);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const url = (rel) => rel.split("/").map(encodeURIComponent).join("/");

const site = JSON.parse(fs.readFileSync("site.json", "utf8"));
const repo = process.env.GITHUB_REPOSITORY || "";
const pageUrl = site.url || (repo ? `https://${repo.split("/")[0].toLowerCase()}.github.io/${repo.split("/")[1]}/` : "");
const name = site.name || "پورتفولیو معماری";

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync("src", path.join(OUT, "assets"), { recursive: true });
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (IMG.test(e.name) || VID.test(e.name)) out.push(p);
  }
  return out;
}
function when(file) {
  try { const t = execFileSync("git", ["log", "-1", "--format=%ct", "--", file], { encoding: "utf8" }).trim(); if (t) return +t; } catch {}
  return Math.floor(fs.statSync(file).mtimeMs / 1000);
}
function caption(file) {
  const base = path.basename(file).replace(/\.[^.]+$/, "");
  if (/^(img|dsc|dscn|vid|pxl|mvimg|screenshot|photo|image|whatsapp|telegram|signal)[\W_]*\d/i.test(base) || /^[\d\W_]+$/.test(base)) return "";
  return base.replace(/[_]+/g, " ").replace(/\s+-\s+/g, " — ").trim();
}

const files = walk(SRC);
const items = [];
for (const f of files) {
  const rel = path.relative(SRC, f).split(path.sep).join("/");
  const parts = rel.split("/");
  const section = parts.length > 1 ? parts[0] : "";
  const item = { rel, section, cap: caption(f), t: when(f), video: VID.test(f) };
  const dest = path.join(OUT, "media", rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (item.video) {
    fs.copyFileSync(f, dest);
  } else {
    try {
      // Full-size view: at most 2600px, orientation fixed. Thumbnail: 900px webp.
      const full = dest.replace(/\.[^.]+$/, ".jpg");
      const info = await sharp(f, { animated: false }).rotate().resize({ width: 2600, height: 2600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toFile(full);
      const thumb = path.join(OUT, "t", rel.replace(/\.[^.]+$/, ".webp"));
      fs.mkdirSync(path.dirname(thumb), { recursive: true });
      await sharp(f, { animated: false }).rotate().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 78 }).toFile(thumb);
      item.full = "media/" + url(rel.replace(/\.[^.]+$/, ".jpg"));
      item.thumb = "t/" + url(rel.replace(/\.[^.]+$/, ".webp"));
      item.w = info.width; item.h = info.height;
    } catch (e) {
      console.warn("Skipped (cannot read):", rel, e.message);
      continue;
    }
  }
  if (item.video) item.full = "media/" + url(rel);
  items.push(item);
}

// Sections: root files first ("کارها"), then folders, newest first.
const groups = new Map();
for (const it of items.sort((a, b) => b.t - a.t)) {
  if (!groups.has(it.section)) groups.set(it.section, []);
  groups.get(it.section).push(it);
}
const sections = [...groups.entries()].sort((a, b) => (a[0] === "" ? -1 : b[0] === "" ? 1 : b[1][0].t - a[1][0].t));
let k = 0;
const flat = [];
for (const [, list] of sections) for (const it of list) { it.k = k++; flat.push(it); }

const images = flat.filter((i) => !i.video);
const frames = images.length ? Array.from({ length: 20 }, (_, i) => images[i % images.length]) : [];
const words = name.split(/\s+/);
const half = Math.ceil(words.length / 2);
const h1 = words.length > 1
  ? `<span class="line"><span>${esc(words.slice(0, half).join(" "))}</span></span><span class="line"><span>${esc(words.slice(half).join(" "))}</span></span>`
  : `<span class="line"><span>${esc(name)}</span></span>`;
const updated = items.length ? new Date(Math.max(...items.map((i) => i.t)) * 1000) : null;

function tile(it) {
  const ratio = it.w && it.h ? `${it.w} / ${it.h}` : "16 / 9";
  const label = it.cap || (it.video ? "فیلم" : "تصویر");
  const media = it.video
    ? `<video src="${it.full}#t=0.5" muted loop playsinline preload="metadata"></video><span class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>`
    : `<img src="${it.thumb}" alt="${esc(it.cap)}" loading="lazy" width="${it.w}" height="${it.h}">`;
  return `<figure class="it rv"><button class="ph" data-k="${it.k}" aria-label="نمایش بزرگ ${esc(label)}" style="aspect-ratio:${ratio}">${media}</button>${it.cap ? `<figcaption>${esc(it.cap)}</figcaption>` : ""}</figure>`;
}

const sectionHtml = sections.map(([sec, list]) => `
  <section class="sec" id="s${list[0].k}">
    <div class="sec-head"><h2 class="sec-h">${esc(sec || "کارها")}</h2><span class="count">${fa(list.length)} ${list.every((i) => i.video) ? "فیلم" : "برگ"}</span></div>
    <div class="grid">${list.map(tile).join("")}</div>
  </section>`).join("");

const nav = sections.slice(0, 4).map(([sec, list]) => `<li><a href="#s${list[0].k}">${esc(sec || "کارها")}</a></li>`).join("");
const contact = [
  site.email && `<a class="rowx ltr" href="mailto:${esc(site.email)}"><span class="tx">${esc(site.email)}</span></a>`,
  site.phone && `<a class="rowx ltr" href="tel:${esc(site.phone)}"><span class="tx">${esc(fa(site.phone))}</span></a>`,
  site.instagram && `<a class="rowx ltr" href="https://instagram.com/${esc(site.instagram.replace(/^@/, ""))}" target="_blank" rel="noopener"><span class="tx">@${esc(site.instagram.replace(/^@/, ""))}</span></a>`,
].filter(Boolean).join("");

const desc = site.role || ("اسکیس‌ها، پلان‌ها و پروژه‌های معماری" + (site.name ? " " + site.name : ""));
const ogImg = images[0] && pageUrl ? pageUrl + images[0].thumb : "";
const data = flat.map((i) => ({ s: i.full, v: i.video ? 1 : 0, c: i.cap }));

const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(name)}${site.role ? " — " + esc(site.role) : " — پورتفولیو معماری"}</title>
<meta name="description" content="${esc(desc)}">
${pageUrl ? `<link rel="canonical" href="${pageUrl}"><meta property="og:url" content="${pageUrl}">` : ""}
<meta property="og:title" content="${esc(name)}">
<meta property="og:description" content="${esc(desc)}">
${ogImg ? `<meta property="og:image" content="${ogImg}">` : ""}
<meta name="theme-color" content="#0a0a0a">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230a0a0a'/%3E%3Crect x='7' y='7' width='18' height='18' fill='none' stroke='%23b8152b' stroke-width='3'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&family=Vazirmatn:wght@400;700;900&display=swap">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div id="app">
  <nav class="nav" aria-label="اصلی"><a class="wm" href="#">${esc(name)}</a><ul>${nav}${contact ? '<li><a href="#contact">تماس</a></li>' : ""}</ul></nav>
  <header class="hero bleed">
    <div class="ring" id="ring">${frames.length
      ? frames.map((f, i) => `<button class="fr" data-k="${f.k}" data-tip="${esc(f.cap || (f.section || "کارها"))}"${i >= 12 ? " data-desk" : ""} aria-label="${esc(f.cap || "تصویر")}"><img src="${f.thumb}" alt=""${i > 6 ? ' loading="lazy"' : ""}></button>`).join("")
      : Array.from({ length: 20 }, (_, i) => `<span class="fr blank" aria-hidden="true"${i >= 12 ? " data-desk" : ""}></span>`).join("")}</div>
    <div class="core">
      <h1>${h1}</h1>
      <p class="sub" id="sub">${esc(desc)}</p>
      <div class="act"><a class="btn" href="${sections.length ? "#s0" : "#"}">دیدن کارها</a></div>
    </div>
  </header>
  <main id="main">
    ${sections.length ? sectionHtml : `<section class="sec"><div class="empty-work bleed"><h3>به‌زودی</h3><p>کارها در حال آماده‌سازی‌اند. کمی بعد دوباره سر بزنید.</p></div></section>`}
    ${contact ? `<section class="sec" id="contact"><h2 class="sec-h">تماس</h2><div class="rows bleed rv">${contact}</div></section>` : ""}
  </main>
</div>
<footer class="foot">
  <div class="fcols">
    <div><h3>${esc(name)}</h3><p>${esc(site.role || "پورتفولیو معماری")}</p></div>
    <div><h3>بخش‌ها</h3>${sections.map(([sec, list]) => `<a href="#s${list[0].k}">${esc(sec || "کارها")}</a>`).join("") || "<p>—</p>"}</div>
    <div><h3>آخرین به‌روزرسانی</h3><p>${updated ? esc(updated.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" })) : "—"}</p></div>
    <div class="qr-col" hidden><h3>این صفحه روی گوشی</h3><div class="qr" id="qr" role="img" aria-label="QR کد این صفحه"></div></div>
  </div>
  <div></div>
  <div><div class="bigname"><span id="bigname">${esc(name)}</span></div><div class="legal"><span>© ${fa(new Date().getFullYear())} ${esc(site.name || "")}</span></div></div>
</footer>
<script>window.ITEMS=${JSON.stringify(data).replace(/</g, "\\u003c")};window.PAGE_URL=${JSON.stringify(pageUrl)};</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js" defer></script>
<script src="assets/site.js" defer></script>
</body>
</html>`;
fs.writeFileSync(path.join(OUT, "index.html"), html);
console.log(`Built ${items.length} item(s) in ${sections.length} section(s) -> ${OUT}/ ${pageUrl}`);
