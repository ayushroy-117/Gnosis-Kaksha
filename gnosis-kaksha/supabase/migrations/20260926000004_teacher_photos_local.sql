-- Teacher photos pointed at the old site (https://gnosiskaksha.in/php/...),
-- whose TLS certificate is invalid, so they failed to load. The same files
-- ship with the app under /public/teachers. Idempotent.
update public.teachers
  set photo_url = '/teachers/' || regexp_replace(photo_url, '^.*/uploaded_profile/', '')
  where photo_url like 'https://gnosiskaksha.in/php/uploaded_profile/%';
