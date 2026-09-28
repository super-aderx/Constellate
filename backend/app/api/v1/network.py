from typing import Annotated

from fastapi import APIRouter, Query

from app.db import DbDep
from app.schemas import Centrality, CentralityParams, Community, Network, NetworkFilters
from app.services import network

router = APIRouter(prefix="/network", tags=["network"])


@router.get("", response_model=Network)
def get_network(db: DbDep, filters: Annotated[NetworkFilters, Query()]):
    return network.get_network(db, filters)


@router.get("/communities", response_model=list[Community])
def get_communities(db: DbDep, filters: Annotated[NetworkFilters, Query()]):
    return network.get_communities(db, filters)


@router.get("/centrality", response_model=Centrality)
def get_centrality(db: DbDep, params: Annotated[CentralityParams, Query()]):
    return network.get_centrality(db, params)
