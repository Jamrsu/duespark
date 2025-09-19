import logging
import os
from sqlalchemy import create_engine, text


logger = logging.getLogger("duespark.init_db")


def configure_logging() -> None:
    if logging.getLogger().handlers:
        return

    logging.basicConfig(
        level=os.getenv("DUESPARK_LOG_LEVEL", "INFO"),
        format='{"timestamp":"%(asctime)s","logger":"%(name)s","level":"%(levelname)s","message":"%(message)s"}'
    )


def alembic_upgrade_head() -> None:
    try:
        from alembic.config import Config
        from alembic import command
    except Exception:
        logger.exception("alembic not available")
        raise

    ini_path = os.path.join(os.getcwd(), "sic_backend_mvp_jwt_sqlite", "alembic.ini")
    if not os.path.exists(ini_path):
        logger.error("alembic.ini missing", extra={"path": ini_path})
        raise SystemExit(2)
    cfg = Config(ini_path)
    command.upgrade(cfg, "head")


def verify_core_tables() -> None:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        logger.warning("DATABASE_URL not set; skipping core table verification")
        return
    eng = create_engine(db_url)
    with eng.connect() as conn:
        users = conn.execute(text("select to_regclass('public.users')")).scalar()
        if not users:
            raise RuntimeError("[init_db] verification failed: 'users' table missing after upgrade")


def main() -> int:
    configure_logging()
    logger.info("running alembic upgrade head")
    alembic_upgrade_head()
    logger.info("verifying core tables")
    verify_core_tables()
    logger.info("database initialized and verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
