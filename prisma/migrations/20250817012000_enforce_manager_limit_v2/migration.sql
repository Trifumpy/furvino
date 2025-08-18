-- Ensure max 5 managers per author and allow 0 minimum

-- Drop old triggers/function if present
DROP TRIGGER IF EXISTS author_manager_limit_ins ON "AuthorManager";
DROP TRIGGER IF EXISTS author_manager_limit_upd ON "AuthorManager";
DROP FUNCTION IF EXISTS enforce_author_manager_limit() CASCADE;

-- Create function
CREATE FUNCTION enforce_author_manager_limit() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF (SELECT COUNT(*) FROM "AuthorManager" WHERE "authorId" = NEW."authorId") >= 5 THEN
      RAISE EXCEPTION 'Author % already has 5 managers', NEW."authorId";
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW."authorId" IS DISTINCT FROM OLD."authorId" THEN
      IF (SELECT COUNT(*) FROM "AuthorManager" WHERE "authorId" = NEW."authorId") >= 5 THEN
        RAISE EXCEPTION 'Author % already has 5 managers', NEW."authorId";
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER author_manager_limit_ins
BEFORE INSERT ON "AuthorManager"
FOR EACH ROW EXECUTE FUNCTION enforce_author_manager_limit();

CREATE TRIGGER author_manager_limit_upd
BEFORE UPDATE ON "AuthorManager"
FOR EACH ROW EXECUTE FUNCTION enforce_author_manager_limit();


