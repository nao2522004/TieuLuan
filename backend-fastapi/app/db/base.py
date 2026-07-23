from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """Base class chung cho tất cả SQLAlchemy models."""
    pass

from app.modules.roles.models import Role
from app.modules.users.models import User
from app.modules.auth.models import RefreshToken
from app.modules.branches.models import Branch
from app.modules.categories.models import Category
from app.modules.products.models import Product, ProductBatch
from app.modules.orders.models import Order, OrderItem, OrderItemBatch
from app.modules.inventory.models import InventoryTransaction
from app.modules.stocktakes.models import Stocktake, StocktakeItem
from app.modules.shifts.models import Shift, ShiftUser
from app.modules.promotions.models import Promotion
from app.modules.returns.models import Return
from app.modules.expiry_pricing.models import ExpiryDiscountRule
