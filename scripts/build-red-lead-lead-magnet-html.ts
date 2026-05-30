#!/usr/bin/env tsx
/**
 * Build print-ready Red Lead PDF HTML from shared sauce data.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  RED_LEAD_PDF_ASSETS,
  RED_LEAD_PDF_COPY,
  RED_LEAD_SAUCE_COOK_MIN,
  RED_LEAD_SAUCE_FIREHALL_TIPS,
  RED_LEAD_SAUCE_PREP_MIN,
  RED_LEAD_SAUCE_SCALES,
  RED_LEAD_SAUCE_STEPS,
  RED_LEAD_TRADITIONAL_SIDES,
} from "../shared/seo/firefighter-red-lead-sauce-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "client/public/downloads/the-official-firehall-red-lead-recipe.html");

function rel(publicPath: string): string {
  return `..${publicPath}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderIngredients(): string {
  return RED_LEAD_SAUCE_SCALES.map(
    (scale) => `
      <div class="scale-card">
        <h3>${esc(scale.label)}</h3>
        <ul>
          ${scale.ingredients
            .map(
              (ing) =>
                `<li><strong>${esc(ing.amount)}</strong> ${esc(ing.name)}${ing.notes ? ` <span class="muted">(${esc(ing.notes)})</span>` : ""}</li>`,
            )
            .join("")}
        </ul>
      </div>`,
  ).join("");
}

function renderSteps(): string {
  return RED_LEAD_SAUCE_STEPS.map(
    (step) => `
      <li class="step">
        <div class="step-head">
          <span class="step-num">${step.number}</span>
          <h3>${esc(step.title)}</h3>
        </div>
        <p>${esc(step.body)}</p>
        ${step.minutes ? `<p class="step-meta"><strong>Timing:</strong> ${esc(step.minutes)}</p>` : ""}
        ${step.visualCue ? `<p class="step-meta"><strong>Look for:</strong> ${esc(step.visualCue)}</p>` : ""}
        ${step.mistake ? `<p class="step-warn"><strong>Watch out:</strong> ${esc(step.mistake)}</p>` : ""}
      </li>`,
  ).join("");
}

function renderTips(): string {
  return RED_LEAD_SAUCE_FIREHALL_TIPS.map(
    (tip) => `
      <div class="tip-card">
        <h3>${esc(tip.title)}</h3>
        <p>${esc(tip.body)}</p>
      </div>`,
  ).join("");
}

function renderSides(): string {
  return RED_LEAD_TRADITIONAL_SIDES.map(
    (side) => `
      <div class="side-item">
        <h3>${esc(side.name)}</h3>
        <p>${esc(side.detail)}</p>
      </div>`,
  ).join("");
}

function buildHtml(): string {
  const hero = rel(RED_LEAD_PDF_ASSETS.heroImage);
  const spread = rel(RED_LEAD_PDF_ASSETS.spreadImage);
  const introParagraphs = RED_LEAD_PDF_COPY.introduction.map((p) => `<p>${esc(p)}</p>`).join("");
  const whyParagraphs = RED_LEAD_PDF_COPY.whyItMatters.paragraphs
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(RED_LEAD_PDF_COPY.header)} | Firehall Meals</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" />
    <style>
      :root {
        --ink: #1c1917;
        --charcoal: #292524;
        --muted: #57534e;
        --line: #e7e5e4;
        --paper: #ffffff;
        --cream: #faf7f5;
        --red: #b91c1c;
        --red-dark: #7f1d1d;
        --red-soft: #fef2f2;
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: #d6d3d1;
        color: var(--ink);
        font-family: "DM Sans", system-ui, sans-serif;
        font-size: 10.5pt;
        line-height: 1.55;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page { size: letter; margin: 0; }
      .page {
        width: 8.5in;
        min-height: 11in;
        margin: 0 auto 12px;
        padding: 0.55in 0.65in 0.6in;
        background: var(--paper);
        position: relative;
        page-break-after: always;
        overflow: hidden;
      }
      .page:last-child { page-break-after: auto; }
      h1, h2, h3, .brand, .kicker, .step-num {
        font-family: Oswald, "Arial Narrow", sans-serif;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin: 0;
      }
      h1 {
        font-size: 2.15rem;
        line-height: 0.95;
        color: var(--red-dark);
        max-width: 6.5in;
      }
      h2 {
        font-size: 1.05rem;
        color: var(--red-dark);
        border-bottom: 2px solid var(--red);
        padding-bottom: 0.3rem;
        margin-bottom: 0.75rem;
      }
      h3 { font-size: 0.82rem; color: var(--charcoal); margin: 0 0 0.35rem; }
      p { margin: 0 0 0.65rem; }
      .muted { color: var(--muted); font-size: 0.92em; }
      .brand-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        border-bottom: 1px solid var(--line);
        padding-bottom: 0.45rem;
        margin-bottom: 0.85rem;
      }
      .brand-lockup { display: flex; align-items: center; gap: 0.5rem; }
      .brand-mark {
        width: 26px; height: 26px; border-radius: 999px;
        background: linear-gradient(145deg, var(--red), var(--red-dark));
        display: grid; place-items: center; color: #fff; font-size: 0.85rem;
      }
      .brand { font-size: 0.88rem; letter-spacing: 0.14em; }
      .brand-tag { font-size: 0.62rem; letter-spacing: 0.1em; color: var(--muted); text-transform: uppercase; }
      .page-num {
        position: absolute; right: 0.65in; bottom: 0.42in;
        font-size: 0.65rem; color: var(--muted); letter-spacing: 0.08em;
      }
      .kicker {
        font-size: 0.72rem; color: var(--red); letter-spacing: 0.22em; margin-bottom: 0.55rem;
      }
      .subtitle {
        font-size: 1rem; color: var(--muted); max-width: 5.8in; margin-top: 0.55rem;
      }
      .intro { max-width: 6.2in; margin-top: 0.85rem; }
      .intro p:last-child { margin-bottom: 0; }
      .hero {
        width: 100%; height: 3.1in; object-fit: cover; object-position: center;
        border-radius: 8px; margin: 0.75rem 0 0.85rem; display: block;
        border: 1px solid var(--line);
      }
      .meta-row {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.55rem; margin-top: 0.65rem;
      }
      .meta {
        background: var(--cream); border: 1px solid var(--line); border-radius: 6px; padding: 0.55rem 0.65rem;
      }
      .meta .label { font-size: 0.58rem; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 0.15rem; }
      .meta strong { font-size: 0.88rem; color: var(--charcoal); }
      .note {
        background: var(--red-soft); border-left: 3px solid var(--red);
        padding: 0.65rem 0.75rem; margin: 0.75rem 0; border-radius: 0 6px 6px 0;
      }
      .scale-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.55rem; }
      .scale-card {
        background: var(--cream); border: 1px solid var(--line); border-radius: 6px; padding: 0.6rem 0.65rem;
      }
      .scale-card ul { margin: 0; padding-left: 1rem; }
      .scale-card li { margin-bottom: 0.35rem; font-size: 0.88rem; }
      .steps { list-style: none; margin: 0; padding: 0; }
      .step { margin-bottom: 0.85rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--line); }
      .step:last-child { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
      .step-head { display: flex; align-items: flex-start; gap: 0.55rem; margin-bottom: 0.35rem; }
      .step-num {
        flex-shrink: 0; width: 1.5rem; height: 1.5rem; border-radius: 999px;
        background: var(--red-soft); color: var(--red-dark); display: grid; place-items: center; font-size: 0.72rem;
      }
      .step-meta { font-size: 0.86rem; color: var(--muted); margin-bottom: 0.35rem; }
      .step-warn { font-size: 0.86rem; color: var(--red-dark); background: var(--red-soft); padding: 0.45rem 0.55rem; border-radius: 4px; }
      .spread-layout { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 0.75rem; align-items: start; }
      .spread-photo { width: 100%; border-radius: 8px; border: 1px solid var(--line); object-fit: cover; height: 2.35in; }
      .side-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
      .side-item { background: var(--cream); border: 1px solid var(--line); border-radius: 6px; padding: 0.5rem 0.6rem; }
      .side-item p { margin: 0; font-size: 0.84rem; color: var(--muted); }
      .tips-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
      .tip-card { background: var(--cream); border: 1px solid var(--line); border-radius: 6px; padding: 0.6rem 0.65rem; }
      .tip-card p { margin: 0; font-size: 0.88rem; color: var(--muted); }
      .quote {
        margin-top: 0.85rem; padding: 0.85rem 1rem; border-left: 3px solid var(--red);
        background: var(--cream); font-size: 1.05rem; line-height: 1.45; color: var(--charcoal);
      }
      .footer-line {
        margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--line);
        font-size: 0.68rem; color: var(--muted); text-align: center; letter-spacing: 0.06em;
      }
      .page-cover { display: flex; flex-direction: column; min-height: 9.85in; }
    </style>
  </head>
  <body>
    <!-- PAGE 1 — Header & Introduction -->
    <section class="page page-cover">
      <div class="brand-row">
        <div class="brand-lockup">
          <div class="brand-mark" aria-hidden="true">🔥</div>
          <div>
            <div class="brand">Firehall Meals</div>
            <div class="brand-tag">Station kitchen card</div>
          </div>
        </div>
        <div class="brand-tag">Sunday morning</div>
      </div>
      <p class="kicker">Firehall breakfast · Sauce only</p>
      <h1>${esc(RED_LEAD_PDF_COPY.header)}</h1>
      <p class="subtitle">${esc(RED_LEAD_PDF_COPY.subtitle)}</p>
      <img class="hero" src="${hero}" alt="Red Lead tomato sauce simmering in cast iron" />
      <div class="intro">
        ${introParagraphs}
      </div>
      <div class="meta-row">
        <div class="meta"><div class="label">Prep</div><strong>${RED_LEAD_SAUCE_PREP_MIN} min</strong></div>
        <div class="meta"><div class="label">Simmer</div><strong>${RED_LEAD_SAUCE_COOK_MIN} min</strong></div>
        <div class="meta"><div class="label">Pan</div><strong>12-inch cast iron</strong></div>
      </div>
      <div class="footer-line">FirehallMeals.com · For station kitchen use</div>
      <div class="page-num">1</div>
    </section>

    <!-- PAGE 2 — Why Firefighters Still Make It -->
    <section class="page">
      <div class="brand-row">
        <div class="brand-lockup">
          <div class="brand-mark" aria-hidden="true">🔥</div>
          <div class="brand">Firehall Meals</div>
        </div>
        <div class="brand-tag">${esc(RED_LEAD_PDF_COPY.whyItMatters.heading)}</div>
      </div>
      <h2>${esc(RED_LEAD_PDF_COPY.whyItMatters.heading)}</h2>
      ${whyParagraphs}
      <div class="note">
        <strong>This recipe makes only the Red Lead sauce.</strong> ${esc(RED_LEAD_PDF_COPY.recipeIntro)}
      </div>
      <div class="page-num">2</div>
    </section>

    <!-- PAGE 3 — Ingredients -->
    <section class="page">
      <div class="brand-row">
        <div class="brand-lockup">
          <div class="brand-mark" aria-hidden="true">🔥</div>
          <div class="brand">Firehall Meals</div>
        </div>
        <div class="brand-tag">Sauce only</div>
      </div>
      <h2>Ingredients</h2>
      <p class="muted">Tomato Red Lead sauce — scale for your crew. Cook eggs, bacon, sausage, toast, and potatoes separately.</p>
      <div class="scale-grid">${renderIngredients()}</div>
      <div class="page-num">3</div>
    </section>

    <!-- PAGE 4 — Step-by-Step Instructions -->
    <section class="page">
      <div class="brand-row">
        <div class="brand-lockup">
          <div class="brand-mark" aria-hidden="true">🔥</div>
          <div class="brand">Firehall Meals</div>
        </div>
        <div class="brand-tag">Sauce only</div>
      </div>
      <h2>${esc(RED_LEAD_PDF_COPY.stepsHeading)}</h2>
      <p class="muted">${esc(RED_LEAD_PDF_COPY.stepsIntro)}</p>
      <ol class="steps">${renderSteps()}</ol>
      <div class="page-num">4</div>
    </section>

    <!-- PAGE 5 — Firehall Tips, Serve It Like The Hall Does, Closing -->
    <section class="page">
      <div class="brand-row">
        <div class="brand-lockup">
          <div class="brand-mark" aria-hidden="true">🔥</div>
          <div class="brand">Firehall Meals</div>
        </div>
        <div class="brand-tag">Hall service</div>
      </div>
      <h2>${esc(RED_LEAD_PDF_COPY.tipsHeading)}</h2>
      <div class="tips-grid">${renderTips()}</div>

      <h2 style="margin-top:0.85rem">${esc(RED_LEAD_PDF_COPY.serveHeading)}</h2>
      <p>${esc(RED_LEAD_PDF_COPY.serveIntro)}</p>
      <div class="spread-layout">
        <div>
          <img class="spread-photo" src="${hero}" alt="Red Lead tomato sauce in cast iron at the centre of the hall table" />
        </div>
        <div>
          <img class="spread-photo" src="${spread}" alt="Hall breakfast spread with eggs, potatoes, and sides" />
        </div>
      </div>
      <div class="side-grid" style="margin-top:0.55rem">${renderSides()}</div>

      <blockquote class="quote">${esc(RED_LEAD_PDF_COPY.closingQuote)}</blockquote>

      <div style="margin-top:0.85rem;text-align:center">
        <div class="brand" style="font-size:1rem;color:var(--red-dark)">FirehallMeals.com</div>
        <div class="brand-tag" style="margin-top:0.25rem">Built by firefighters · Tested in the hall</div>
      </div>
      <div class="page-num">5</div>
    </section>
  </body>
</html>`;
}

function main() {
  const html = buildHtml();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, "utf8");
  console.log(`[lead-magnet:red-lead-html] Wrote ${OUT}`);
}

main();
