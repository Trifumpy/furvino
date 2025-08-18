-- Drop author manager triggers, function, and table if they exist

-- Drop triggers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'author_manager_limit_ins') THEN
    EXECUTE 'DROP TRIGGER author_manager_limit_ins ON "AuthorManager"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'author_manager_limit_upd') THEN
    EXECUTE 'DROP TRIGGER author_manager_limit_upd ON "AuthorManager"';
  END IF;
END$$;

-- Drop function
DROP FUNCTION IF EXISTS enforce_author_manager_limit() CASCADE;

-- Drop table
DROP TABLE IF EXISTS "AuthorManager";


