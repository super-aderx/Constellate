from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1 import router as v1_router
from app.db import close_pool


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    close_pool()


app = FastAPI(title="Constellate API", version="0.2.0", lifespan=lifespan)
app.include_router(v1_router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
