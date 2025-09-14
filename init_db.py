import os
import sys
from sqlalchemy import create_engine, text


def alembic_upgrade_head() -> None:
    try:
        from alembic.config import Config
        from alembic import command
    except Exception as e:
        print(f"[init_db] Alembic not available: {e}", file=sys.stderr)
        raise

    ini_path = os.path.join(os.getcwd(), "sic_backend_mvp_jwt_sqlite", "alembic.ini")
    if not os.path.exists(ini_path):
        print(f"[init_db] alembic.ini not found at {ini_path}", file=sys.stderr)
        raise SystemExit(2)
    cfg = Config(ini_path)
    command.upgrade(cfg, "head")


def verify_core_tables() -> None:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("[init_db] DATABASE_URL not set; skipping verification", file=sys.stderr)
        return
    eng = create_engine(db_url)
    with eng.connect() as conn:
        users = conn.execute(text("select to_regclass('public.users')")).scalar()
        if not users:
            raise RuntimeError("[init_db] verification failed: 'users' table missing after upgrade")


def main() -> int:
    print("[init_db] Running Alembic upgrade head…")
    alembic_upgrade_head()
    print("[init_db] Verifying core tables…")
    verify_core_tables()
    print("[init_db] Database initialized and verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

