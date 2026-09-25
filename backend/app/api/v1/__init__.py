from fastapi import APIRouter

from app.api.v1 import network, products, summary

router = APIRouter(prefix="/api/v1")
router.include_router(network.router)
router.include_router(products.router)
router.include_router(summary.router)
