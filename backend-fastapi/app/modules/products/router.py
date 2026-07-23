from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.products.schemas import CreateProductDto, UpdateProductDto, ProductResponseDto
from app.modules.products.service import ProductService
from app.modules.auth.dependencies import get_current_user_payload
from app.common.schemas import ApiSuccessResponse

router = APIRouter(prefix="/api/v1/products", tags=["products"])

@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary="Lấy danh sách sản phẩm (có phân trang)"
)
async def get_products(
    page: int = Query(default=1, ge=1, description="Trang hiện tại"),
    limit: int = Query(default=10, ge=1, le=100, description="Số lượng bản ghi trên mỗi trang"),
    db: AsyncSession = Depends(get_db)
):
    service = ProductService(db)
    data, meta = await service.get_products(page=page, limit=limit)
    return ApiSuccessResponse(data=data, meta=meta)

@router.get(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Lấy chi tiết sản phẩm theo ID"
)
async def get_product_by_id(
    product_id: int = Path(..., ge=1, description="ID sản phẩm dạng số nguyên dương"),
    db: AsyncSession = Depends(get_db)
):
    service = ProductService(db)
    data = await service.get_product_by_id(product_id)
    return ApiSuccessResponse(data=data)

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary="Tạo mới sản phẩm"
)
async def create_product(
    dto: CreateProductDto,
    db: AsyncSession = Depends(get_db),
    _user = Depends(get_current_user_payload)
):
    service = ProductService(db)
    data = await service.create_product(dto)
    return ApiSuccessResponse(data=data)

@router.patch(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Cập nhật thông tin sản phẩm"
)
async def update_product(
    dto: UpdateProductDto,
    product_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user = Depends(get_current_user_payload)
):
    service = ProductService(db)
    data = await service.update_product(product_id, dto)
    return ApiSuccessResponse(data=data)

@router.delete(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Xóa mềm sản phẩm"
)
async def delete_product(
    product_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user = Depends(get_current_user_payload)
):
    service = ProductService(db)
    await service.delete_product(product_id)
    return ApiSuccessResponse(data={"message": "Xóa sản phẩm thành công."})
