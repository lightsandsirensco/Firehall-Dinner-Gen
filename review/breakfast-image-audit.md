# Breakfast Image Audit

- Recipes audited: **49**
- Passed: **26**
- Failed: **23**
- Duplicate hero groups: **14**
- Format/title passed (ignoring dupes): **49**
- Missing heroes: **0**

## Duplicate image groups

| Hash | Recipes | Recommended fix |
| --- | --- | --- |
| `2f4ae250e995…` | `apple-cinnamon-baked-oatmeal`, `big-pot-savory-oats` | `apple-cinnamon-baked-oatmeal` → `broccoli-oatmeal-breakfast-casserole`; `big-pot-savory-oats` → `broccoli-oatmeal-breakfast-casserole` |
| `45e160454d84…` | `bacon-egg-hash-skillet`, `bbq-breakfast-hash`, `steakhouse-hash-skillet`, `bacon-egg-hash` | `bacon-egg-hash-skillet` (canonical); `bbq-breakfast-hash` → `bacon-egg-hash-skillet`; `steakhouse-hash-skillet` → `bacon-egg-hash-skillet`; `bacon-egg-hash` → `bacon-egg-hash-skillet` |
| `668d840bfee5…` | `breakfast-crunchwraps`, `hall-breakfast-burritos`, `breakfast-burrito-bar` | `breakfast-crunchwraps` (canonical); `hall-breakfast-burritos` → `breakfast-crunchwraps`; `breakfast-burrito-bar` → `breakfast-crunchwraps` |
| `12cb71f0a3aa…` | `breakfast-sandwich-trays`, `sausage-egg-cheese-sandwiches`, `sheet-pan-breakfast-sandwiches` | `breakfast-sandwich-trays` → `sheet-pan-breakfast-sandwiches`; `sausage-egg-cheese-sandwiches` → `sheet-pan-breakfast-sandwiches`; `sheet-pan-breakfast-sandwiches` (canonical) |
| `37edb1fb0474…` | `buttermilk-pancakes`, `maple-sausage-pinwheels`, `protein-pancake-tray`, `pancake-short-stack` | `buttermilk-pancakes` → `maple-sausage-pinwheels`; `maple-sausage-pinwheels` (canonical); `protein-pancake-tray` → `maple-sausage-pinwheels`; `pancake-short-stack` → `maple-sausage-pinwheels` |
| `67ea7cf0b016…` | `cast-iron-breakfast-skillet`, `ham-pepper-skillet` | `cast-iron-breakfast-skillet` (canonical); `ham-pepper-skillet` → `cast-iron-breakfast-skillet` |
| `54b37a3e11da…` | `chorizo-breakfast-burritos`, `turkey-sausage-burritos` | `chorizo-breakfast-burritos` (canonical); `turkey-sausage-burritos` → `chorizo-breakfast-burritos` |
| `8d65d578203d…` | `chorizo-breakfast-hash`, `sheet-pan-breakfast-hash` | `chorizo-breakfast-hash` (canonical); `sheet-pan-breakfast-hash` → `chorizo-breakfast-hash` |
| `5b2fe9fd56e9…` | `cowboy-breakfast-skillet`, `red-lead-skillet` | `cowboy-breakfast-skillet` (canonical); `red-lead-skillet` → `cowboy-breakfast-skillet` |
| `bad24e39a440…` | `crew-french-toast-bake`, `overnight-french-toast-bake`, `french-toast-casserole` | `crew-french-toast-bake` → `overnight-french-toast-bake`; `overnight-french-toast-bake` (canonical); `french-toast-casserole` → `overnight-french-toast-bake` |
| `e3c651f0fad3…` | `denver-breakfast-casserole`, `ham-cheddar-egg-bake` | `denver-breakfast-casserole` → `ham-cheddar-egg-bake`; `ham-cheddar-egg-bake` (canonical) |
| `808f25656f73…` | `hall-sausage-biscuits-gravy`, `monte-cristo-sandwiches`, `biscuits-gravy` | `hall-sausage-biscuits-gravy` → `monte-cristo-sandwiches`; `monte-cristo-sandwiches` (canonical); `biscuits-gravy` → `monte-cristo-sandwiches` |
| `dd590ef976a9…` | `quick-egg-tacos`, `chorizo-breakfast-tacos` | `quick-egg-tacos` (canonical); `chorizo-breakfast-tacos` → `quick-egg-tacos` |
| `0516db35e921…` | `southwest-egg-bake`, `turkey-sausage-egg-bake` | `southwest-egg-bake` (canonical); `turkey-sausage-egg-bake` → `southwest-egg-bake` |

