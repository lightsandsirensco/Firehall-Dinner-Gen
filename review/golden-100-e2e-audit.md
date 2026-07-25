# Golden 100 — E2E audit report

Generated: **2026-07-24T02:21:19.980Z**

- **PASS**: 75
- **FAIL**: 11
- **WARN**: 21
- **TOTAL**: 104

## Issues

### __index__

- **FAIL** `index_invalid`: index.json recipes length=104 (expected 100)
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\index.json`
  - **fix**: Regenerate Golden 100 index.json.

### 30-minute-pasta-e-fagioli-for-the-hall

- **WARN** `page_weak_title`: title_pasta_no_pasta
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\30-minute-pasta-e-fagioli-for-the-hall.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.
- **FAIL** `heroImage_missing_local_file`: heroImage points to missing file (/images/golden-100/30-minute-pasta-e-fagioli-for-the-hall.jpg)
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\images\golden-100\30-minute-pasta-e-fagioli-for-the-hall.jpg`
  - **fix**: Generate or add the image under client/public/images/ (run catalog:generate-images).
- **FAIL** `thumbImage_missing_local_file`: thumbImage points to missing file (/images/thumbs/30-minute-pasta-e-fagioli-for-the-hall.jpg)
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\images\thumbs\30-minute-pasta-e-fagioli-for-the-hall.jpg`
  - **fix**: Generate or add the image under client/public/images/ (run catalog:generate-images).
- **FAIL** `db_not_seeded`: slug not present in curated_recipes
  - **fix**: Seed curated DB for this slug (golden-100 seeding step).

### beef-barley-soup

- **FAIL** `page_few_steps`: fewer than 4 instruction steps for crew cooking
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\beef-barley-soup.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### breakfast-burrito-bar

- **WARN** `page_weak_title`: title_taco_no_tortilla
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\breakfast-burrito-bar.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### chicken-quesadillas

- **WARN** `page_weak_title`: title_taco_no_tortilla
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\chicken-quesadillas.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### chicken-tortilla-soup-for-the-hall

- **FAIL** `db_not_seeded`: slug not present in curated_recipes
  - **fix**: Seed curated DB for this slug (golden-100 seeding step).

### chorizo-breakfast-tacos

- **WARN** `page_weak_title`: title_taco_no_tortilla
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\chorizo-breakfast-tacos.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### enchilada-casserole

- **WARN** `page_weak_title`: title_taco_no_tortilla
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\enchilada-casserole.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### fast-philly-skillet

- **WARN** `page_weak_title`: robotic_title; generic_opener
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\fast-philly-skillet.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### five-ingredient-pasta

- **WARN** `page_weak_title`: title_pasta_no_pasta
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\five-ingredient-pasta.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### four-step-chicken-piccata

- **FAIL** `db_not_seeded`: slug not present in curated_recipes
  - **fix**: Seed curated DB for this slug (golden-100 seeding step).

### french-onion-soup-for-the-hall

- **FAIL** `heroImage_missing_local_file`: heroImage points to missing file (/images/golden-100/french-onion-soup-for-the-hall.jpg)
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\images\golden-100\french-onion-soup-for-the-hall.jpg`
  - **fix**: Generate or add the image under client/public/images/ (run catalog:generate-images).
- **FAIL** `thumbImage_missing_local_file`: thumbImage points to missing file (/images/thumbs/french-onion-soup-for-the-hall.jpg)
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\images\thumbs\french-onion-soup-for-the-hall.jpg`
  - **fix**: Generate or add the image under client/public/images/ (run catalog:generate-images).
- **FAIL** `db_not_seeded`: slug not present in curated_recipes
  - **fix**: Seed curated DB for this slug (golden-100 seeding step).

### game-day-nachos

- **WARN** `page_weak_title`: title_taco_no_tortilla
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\game-day-nachos.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### greek-chicken-bowls

- **WARN** `page_weak_title`: robotic_title
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\greek-chicken-bowls.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### hall-taco-bar

- **WARN** `page_weak_title`: title_taco_no_tortilla
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\hall-taco-bar.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### jambalaya

- **WARN** `page_weak_title`: robotic_title
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\jambalaya.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### loaded-nacho-skillet

- **WARN** `page_weak_title`: robotic_title; title_taco_no_tortilla
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\loaded-nacho-skillet.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### mediterranean-chickpea

- **WARN** `page_weak_title`: robotic_title
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\mediterranean-chickpea.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### pasta-e-ceci-for-the-hall

- **WARN** `page_weak_title`: title_pasta_no_pasta
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\pasta-e-ceci-for-the-hall.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.
- **FAIL** `db_not_seeded`: slug not present in curated_recipes
  - **fix**: Seed curated DB for this slug (golden-100 seeding step).

### performance-burrito-bowls

- **WARN** `page_weak_title`: title_taco_no_tortilla
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\performance-burrito-bowls.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### philly-cheesesteak-skillet

- **WARN** `page_weak_title`: robotic_title
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\philly-cheesesteak-skillet.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### pork-carnitas-tacos

- **WARN** `page_weak_title`: title_taco_no_tortilla
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\pork-carnitas-tacos.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### red-beans-and-rice-for-the-hall

- **FAIL** `db_not_seeded`: slug not present in curated_recipes
  - **fix**: Seed curated DB for this slug (golden-100 seeding step).

### sheet-pan-fajitas

- **WARN** `page_weak_title`: title_taco_no_tortilla
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\sheet-pan-fajitas.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### sheet-pan-parmesan-dijon-chicken-thigh-dinner

- **WARN** `page_weak_title`: robotic_title
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\sheet-pan-parmesan-dijon-chicken-thigh-dinner.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.
- **FAIL** `db_not_seeded`: slug not present in curated_recipes
  - **fix**: Seed curated DB for this slug (golden-100 seeding step).

### spaghetti-aglio-e-olio-for-the-hall

- **FAIL** `heroImage_missing_local_file`: heroImage points to missing file (/images/golden-100/spaghetti-aglio-e-olio-for-the-hall.jpg)
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\images\golden-100\spaghetti-aglio-e-olio-for-the-hall.jpg`
  - **fix**: Generate or add the image under client/public/images/ (run catalog:generate-images).
- **FAIL** `thumbImage_missing_local_file`: thumbImage points to missing file (/images/thumbs/spaghetti-aglio-e-olio-for-the-hall.jpg)
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\images\thumbs\spaghetti-aglio-e-olio-for-the-hall.jpg`
  - **fix**: Generate or add the image under client/public/images/ (run catalog:generate-images).
- **FAIL** `db_not_seeded`: slug not present in curated_recipes
  - **fix**: Seed curated DB for this slug (golden-100 seeding step).

### spicy-tomato-bisque-grilled-brie-toast

- **FAIL** `db_not_seeded`: slug not present in curated_recipes
  - **fix**: Seed curated DB for this slug (golden-100 seeding step).

### steak-tacos

- **WARN** `page_weak_title`: title_taco_no_tortilla
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\steak-tacos.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### thai-basil-chicken

- **WARN** `page_weak_title`: robotic_title
  - **path**: `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen\client\public\catalog\golden-100\pages\thai-basil-chicken.json`
  - **fix**: Regenerate page copy or manually edit weak steps/title.

### tomato-soup-grilled-cheese-croutons

- **FAIL** `db_not_seeded`: slug not present in curated_recipes
  - **fix**: Seed curated DB for this slug (golden-100 seeding step).

