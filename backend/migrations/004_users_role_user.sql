-- Compatibility migration: keep FK-safe behavior on existing local DBs.
-- The backend now supports both role storages:
--   legacy: admin/member
--   current: admin/user
DROP TABLE IF EXISTS users__new;
