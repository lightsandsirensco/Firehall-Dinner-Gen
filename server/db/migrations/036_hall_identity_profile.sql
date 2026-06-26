-- Hall Identity profile: photo + optional motto

ALTER TABLE halls ADD COLUMN hall_photo_url TEXT;
ALTER TABLE halls ADD COLUMN motto TEXT;
