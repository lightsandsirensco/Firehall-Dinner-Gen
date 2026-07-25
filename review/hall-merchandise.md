# Hall Merchandise Management — Product Design

**Status:** Design only — do not implement until approved  
**Date:** 2026-07-17  
**Depends on:**  
- `review/hall-operations-design.md` (The Cabinet)  
- `review/inventory-system.md` (merchandise domain)  
- `review/canteen-payments.md` (optional dues link)

---

## 1. Purpose

Track what lives in the **locked cabinet**: hall shirts, hoodies, patches, coins, hats, stickers — stock, sizes, cost, sale price, and who bought what.

**Not** Shopify. **Not** a fashion PMS.  
It’s the clipboard on the cabinet door: what’s left in Medium, what we paid, what we charge, who still owes for a hoodie.

**Hall Ops name:** **The Cabinet** (`/hall/cabinet`)

---

## 2. Design principles

1. **Clipboard, not storefront** — managers log sales in the bay; members don’t browse a mall.  
2. **Variants are real** — size × colour is the unit of stock (SKU).  
3. **One tap sell** — pick item → size → mark sold.  
4. **Same inventory engine** — merchandise domain from Hall Inventory; Cabinet is the face.  
5. **Cash first** — record payment method; processors later.  
6. **Hall Pro** — full Cabinet is a Pro surface (preview soft-cap optional).  
7. **Future Hall Store** — public/online ordering is Phase 2+, not v1.  
8. **Station voice** — “Sold a Large black,” not “fulfilled line item.”

---

## 3. Product hierarchy

```
Merchandise catalog (style)
  └── Variant (SKU) = size × colour (+ optional print)
        └── Stock qty · cost · sale price
              └── Sales ledger events
```

| Layer | Example |
|-------|---------|
| **Style** | “2026 Hall Tee” |
| **Variant / SKU** | `TEE26-BLK-L` — Black / Large |
| **Sale** | Sam bought 1 on May 3, cash, receipt optional |

UI can group by style and expand sizes — stock always lives on the variant.

---

## 4. Categories (product types)

| Type | Code | Notes |
|------|------|-------|
| Shirts | `shirts` | Tees, polos |
| Hoodies | `hoodies` | Hoodies, crewnecks, sweaters |
| Patches | `patches` | Often one-size |
| Coins | `coins` | Challenge coins; usually OS |
| Hats | `hats` | Caps, toques; size optional |
| Stickers | `stickers` | Packs or singles |

Extensible later (`drinkware`, `other_merch`) without blocking v1.

---

## 5. Inventory model

### 5.1 Style fields

| Field | Required | Notes |
|-------|----------|-------|
| Name | ✓ | “Anniversary Hoodie” |
| Type / category | ✓ | shirts, hoodies, … |
| Photo | | Primary style image |
| Description / notes | | “Order closed — leftovers only” |
| Supplier | | Screen printer, coin vendor |
| Active / archived | ✓ | |

### 5.2 Variant (SKU) fields

| Field | Required | Notes |
|-------|----------|-------|
| **SKU** | ✓ | Auto-suggest from name+colour+size; editable |
| **Size** | ★ | S–5XL, OS, Youth; N/A for coins/stickers |
| **Colour** | ★ | Black, Navy, “Hi-Vis”; N/A allowed |
| **Cost** | | What hall paid per unit |
| **Sale price** | ✓ | What buyer pays |
| **Stock** | ✓ | On-hand qty |
| **Minimum stock** | | Below → Needs Attention |
| **Supplier** | | Override style supplier |
| **Barcode** | | Future |
| **Active / archived** | ✓ | |

★ Required when the type uses size/colour; coins default OS / N/A.

### 5.3 Stock actions (from Inventory design)

| Action | Merch use |
|--------|-----------|
| Receive | New order arrived |
| Adjust / Count | Cabinet audit |
| Transfer | Rare (location only in v1) |
| Archive | Style or variant retired |
| Mark low / out | Auto from min / zero |

---

## 6. Sales model

Every sale is a ledger row:

