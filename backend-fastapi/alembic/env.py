import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from app.core.config import settings
from app.db.base import Base

from app.modules.roles.models import Role
from app.modules.branches.models import Branch
from app.modules.users.models import User, user_roles_table
from app.modules.auth.models import RefreshToken
from app.modules.categories.models import Category
from app.modules.products.models import Product, ProductBatch
from app.modules.inventory.models import InventoryTransaction
from app.modules.shifts.models import Shift, ShiftUser
from app.modules.orders.models import (
    Order,
    OrderItem,
    OrderItemBatch,
)
from app.modules.returns.models import Return  # noqa: F401,E402
from app.modules.promotions.models import Promotion  # noqa: F401,E402
from app.modules.expiry_pricing.models import ExpiryDiscountRule  # noqa: F401,E402
from app.modules.stocktakes.models import (  # noqa: F401,E402
    Stocktake,
    StocktakeItem,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