## Failed recipes

### Apple Cinnamon Baked Oatmeal (`apple-cinnamon-baked-oatmeal`) — breakfast_catalog
- Route: `/breakfast/apple-cinnamon-baked-oatmeal`
- Hero: `/images/breakfast/apple-cinnamon-baked-oatmeal.jpg`
- Formats: oats
- Duplicate peers: `big-pot-savory-oats`
- Recommended donor: `broccoli-oatmeal-breakfast-casserole`
- **critical** `duplicate_hero_hash`: hero MD5 shared with big-pot-savory-oats
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): big-pot-savory-oats

### BBQ Breakfast Hash (`bbq-breakfast-hash`) — breakfast_catalog
- Route: `/breakfast/bbq-breakfast-hash`
- Hero: `/images/breakfast/bbq-breakfast-hash.jpg`
- Formats: hash
- Duplicate peers: `bacon-egg-hash-skillet`, `steakhouse-hash-skillet`, `bacon-egg-hash`
- Recommended donor: `bacon-egg-hash-skillet`
- **critical** `duplicate_hero_hash`: hero MD5 shared with bacon-egg-hash-skillet, steakhouse-hash-skillet, bacon-egg-hash
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): bacon-egg-hash-skillet, steakhouse-hash-skillet, bacon-egg-hash

### Big-Pot Savory Oats (`big-pot-savory-oats`) — breakfast_catalog
- Route: `/breakfast/big-pot-savory-oats`
- Hero: `/images/breakfast/big-pot-savory-oats.jpg`
- Formats: oats
- Duplicate peers: `apple-cinnamon-baked-oatmeal`
- Recommended donor: `broccoli-oatmeal-breakfast-casserole`
- **critical** `duplicate_hero_hash`: hero MD5 shared with apple-cinnamon-baked-oatmeal
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): apple-cinnamon-baked-oatmeal

### Breakfast Sandwich Trays (`breakfast-sandwich-trays`) — breakfast_catalog
- Route: `/breakfast/breakfast-sandwich-trays`
- Hero: `/images/breakfast/breakfast-sandwich-trays.jpg`
- Formats: sandwich
- Duplicate peers: `sausage-egg-cheese-sandwiches`, `sheet-pan-breakfast-sandwiches`
- Recommended donor: `sheet-pan-breakfast-sandwiches`
- **critical** `duplicate_hero_hash`: hero MD5 shared with sausage-egg-cheese-sandwiches, sheet-pan-breakfast-sandwiches
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): sausage-egg-cheese-sandwiches, sheet-pan-breakfast-sandwiches

### Buttermilk Pancakes for the Crew (`buttermilk-pancakes`) — breakfast_catalog
- Route: `/breakfast/buttermilk-pancakes`
- Hero: `/images/breakfast/buttermilk-pancakes.jpg`
- Formats: other
- Duplicate peers: `maple-sausage-pinwheels`, `protein-pancake-tray`, `pancake-short-stack`
- Recommended donor: `maple-sausage-pinwheels`
- **critical** `duplicate_hero_hash`: hero MD5 shared with maple-sausage-pinwheels, protein-pancake-tray, pancake-short-stack
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): maple-sausage-pinwheels, protein-pancake-tray, pancake-short-stack

### Crew French Toast Bake (`crew-french-toast-bake`) — breakfast_catalog
- Route: `/breakfast/crew-french-toast-bake`
- Hero: `/images/breakfast/crew-french-toast-bake.jpg`
- Formats: casserole, french_toast
- Duplicate peers: `overnight-french-toast-bake`, `french-toast-casserole`
- Recommended donor: `overnight-french-toast-bake`
- **critical** `duplicate_hero_hash`: hero MD5 shared with overnight-french-toast-bake, french-toast-casserole
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): overnight-french-toast-bake, french-toast-casserole

### Denver Breakfast Casserole (`denver-breakfast-casserole`) — breakfast_catalog
- Route: `/breakfast/denver-breakfast-casserole`
- Hero: `/images/breakfast/denver-breakfast-casserole.jpg`
- Formats: casserole
- Duplicate peers: `ham-cheddar-egg-bake`
- Recommended donor: `ham-cheddar-egg-bake`
- **critical** `duplicate_hero_hash`: hero MD5 shared with ham-cheddar-egg-bake
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): ham-cheddar-egg-bake