| Field | Required | Notes |
|-------|----------|-------|
| **Member** | ★ | Hall member; or “External / cash guest” |
| **Date** | ✓ | Default now |
| **Variant / SKU** | ✓ | |
| **Quantity** | ✓ | Usually 1 |
| **Payment** | ✓ | cash · etransfer · bank · other · dues_credit (opt) · unpaid |
| **Amount** | ✓ | Default sale_price × qty; editable |
| **Collected by** | ✓ | Who took money |
| **Receipt #** | | Optional |
| **Notes** | | “Probationary — half price” |
| **Status** | ✓ | `completed` · `unpaid` · `voided` |

★ Guest sales allowed with name note if not a linked member.

### Sale effects

1. Decrease variant stock  
2. Write `hall_merchandise_sales` (+ inventory ledger `sale`)  
3. If stock &lt; minimum → Needs Attention / alert  
4. If `unpaid` → show on “Owes for merch” list (light AR — not full dues)

### Unpaid / pay later

- Common: “grab a shirt, pay Friday”  
- Status `unpaid` until manager records payment (same sale row updated or payment child event)  
- Optional link: apply to **Canteen Dues** credit/debit (Phase 2)

---

## 7. Screens (The Cabinet)

### 7.1 Cabinet home — `/hall/cabinet`

```
┌─────────────────────────────────────────┐
│ The Cabinet                              │
│ Low stock: 2 · Unpaid: 1 · MTD $180     │
├─────────────────────────────────────────┤
│ [ Sell ]     [ Receive stock ]           │
├─────────────────────────────────────────┤
│ Needs Attention (sizes out / low)        │
├─────────────────────────────────────────┤
│ Styles (shirts, hoodies, …)              │
├─────────────────────────────────────────┤
│ Recent sales                             │
└─────────────────────────────────────────┘
```

### 7.2 Style detail

- Photo, supplier, notes  
- Size × colour grid with stock counts  
- Tap cell → Sell / Adjust  

### 7.3 Sell sheet (hero flow)

1. Pick style (or scan future barcode)  
2. Pick size / colour (big taps)  
3. Member (search roster)  
4. Payment method  
5. Confirm → done  

### 7.4 Sales log

Filter: date, member, unpaid, type. Void with reason.

### 7.5 Reports (simple)

- Revenue MTD / YTD  
- Units sold by style  
- Low / out sizes  
- Unpaid list  

No fashion analytics suite.

---

## 8. Permissions

| Action | Member | Canteen mgr | Captain |
|--------|:------:|:-------------:|:-------:|
| View Cabinet catalog | ✓* | ✓ | ✓ |
| View sales log / cost | | ✓ | ✓ |
| Sell / receive / adjust | | ✓ | ✓ |
| Create styles / SKUs | | ✓ | ✓ |
| See cost fields | | ✓ | ✓ |
| Void sale | | ✓ | ✓ |

\*Members may see “what’s available” if hall enables **member browse**; default **off** (managers sell). Self-serve browse is a step toward Hall Store.

---

## 9. Hall Pro & packaging

| Capability | Free linked hall | Hall Pro |
|------------|------------------|----------|
| Cabinet full inventory + sales | — | ✓ |
| Soft preview (e.g. 1 style) | Optional tease | — |
| Sales CSV export | — | ✓ |
| Low-stock → Run / alerts | — | ✓ |
| **Hall Store** (public) | — | Future Pro / add-on |
| Online ordering | — | Future |

Aligns with inventory design: merchandise is Pro-first.

---

## 10. Integration map

| System | Integration |
|--------|-------------|
| **Hall Inventory** | `domain=merchandise`; shared receive/adjust/ledger |
| **Needs Attention** | Low / out variants on Hall Home + Cabinet |
| **The Run** | Optional “Reorder Medium Black Tee” line (manager) |
| **Dues / Accounting** | Optional unpaid merch ↔ dues (Phase 2) |
| **Whiteboard** | For Sale note can link a SKU; “New shirts in” announcement |
| **Alerts** | Size out / unpaid aging |
| **Canteen** | Separate money (dues) vs merch sales — don’t mix KPIs |

