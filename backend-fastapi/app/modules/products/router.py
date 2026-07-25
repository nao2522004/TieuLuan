from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, get_current_user, require_roles
from app.modules.products.schemas import (
    CreateProductDto,
    UpdateProductBatchDto,
    UpdateProductDto,
)
from app.modules.products.service import ProductService

router = APIRouter(prefix="/products", tags=["products"])


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary="Danh sách sản phẩm (phân trang, có cache Redis)",
)
async def get_products(
    page: int = Query(default=1, ge=1, description="tối thiểu là 1"),
    limit: int = Query(default=10, ge=1, le=100, description="tối đa là 100"),
    search: Optional[str] = Query(default=None, description="Tìm theo tên sản phẩm"),
    branch_id: Optional[int] = Query(default=None, gt=0),
    category_id: Optional[int] = Query(default=None, gt=0),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
):
    service = ProductService(db)
    data, meta = await service.get_products(page, limit, search, branch_id, category_id)
    return ApiSuccessResponse(data=data, meta=meta)


@router.get(
    "/alerts",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Cảnh báo tồn kho thấp (stock_quantity <= reorder_level) và lô sắp hết hạn "
        "(expiry_date trong X ngày tới, X = PRODUCT_EXPIRY_ALERT_DAYS). "
        "Luôn query trực tiếp DB, không dùng cache."
    ),
)
async def get_alerts(
    branch_id: Optional[int] = Query(default=None, gt=0),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = ProductService(db)
    data = await service.find_alerts(user, branch_id)
    return ApiSuccessResponse(data=data)


@router.get(
    "/barcode/{code}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Tra cứu sản phẩm theo barcode - tối ưu cho quầy POS",
)
async def get_by_barcode(
    code: str = Path(...),
    branch_id: Optional[int] = Query(default=None, gt=0),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = ProductService(db)
    data = await service.find_by_barcode(code, user, branch_id)
    return ApiSuccessResponse(data=data)


@router.get(
    "/low-stock",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary=(
        "Danh sách sản phẩm dưới ngưỡng tối thiểu (tồn thấp). "
        "Luôn query trực tiếp DB, không dùng cache."
    ),
)
async def get_low_stock(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    branch_id: Optional[int] = Query(default=None, gt=0),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = ProductService(db)
    data, meta = await service.find_low_stock_paginated(page, limit, user, branch_id)
    return ApiSuccessResponse(data=data, meta=meta)


@router.get(
    "/expiring-soon",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary=(
        "Danh sách lô hàng sắp hết hạn (query trực tiếp product_batches). "
        "Luôn query trực tiếp DB, không dùng cache."
    ),
)
async def get_expiring_soon(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    days: Optional[int] = Query(
        default=None, ge=1, description="Số ngày tính sản phẩm sắp hết hạn"
    ),
    branch_id: Optional[int] = Query(default=None, gt=0),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = ProductService(db)
    data, meta = await service.find_expiring_soon_paginated(
        page, limit, days, user, branch_id
    )
    return ApiSuccessResponse(data=data, meta=meta)


@router.get(
    "/{product_id}/batches",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary="Danh sách lô hàng của sản phẩm, sắp xếp FEFO (hạn sớm lên trước)",
)
async def get_product_batches(
    product_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
):
    service = ProductService(db)
    data = await service.find_batches_by_product(product_id)
    return ApiSuccessResponse(data=data)


@router.get(
    "/{product_id}/quote",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Báo giá real-time cho N đơn vị hàng, mô phỏng FEFO không khóa/không ghi DB. "
        "Dùng cho preview trước khi thanh toán (POS)."
    ),
)
async def get_quote(
    product_id: int = Path(..., ge=1),
    quantity: int = Query(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
):
    service = ProductService(db)
    data = await service.quote_effective_price(product_id, quantity)
    return ApiSuccessResponse(data=data)


@router.get(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Chi tiết 1 sản phẩm (có cache Redis)",
)
async def get_product_by_id(
    product_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
):
    service = ProductService(db)
    data = await service.get_product_by_id(product_id)
    return ApiSuccessResponse(data=data)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary="Tạo sản phẩm mới (chỉ admin)",
)
async def create_product(
    dto: CreateProductDto,
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = ProductService(db)
    data = await service.create_product(dto)
    return ApiSuccessResponse(data=data)


@router.patch(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Cập nhật sản phẩm (chỉ admin) - evict cache Redis ngay lập tức",
)
async def update_product(
    dto: UpdateProductDto,
    product_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = ProductService(db)
    data = await service.update_product(product_id, dto)
    return ApiSuccessResponse(data=data)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Xóa sản phẩm (soft delete, chỉ admin)",
)
async def delete_product(
    product_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = ProductService(db)
    data = await service.delete_product(product_id)
    return ApiSuccessResponse(data=data)


product_batches_router = APIRouter(prefix="/product-batches", tags=["product-batches"])


@product_batches_router.patch(
    "/{batch_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Cập nhật thông tin lô hàng (chỉ admin). "
        "Scope cho phép: batch_code, expiry_date, unit_cost."
    ),
)
async def update_batch(
    dto: UpdateProductBatchDto,
    batch_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = ProductService(db)
    data = await service.update_batch(batch_id, dto)
    return ApiSuccessResponse(data=data)