### Hall Breakfast Burritos (`hall-breakfast-burritos`) — breakfast_catalog
- Route: `/breakfast/hall-breakfast-burritos`
- Hero: `/images/breakfast/hall-breakfast-burritos.jpg`
- Formats: other
- Duplicate peers: `breakfast-crunchwraps`, `breakfast-burrito-bar`
- Recommended donor: `breakfast-crunchwraps`
- **critical** `duplicate_hero_hash`: hero MD5 shared with breakfast-crunchwraps, breakfast-burrito-bar
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): breakfast-crunchwraps, breakfast-burrito-bar

### Hall Sausage Biscuits & Gravy (`hall-sausage-biscuits-gravy`) — breakfast_catalog
- Route: `/breakfast/hall-sausage-biscuits-gravy`
- Hero: `/images/breakfast/hall-sausage-biscuits-gravy.jpg`
- Formats: other
- Duplicate peers: `monte-cristo-sandwiches`, `biscuits-gravy`
- Recommended donor: `monte-cristo-sandwiches`
- **critical** `duplicate_hero_hash`: hero MD5 shared with monte-cristo-sandwiches, biscuits-gravy
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): monte-cristo-sandwiches, biscuits-gravy

### Ham & Pepper Breakfast Skillet (`ham-pepper-skillet`) — breakfast_catalog
- Route: `/breakfast/ham-pepper-skillet`
- Hero: `/images/breakfast/ham-pepper-skillet.jpg`
- Formats: skillet
- Duplicate peers: `cast-iron-breakfast-skillet`
- Recommended donor: `cast-iron-breakfast-skillet`
- **critical** `duplicate_hero_hash`: hero MD5 shared with cast-iron-breakfast-skillet
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): cast-iron-breakfast-skillet

### Protein Pancake Tray (`protein-pancake-tray`) — breakfast_catalog
- Route: `/breakfast/protein-pancake-tray`
- Hero: `/images/breakfast/protein-pancake-tray.jpg`
- Formats: pancake
- Duplicate peers: `buttermilk-pancakes`, `maple-sausage-pinwheels`, `pancake-short-stack`
- Recommended donor: `maple-sausage-pinwheels`
- **critical** `duplicate_hero_hash`: hero MD5 shared with buttermilk-pancakes, maple-sausage-pinwheels, pancake-short-stack
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): buttermilk-pancakes, maple-sausage-pinwheels, pancake-short-stack

### Red Lead Skillet (`red-lead-skillet`) — breakfast_catalog
- Route: `/breakfast/red-lead-skillet`
- Hero: `/images/breakfast/red-lead-skillet.jpg`
- Formats: skillet, red_lead
- Duplicate peers: `cowboy-breakfast-skillet`
- Recommended donor: `cowboy-breakfast-skillet`
- **critical** `duplicate_hero_hash`: hero MD5 shared with cowboy-breakfast-skillet
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): cowboy-breakfast-skillet

### Sausage Egg & Cheese Sandwiches (`sausage-egg-cheese-sandwiches`) — breakfast_catalog
- Route: `/breakfast/sausage-egg-cheese-sandwiches`
- Hero: `/images/breakfast/sausage-egg-cheese-sandwiches.jpg`
- Formats: other
- Duplicate peers: `breakfast-sandwich-trays`, `sheet-pan-breakfast-sandwiches`
- Recommended donor: `sheet-pan-breakfast-sandwiches`
- **critical** `duplicate_hero_hash`: hero MD5 shared with breakfast-sandwich-trays, sheet-pan-breakfast-sandwiches
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): breakfast-sandwich-trays, sheet-pan-breakfast-sandwiches

### Sheet Pan Breakfast Hash (`sheet-pan-breakfast-hash`) — breakfast_catalog
- Route: `/breakfast/sheet-pan-breakfast-hash`
- Hero: `/images/breakfast/sheet-pan-breakfast-hash.jpg`
- Formats: hash
- Duplicate peers: `chorizo-breakfast-hash`
- Recommended donor: `chorizo-breakfast-hash`
- **critical** `duplicate_hero_hash`: hero MD5 shared with chorizo-breakfast-hash
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): chorizo-breakfast-hash

### Steakhouse Hash Skillet (`steakhouse-hash-skillet`) — breakfast_catalog
- Route: `/breakfast/steakhouse-hash-skillet`
- Hero: `/images/breakfast/steakhouse-hash-skillet.jpg`
- Formats: hash, skillet
- Duplicate peers: `bacon-egg-hash-skillet`, `bbq-breakfast-hash`, `bacon-egg-hash`
- Recommended donor: `bacon-egg-hash-skillet`
- **critical** `duplicate_hero_hash`: hero MD5 shared with bacon-egg-hash-skillet, bbq-breakfast-hash, bacon-egg-hash
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): bacon-egg-hash-skillet, bbq-breakfast-hash, bacon-egg-hash

