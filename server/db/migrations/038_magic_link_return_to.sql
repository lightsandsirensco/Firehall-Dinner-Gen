-- Store intended destination for magic-link sign-in completion redirects.

ALTER TABLE auth_magic_links ADD COLUMN return_to TEXT;
