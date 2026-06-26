-- Kitchen staples tracker: new categories, three statuses only

UPDATE hall_canteen_items SET status = 'good'
WHERE status NOT IN ('good', 'running_low', 'out');

UPDATE hall_canteen_items SET archived = 1
WHERE name IN ('Dish Soap', 'Paper Towels', 'Garbage Bags', 'Propane');

UPDATE hall_canteen_items SET category = 'coffee_drinks'
WHERE name IN ('Coffee', 'Cream', 'Milk', 'Sugar', 'Sweetener', 'Tea', 'Juice', 'Pop', 'Sparkling Water');

UPDATE hall_canteen_items SET category = 'bread'
WHERE name IN ('Bread', 'Buns', 'Bagels', 'Tortillas', 'English Muffins');

UPDATE hall_canteen_items SET category = 'condiments'
WHERE name IN ('Ketchup', 'Mustard', 'Mayo', 'BBQ Sauce', 'Hot Sauce', 'Soy Sauce', 'Salad Dressing', 'Honey', 'Jam', 'Peanut Butter');

UPDATE hall_canteen_items SET category = 'staples'
WHERE name IN ('Butter', 'Cooking Oil', 'Salt', 'Pepper');

UPDATE hall_canteen_items SET archived = 1
WHERE lower(name) IN ('chicken', 'beef', 'pork', 'fish', 'eggs', 'egg', 'ground beef', 'ground turkey', 'turkey', 'bacon', 'sausage', 'steak', 'salmon', 'tuna', 'shrimp');

UPDATE hall_canteen_items SET category = 'custom', archived = 0
WHERE category IN ('kitchen', 'cleaning', 'equipment') AND archived = 0;

CREATE TABLE hall_canteen_items_new (
  item_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('coffee_drinks', 'bread', 'condiments', 'staples', 'custom')),
  status TEXT NOT NULL DEFAULT 'good' CHECK (status IN ('good', 'running_low', 'out')),
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  submitted_by_shift_id TEXT REFERENCES hall_shifts(shift_id) ON DELETE SET NULL,
  submitted_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  last_updated_by_shift_id TEXT REFERENCES hall_shifts(shift_id) ON DELETE SET NULL,
  last_updated_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO hall_canteen_items_new (
  item_id, hall_id, name, category, status, is_default, sort_order, note,
  submitted_by_shift_id, submitted_by_user_id, last_updated_by_shift_id,
  last_updated_by_user_id, archived, created_at, updated_at
)
SELECT
  item_id, hall_id, name,
  CASE
    WHEN category IN ('coffee_drinks', 'bread', 'condiments', 'staples', 'custom') THEN category
    ELSE 'custom'
  END,
  CASE
    WHEN status IN ('good', 'running_low', 'out') THEN status
    ELSE 'good'
  END,
  is_default, sort_order, note,
  submitted_by_shift_id, submitted_by_user_id, last_updated_by_shift_id,
  last_updated_by_user_id, archived, created_at, updated_at
FROM hall_canteen_items;

DROP TABLE hall_canteen_items;
ALTER TABLE hall_canteen_items_new RENAME TO hall_canteen_items;

CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_hall ON hall_canteen_items(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_status ON hall_canteen_items(hall_id, status);
CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_archived ON hall_canteen_items(hall_id, archived);