---

## 11. Data model (conceptual)

```
hall_merch_styles
  style_id, hall_id, name, type, photo_url, supplier, notes, active, archived

hall_merch_variants          -- or hall_inventory_items where domain=merchandise
  variant_id, style_id, sku, size, colour, cost, sale_price,
  stock, min_stock, supplier, barcode, active, archived

hall_merchandise_sales
  sale_id, hall_id, variant_id, buyer_user_id?, buyer_label?,
  qty, unit_price, amount, method, collected_by, receipt_number,
  notes, status, sold_at, voided_at, void_reason

(reuse) hall_inventory_ledger  -- qty mutations including sale/receive
```

**Uniqueness:** `(hall_id, sku)` active; `(style_id, size, colour)` unique.

---

## 12. Future roadmap

### MERCH-1 — Cabinet v1 (clipboard)

Styles + variants (size/colour/SKU/cost/price/stock/min/supplier)  
Sell flow + sales log + unpaid  
Needs Attention  
Hall Pro gate  

### MERCH-2 — Polish

Photos, CSV, bulk receive (size run), barcode field entry  
Whiteboard / Run hooks  
Member browse toggle  

### MERCH-3 — Hall Store (internal)

Member-facing catalog inside the app: request / pay later / mark interest  
Still private to hall  

### MERCH-4 — Online ordering + public Hall Store

- Public or gated storefront page (`/hall/{slug}/store` or subdomain)  
- Cart · pickup at hall · online pay (Stripe/Square)  
- Inventory sync from Cabinet  
- SEO only if hall opts in (most won’t — fundraising, not retail brand)  

### MERCH-5 — Deeper Hall Pro

- Fundraising goals (“coin fund → $2k”)  
- Low-stock auto reorder suggestions  
- Supplier order sheets  

---

## 13. Engagement & ops habits

- After Receive: optional Whiteboard “Shirts are in — see Cabinet”  
- After Sell-out of a size: alert managers  
- Monthly: “Unpaid merch” digest for managers  
- Don’t gamify sales leaderboards (awkward in a hall)

---

## 14. Edge cases

| Case | Rule |
|------|------|
| One-size patch | Single variant OS |
| Colour-only sticker | Size = N/A |
| Wrong size sold | Void + re-sell correct SKU |
| Free promo shirt | Sale amount $0, method `other`, note “promo” |
| External buyer | `buyer_label`, no user_id |
| Cost unknown | Allow null cost; margin reports skip |
| Negative stock | Block; force Adjust |

---

## 15. Success metrics

| Metric | Signal |
|--------|--------|
| Styles with ≥1 sale / quarter | Adoption |
| Unpaid → paid conversion | Ops discipline |
| Time-to-sell (open sheet → confirm) | UX |
| Low-stock events resolved | Inventory health |
| YTD merch revenue (logged) | Fundraising clarity |

---

## 16. Risks & anti-goals

| Risk | Mitigation |
|------|------------|
| Building Shopify | No public cart in v1 |
| Size matrix hell | Start with common sizes; custom sizes as text |
| Shame on unpaid | Private manager list only |
| Mixing dues & merch totals | Separate KPIs |
| Photo / SKU busywork | Sell works with name+size only; SKU auto |

**Anti-goals:** Returns portal, shipping, tax engines, multi-hall marketplace, influencer merch drops.

---

## 17. One-line pitch

**The Cabinet is the hall merch clipboard — sizes and colours in stock, cost and sale price clear, every shirt and coin sale logged — with a real Hall Store only when the crew wants online orders.**

---

## 18. Approval checklist

- [ ] Style → variant (SKU) model approved  
- [ ] Types list approved (shirts → stickers)  
- [ ] Sale fields + unpaid flow approved  
- [ ] Member browse default off approved  
- [ ] Hall Pro packaging approved  
- [ ] Hall Store / online ordering deferred to MERCH-3/4 approved  
- [ ] Explicit go-ahead to implement (design-only until then)

---

*— End of Hall Merchandise Management design —*
