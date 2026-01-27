from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from mangum import Mangum
from sneaker_service import search_sneakers, get_trending_sneakers

app = FastAPI(
    title="Sneakers For Less API",
    description="Find the cheapest sneaker prices across multiple stores",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PriceResult(BaseModel):
    store: str
    price: float
    condition: str
    shipping: str
    url: Optional[str] = None


class SneakerResponse(BaseModel):
    query: str
    name: str
    brand: str
    sku: Optional[str] = None
    retail_price: Optional[float] = None
    image: Optional[str] = None
    colorway: Optional[str] = None
    results: list[PriceResult]
    total_found: int
    savings: float


class TrendingSneaker(BaseModel):
    name: str
    brand: str
    image: str
    lowest_price: float
    retail_price: float


@app.get("/")
def root():
    return {
        "name": "Sneakers For Less API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/search")
def search(q: str):
    if not q or len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Search query too short")
    
    sneaker = search_sneakers(q)
    
    if not sneaker:
        return {
            "query": q,
            "name": None,
            "brand": None,
            "results": [],
            "total_found": 0,
            "savings": 0
        }
    
    prices = sneaker["prices"]
    savings = 0
    if len(prices) >= 2:
        price_values = [p["price"] for p in prices]
        savings = max(price_values) - min(price_values)
    
    return {
        "query": q,
        "name": sneaker["name"],
        "brand": sneaker["brand"],
        "sku": sneaker.get("sku"),
        "retail_price": sneaker.get("retail_price"),
        "image": sneaker.get("image"),
        "colorway": sneaker.get("colorway"),
        "results": prices,
        "total_found": len(prices),
        "savings": savings
    }


@app.get("/api/trending", response_model=list[TrendingSneaker])
def trending():
    return get_trending_sneakers()


@app.get("/api/stores")
def list_stores():
    return {
        "stores": [
            {"name": "StockX", "url": "https://stockx.com"},
            {"name": "GOAT", "url": "https://goat.com"},
            {"name": "eBay", "url": "https://ebay.com"},
            {"name": "Flight Club", "url": "https://flightclub.com"},
            {"name": "Stadium Goods", "url": "https://stadiumgoods.com"},
            {"name": "Grailed", "url": "https://grailed.com"},
            {"name": "Foot Locker", "url": "https://footlocker.com"},
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

handler = Mangum(app)