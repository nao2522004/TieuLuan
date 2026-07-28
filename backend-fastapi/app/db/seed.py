"""
Seed dữ liệu cơ bản cho FastAPI backend.

Chạy:
    python -m app.db.seed

Yêu cầu:
    - DB đã chạy schema (store_fastapi_schema.sql)
    - File .env đã cấu hình DATABASE_URL

Lưu ý:
    - Tất cả sản phẩm có stock_quantity = 0 (không có product_batches)
      -> mục đích test luồng nhập kho (POST /inventory/inbound) từ đầu.
    - Script idempotent: chạy nhiều lần không bị lỗi duplicate.
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

import bcrypt
import asyncpg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

RAW_DB_URL = os.environ.get("DATABASE_URL", "")
ASYNCPG_URL = RAW_DB_URL.replace("postgresql+asyncpg://", "postgresql://")


def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(plain.encode(), salt).decode()


def in_days(n: int):
    from datetime import datetime, timedelta, timezone, date
    return (datetime.now(timezone.utc) + timedelta(days=n)).date()


async def seed() -> None:
    print("=== BAT DAU SEED ===\n")
    conn = await asyncpg.connect(ASYNCPG_URL)

    try:
        # 1. BRANCH
        existing_branch = await conn.fetchrow(
            "SELECT id FROM branches WHERE name = $1", "Chi nhanh chinh"
        )
        if existing_branch is None:
            branch_id = await conn.fetchval(
                """
                INSERT INTO branches (name, address, phone, bank_bin, bank_account_no, bank_account_name)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
                """,
                "Chi nhanh chinh", "123 Duong ABC, Quan 1, TP.HCM", "0901234567",
                "970422", "0123456789", "NGUYEN VAN A",
            )
            print(f"[+] Da seed branch (id={branch_id}).")
        else:
            branch_id = existing_branch["id"]
            print(f"[=] Branch da ton tai (id={branch_id}), bo qua.")

        # 2. ROLES
        roles_to_seed = [
            {"code": "admin",   "name": "Quan tri vien", "description": "Quan tri vien he thong"},
            {"code": "leader",  "name": "Truong ca",      "description": "Truong quan ly ca lam viec"},
            {"code": "cashier", "name": "Thu ngan",       "description": "Nhan vien thu ngan ban hang"},
            {"code": "staff",   "name": "Nhan vien",      "description": "Nhan vien kho / tap vu"},
        ]
        role_ids: dict[str, int] = {}

        for r in roles_to_seed:
            existing = await conn.fetchrow("SELECT id FROM roles WHERE code = $1", r["code"])
            if existing is None:
                rid = await conn.fetchval(
                    "INSERT INTO roles (code, name, description) VALUES ($1, $2, $3) RETURNING id",
                    r["code"], r["name"], r["description"],
                )
                role_ids[r["code"]] = rid
                print(f"[+] Da seed role: {r['code']}")
            else:
                role_ids[r["code"]] = existing["id"]
        print(f"[=] Roles: {list(role_ids.keys())}")

        # 3. USERS
        users_to_seed = [
            {"full_name": "Quan tri vien",       "email": "admin@store.local",    "password": "Admin@123",    "role_code": "admin",   "branch_id": None,      "is_active": True},
            {"full_name": "Truong ca chinh",      "email": "leader@store.local",   "password": "Leader@123",   "role_code": "leader",  "branch_id": branch_id, "is_active": True},
            {"full_name": "Nhan vien thu ngan",   "email": "staff@store.local",    "password": "Staff@123",    "role_code": "cashier", "branch_id": branch_id, "is_active": True},
            {"full_name": "Thu ngan 1",           "email": "cashier1@store.local", "password": "Staff@123",    "role_code": "cashier", "branch_id": branch_id, "is_active": True},
            {"full_name": "Thu ngan 2",           "email": "cashier2@store.local", "password": "Staff@123",    "role_code": "cashier", "branch_id": branch_id, "is_active": True},
            {"full_name": "Thu ngan 3",           "email": "cashier3@store.local", "password": "Staff@123",    "role_code": "cashier", "branch_id": branch_id, "is_active": True},
            {"full_name": "Nhan vien da nghi viec","email": "disabled@store.local","password": "Disabled@123", "role_code": "cashier", "branch_id": branch_id, "is_active": False},
        ]
        user_ids: dict[str, int] = {}

        for u in users_to_seed:
            existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", u["email"])
            if existing is None:
                pw_hash = hash_password(u["password"])
                role_id = role_ids[u["role_code"]]
                uid = await conn.fetchval(
                    "INSERT INTO users (full_name, email, password_hash, role_id, is_active, branch_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
                    u["full_name"], u["email"], pw_hash, role_id, u["is_active"], u["branch_id"],
                )
                user_ids[u["email"]] = uid
                ur_exists = await conn.fetchrow("SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2", uid, role_id)
                if ur_exists is None:
                    await conn.execute("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", uid, role_id)
                print(f"[+] Da seed user: {u['email']} [{u['role_code']}]")
            else:
                uid = existing["id"]
                user_ids[u["email"]] = uid
                role_id = role_ids[u["role_code"]]
                ur_exists = await conn.fetchrow("SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2", uid, role_id)
                if ur_exists is None:
                    await conn.execute("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", uid, role_id)
                print(f"[=] User '{u['email']}' da ton tai, bo qua.")

        admin_id = user_ids["admin@store.local"]

        # 4. CATEGORIES
        category_names = ["Do uong", "Banh keo", "Thuc pham kho", "Do gia dung nho"]
        category_ids: dict[str, int] = {}
        for name in category_names:
            existing = await conn.fetchrow("SELECT id FROM categories WHERE name = $1", name)
            if existing is None:
                cid = await conn.fetchval("INSERT INTO categories (name) VALUES ($1) RETURNING id", name)
                category_ids[name] = cid
            else:
                category_ids[name] = existing["id"]
        print(f"[+] Da seed {len(category_names)} categories.")

        # 5. PRODUCTS (tat ca stock_quantity = 0)
        products_to_seed = [
            {"barcode": "8931234500016", "name": "Nuoc suoi Aquafina 500ml",      "unit": "chai",  "category": "Do uong",          "cost_price": 4000,   "sale_price": 6000,   "reorder_level": 20, "expiry_date": in_days(180), "note": "test inbound binh thuong"},
            {"barcode": "8931234500023", "name": "Banh Chocopie hop 12 cai",      "unit": "hop",   "category": "Banh keo",          "cost_price": 45000,  "sale_price": 65000,  "reorder_level": 10, "expiry_date": in_days(90),  "note": "Nhap it -> test alert ton thap"},
            {"barcode": "8931234500030", "name": "Sua tuoi Vinamilk hop 1L",      "unit": "hop",   "category": "Do uong",          "cost_price": 25000,  "sale_price": 32000,  "reorder_level": 10, "expiry_date": in_days(3),   "note": "Het han 3 ngay -> test expiring-soon alert"},
            {"barcode": "8931234500047", "name": "Mi goi Hao Hao (thung)",        "unit": "thung", "category": "Thuc pham kho",     "cost_price": 90000,  "sale_price": 120000, "reorder_level": 5,  "expiry_date": in_days(200), "note": "Nhap 1 -> test race condition"},
            {"barcode": "8931234500054", "name": "Bat lua Zippo mini",             "unit": "cai",   "category": "Do gia dung nho",  "cost_price": 15000,  "sale_price": 25000,  "reorder_level": 5,  "expiry_date": None,         "note": "Giu stock=0 -> test INVENTORY_INSUFFICIENT"},
            {"barcode": "8931234500061", "name": "Tra sua Phuc Long chai 350ml",  "unit": "chai",  "category": "Do uong",          "cost_price": 18000,  "sale_price": 28000,  "reorder_level": 15, "expiry_date": in_days(6),   "note": "Het han 6 ngay -> test expiry_pricing discount"},
            {"barcode": "8931234500078", "name": "Keo deo Haribo goi 250g",       "unit": "goi",   "category": "Banh keo",          "cost_price": 22000,  "sale_price": 35000,  "reorder_level": 8,  "expiry_date": in_days(120), "note": "Nhap nhieu lo -> test FEFO"},
            {"barcode": "8931234500085", "name": "Nuoc tang luc Sting chai 330ml","unit": "chai",  "category": "Do uong",          "cost_price": 9000,   "sale_price": 14000,  "reorder_level": 30, "expiry_date": in_days(365), "note": "Nhap nhieu -> test tong hop stock"},
        ]
        product_ids: dict[str, int] = {}
        for p in products_to_seed:
            existing = await conn.fetchrow(
                "SELECT id FROM products WHERE branch_id = $1 AND barcode = $2", branch_id, p["barcode"]
            )
            if existing is None:
                pid = await conn.fetchval(
                    """INSERT INTO products (branch_id, category_id, barcode, name, unit, cost_price, sale_price, stock_quantity, reorder_level, expiry_date)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id""",
                    branch_id, category_ids[p["category"]], p["barcode"], p["name"], p["unit"],
                    p["cost_price"], p["sale_price"], 0, p["reorder_level"], p["expiry_date"],
                )
                product_ids[p["barcode"]] = pid
                print(f"[+] [{p['barcode']}] {p['name']} <- {p['note']}")
            else:
                product_ids[p["barcode"]] = existing["id"]
                print(f"[=] Barcode '{p['barcode']}' da ton tai, bo qua.")

        print(f"\n[+] Da seed {len(products_to_seed)} products (tat ca stock_quantity = 0).")

        # 6. EXPIRY DISCOUNT RULES
        expiry_rules = [
            {"days_before_expiry": 30, "discount_percent": 10.00, "scope": "expiry"},
            {"days_before_expiry": 7,  "discount_percent": 30.00, "scope": "expiry"},
            {"days_before_expiry": 3,  "discount_percent": 50.00, "scope": "expiry"},
        ]
        for rule in expiry_rules:
            existing = await conn.fetchrow(
                "SELECT id FROM expiry_discount_rules WHERE days_before_expiry = $1 AND scope = $2 AND deleted_at IS NULL",
                rule["days_before_expiry"], rule["scope"],
            )
            if existing is None:
                await conn.execute(
                    "INSERT INTO expiry_discount_rules (days_before_expiry, discount_percent, scope, is_active) VALUES ($1, $2, $3, true)",
                    rule["days_before_expiry"], rule["discount_percent"], rule["scope"],
                )
                print(f"[+] Expiry rule: con {rule['days_before_expiry']} ngay -> giam {rule['discount_percent']}%")
            else:
                print(f"[=] Expiry rule {rule['days_before_expiry']} ngay da ton tai, bo qua.")

        # 7. PROMOTIONS
        promotions_to_seed = [
            {"code": "GIAM10",  "name": "Giam 10% cho don bat ky",           "type": "percent", "value": 10.00,   "min_order_amount": None,    "max_discount_amount": 50000},
            {"code": "GIAM20K", "name": "Giam 20000d cho don tu 100000d",    "type": "fixed",   "value": 20000.0, "min_order_amount": 100000.0, "max_discount_amount": None},
        ]
        for promo in promotions_to_seed:
            existing = await conn.fetchrow(
                "SELECT id FROM promotions WHERE code = $1 AND deleted_at IS NULL", promo["code"]
            )
            if existing is None:
                await conn.execute(
                    "INSERT INTO promotions (code, name, type, value, min_order_amount, max_discount_amount, is_active) VALUES ($1, $2, $3, $4, $5, $6, true)",
                    promo["code"], promo["name"], promo["type"], promo["value"],
                    promo["min_order_amount"], promo["max_discount_amount"],
                )
                print(f"[+] Promotion: [{promo['code']}] {promo['name']}")
            else:
                print(f"[=] Promotion '{promo['code']}' da ton tai, bo qua.")

        # Tong ket
        print("\n" + "=" * 55)
        print("=== SEED HOAN TAT ===")
        print("=" * 55)
        print("\nTai khoan de test:")
        print("  Admin    : admin@store.local    / Admin@123")
        print("  Leader   : leader@store.local   / Leader@123")
        print("  Staff    : staff@store.local    / Staff@123")
        print("  Cashier1 : cashier1@store.local / Staff@123")
        print("  Disabled : disabled@store.local / Disabled@123  <- test AUTH_ACCOUNT_DISABLED")
        print("\nLuong test nhap kho:")
        print("  1. POST /inventory/inbound  -> nhap lo hang (tao product_batch)")
        print("  2. GET  /products           -> kiem tra stock_quantity da tang")
        print("  3. POST /orders             -> tao don ban (tru kho theo FEFO)")
        print("\nBarcode 8931234500054 (Bat lua) giu stock=0 -> test INVENTORY_INSUFFICIENT")
        print("Swagger UI: http://localhost:8000/docs")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