### Turkey Sausage Breakfast Burritos (`turkey-sausage-burritos`) — breakfast_catalog
- Route: `/breakfast/turkey-sausage-burritos`
- Hero: `/images/breakfast/turkey-sausage-burritos.jpg`
- Formats: other
- Duplicate peers: `chorizo-breakfast-burritos`
- Recommended donor: `chorizo-breakfast-burritos`
- **critical** `duplicate_hero_hash`: hero MD5 shared with chorizo-breakfast-burritos
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): chorizo-breakfast-burritos

### Turkey Sausage Egg Bake (`turkey-sausage-egg-bake`) — breakfast_catalog
- Route: `/breakfast/turkey-sausage-egg-bake`
- Hero: `/images/breakfast/turkey-sausage-egg-bake.jpg`
- Formats: casserole
- Duplicate peers: `southwest-egg-bake`
- Recommended donor: `southwest-egg-bake`
- **critical** `duplicate_hero_hash`: hero MD5 shared with southwest-egg-bake
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): southwest-egg-bake

### Breakfast Burrito Bar (`breakfast-burrito-bar`) — golden_100
- Route: `/recipes/breakfast-burrito-bar`
- Hero: `/images/golden-100/breakfast-burrito-bar.jpg`
- Formats: burrito
- Duplicate peers: `breakfast-crunchwraps`, `hall-breakfast-burritos`
- Recommended donor: `breakfast-crunchwraps`
- **critical** `duplicate_hero_hash`: hero MD5 shared with breakfast-crunchwraps, hall-breakfast-burritos
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): breakfast-crunchwraps, hall-breakfast-burritos

### Pancake Short Stack for the Crew (`pancake-short-stack`) — golden_100
- Route: `/recipes/pancake-short-stack`
- Hero: `/images/golden-100/pancake-short-stack.jpg`
- Formats: pancake
- Duplicate peers: `buttermilk-pancakes`, `maple-sausage-pinwheels`, `protein-pancake-tray`
- Recommended donor: `maple-sausage-pinwheels`
- **critical** `duplicate_hero_hash`: hero MD5 shared with buttermilk-pancakes, maple-sausage-pinwheels, protein-pancake-tray
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): buttermilk-pancakes, maple-sausage-pinwheels, protein-pancake-tray

### Bacon Egg Hash Brown Skillet (`bacon-egg-hash`) — golden_100
- Route: `/recipes/bacon-egg-hash`
- Hero: `/images/golden-100/bacon-egg-hash.jpg`
- Formats: hash, skillet
- Duplicate peers: `bacon-egg-hash-skillet`, `bbq-breakfast-hash`, `steakhouse-hash-skillet`
- Recommended donor: `bacon-egg-hash-skillet`
- **critical** `duplicate_hero_hash`: hero MD5 shared with bacon-egg-hash-skillet, bbq-breakfast-hash, steakhouse-hash-skillet
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): bacon-egg-hash-skillet, bbq-breakfast-hash, steakhouse-hash-skillet

### French Toast Casserole (`french-toast-casserole`) — golden_100
- Route: `/recipes/french-toast-casserole`
- Hero: `/images/golden-100/french-toast-casserole.jpg`
- Formats: casserole, french_toast
- Duplicate peers: `crew-french-toast-bake`, `overnight-french-toast-bake`
- Recommended donor: `overnight-french-toast-bake`
- **critical** `duplicate_hero_hash`: hero MD5 shared with crew-french-toast-bake, overnight-french-toast-bake
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): crew-french-toast-bake, overnight-french-toast-bake

### Chorizo Breakfast Tacos (`chorizo-breakfast-tacos`) — golden_100
- Route: `/recipes/chorizo-breakfast-tacos`
- Hero: `/images/golden-100/chorizo-breakfast-tacos.jpg`
- Formats: other
- Duplicate peers: `quick-egg-tacos`
- Recommended donor: `quick-egg-tacos`
- **critical** `duplicate_hero_hash`: hero MD5 shared with quick-egg-tacos
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): quick-egg-tacos

### Biscuits and Gravy (`biscuits-gravy`) — golden_100
- Route: `/recipes/biscuits-gravy`
- Hero: `/images/golden-100/biscuits-gravy.jpg`
- Formats: other
- Duplicate peers: `hall-sausage-biscuits-gravy`, `monte-cristo-sandwiches`
- Recommended donor: `monte-cristo-sandwiches`
- **critical** `duplicate_hero_hash`: hero MD5 shared with hall-sausage-biscuits-gravy, monte-cristo-sandwiches
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): hall-sausage-biscuits-gravy, monte-cristo-sandwiches
