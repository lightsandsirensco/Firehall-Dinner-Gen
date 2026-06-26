-- Trim default staples to the 24-item hall list (no sweetener, sparkling water, english muffins, soy sauce)

UPDATE hall_canteen_items
SET archived = 1, updated_at = datetime('now')
WHERE is_default = 1
  AND name IN ('Sweetener', 'Sparkling Water', 'English Muffins', 'Soy Sauce');
