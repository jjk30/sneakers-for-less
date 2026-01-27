import httpx
from typing import Optional
import asyncio
import re



SNEAKER_DATABASE = {
    "air jordan 1 retro high og": {
        "name": "Air Jordan 1 Retro High OG",
        "brand": "Jordan",
        "sku": "DZ5485-612",
        "retail_price": 180,
        "image": "https://images.stockx.com/images/Air-Jordan-1-Retro-High-OG-Chicago-Lost-and-Found-Product.jpg",
        "colorway": "Varsity Red/Black/Sail/Muslin",
        "prices": [
            {"store": "StockX", "price": 189, "condition": "New", "shipping": "Free", "url": "https://stockx.com/air-jordan-1-retro-high-og-chicago-lost-and-found"},
            {"store": "GOAT", "price": 195, "condition": "New", "shipping": "$15", "url": "https://goat.com/sneakers/air-jordan-1-retro-high-og-lost-and-found-dz5485-612"},
            {"store": "eBay", "price": 175, "condition": "New", "shipping": "$12", "url": "https://ebay.com/sch/i.html?_nkw=jordan+1+chicago"},
            {"store": "Flight Club", "price": 210, "condition": "New", "shipping": "Free", "url": "https://flightclub.com/air-jordan-1-retro-high-og"},
            {"store": "Stadium Goods", "price": 205, "condition": "New", "shipping": "$10", "url": "https://stadiumgoods.com"},
        ]
    },
    "jordan 1": {
        "name": "Air Jordan 1 Retro High OG",
        "brand": "Jordan",
        "sku": "DZ5485-612",
        "retail_price": 180,
        "image": "https://images.stockx.com/images/Air-Jordan-1-Retro-High-OG-Chicago-Lost-and-Found-Product.jpg",
        "colorway": "Varsity Red/Black/Sail/Muslin",
        "prices": [
            {"store": "StockX", "price": 189, "condition": "New", "shipping": "Free", "url": "https://stockx.com/air-jordan-1-retro-high-og-chicago-lost-and-found"},
            {"store": "GOAT", "price": 195, "condition": "New", "shipping": "$15", "url": "https://goat.com/sneakers/air-jordan-1-retro-high-og-lost-and-found-dz5485-612"},
            {"store": "eBay", "price": 175, "condition": "New", "shipping": "$12", "url": "https://ebay.com/sch/i.html?_nkw=jordan+1+chicago"},
            {"store": "Flight Club", "price": 210, "condition": "New", "shipping": "Free", "url": "https://flightclub.com/air-jordan-1-retro-high-og"},
        ]
    },
    "nike air max 1": {
        "name": "Nike Air Max 1 '86 OG Big Bubble",
        "brand": "Nike",
        "sku": "DQ3989-100",
        "retail_price": 150,
        "image": "https://images.stockx.com/images/Nike-Air-Max-1-86-OG-Big-Bubble-Sport-Red-2023-Product.jpg",
        "colorway": "White/University Red/Light Neutral Grey",
        "prices": [
            {"store": "eBay", "price": 128, "condition": "New", "shipping": "$10", "url": "https://ebay.com/sch/i.html?_nkw=air+max+1+big+bubble"},
            {"store": "StockX", "price": 142, "condition": "New", "shipping": "Free", "url": "https://stockx.com/nike-air-max-1-86-og-big-bubble-sport-red"},
            {"store": "GOAT", "price": 155, "condition": "New", "shipping": "$15", "url": "https://goat.com/sneakers/nike-air-max-1-86-og-big-bubble"},
            {"store": "Flight Club", "price": 165, "condition": "New", "shipping": "Free", "url": "https://flightclub.com"},
        ]
    },
    "nike air max": {
        "name": "Nike Air Max 1 '86 OG Big Bubble",
        "brand": "Nike",
        "sku": "DQ3989-100",
        "retail_price": 150,
        "image": "https://images.stockx.com/images/Nike-Air-Max-1-86-OG-Big-Bubble-Sport-Red-2023-Product.jpg",
        "colorway": "White/University Red/Light Neutral Grey",
        "prices": [
            {"store": "eBay", "price": 128, "condition": "New", "shipping": "$10", "url": "https://ebay.com/sch/i.html?_nkw=air+max+1+big+bubble"},
            {"store": "StockX", "price": 142, "condition": "New", "shipping": "Free", "url": "https://stockx.com/nike-air-max-1-86-og-big-bubble-sport-red"},
            {"store": "GOAT", "price": 155, "condition": "New", "shipping": "$15", "url": "https://goat.com/sneakers/nike-air-max-1-86-og-big-bubble"},
            {"store": "Flight Club", "price": 165, "condition": "New", "shipping": "Free", "url": "https://flightclub.com"},
        ]
    },
    "yeezy 350": {
        "name": "Adidas Yeezy Boost 350 V2 Onyx",
        "brand": "Adidas",
        "sku": "HQ4540",
        "retail_price": 230,
        "image": "https://images.stockx.com/images/adidas-Yeezy-Boost-350-V2-Onyx-Product.jpg",
        "colorway": "Onyx/Onyx/Onyx",
        "prices": [
            {"store": "eBay", "price": 195, "condition": "New", "shipping": "Free", "url": "https://ebay.com/sch/i.html?_nkw=yeezy+350+onyx"},
            {"store": "Grailed", "price": 205, "condition": "New", "shipping": "$10", "url": "https://grailed.com"},
            {"store": "GOAT", "price": 238, "condition": "New", "shipping": "$15", "url": "https://goat.com/sneakers/adidas-yeezy-boost-350-v2-onyx"},
            {"store": "StockX", "price": 245, "condition": "New", "shipping": "Free", "url": "https://stockx.com/adidas-yeezy-boost-350-v2-onyx"},
        ]
    },
    "yeezy boost 350": {
        "name": "Adidas Yeezy Boost 350 V2 Onyx",
        "brand": "Adidas",
        "sku": "HQ4540",
        "retail_price": 230,
        "image": "https://images.stockx.com/images/adidas-Yeezy-Boost-350-V2-Onyx-Product.jpg",
        "colorway": "Onyx/Onyx/Onyx",
        "prices": [
            {"store": "eBay", "price": 195, "condition": "New", "shipping": "Free", "url": "https://ebay.com/sch/i.html?_nkw=yeezy+350+onyx"},
            {"store": "Grailed", "price": 205, "condition": "New", "shipping": "$10", "url": "https://grailed.com"},
            {"store": "GOAT", "price": 238, "condition": "New", "shipping": "$15", "url": "https://goat.com/sneakers/adidas-yeezy-boost-350-v2-onyx"},
            {"store": "StockX", "price": 245, "condition": "New", "shipping": "Free", "url": "https://stockx.com/adidas-yeezy-boost-350-v2-onyx"},
        ]
    },
    "dunk low": {
        "name": "Nike Dunk Low Panda",
        "brand": "Nike",
        "sku": "DD1391-100",
        "retail_price": 110,
        "image": "https://images.stockx.com/images/Nike-Dunk-Low-Retro-White-Black-2021-Product.jpg",
        "colorway": "White/Black/White",
        "prices": [
            {"store": "eBay", "price": 89, "condition": "New", "shipping": "$8", "url": "https://ebay.com/sch/i.html?_nkw=nike+dunk+low+panda"},
            {"store": "StockX", "price": 98, "condition": "New", "shipping": "Free", "url": "https://stockx.com/nike-dunk-low-retro-white-black-2021"},
            {"store": "GOAT", "price": 105, "condition": "New", "shipping": "$15", "url": "https://goat.com/sneakers/nike-dunk-low-retro-white-black"},
            {"store": "Foot Locker", "price": 110, "condition": "New", "shipping": "Free", "url": "https://footlocker.com"},
        ]
    },
    "nike dunk": {
        "name": "Nike Dunk Low Panda",
        "brand": "Nike",
        "sku": "DD1391-100",
        "retail_price": 110,
        "image": "https://images.stockx.com/images/Nike-Dunk-Low-Retro-White-Black-2021-Product.jpg",
        "colorway": "White/Black/White",
        "prices": [
            {"store": "eBay", "price": 89, "condition": "New", "shipping": "$8", "url": "https://ebay.com/sch/i.html?_nkw=nike+dunk+low+panda"},
            {"store": "StockX", "price": 98, "condition": "New", "shipping": "Free", "url": "https://stockx.com/nike-dunk-low-retro-white-black-2021"},
            {"store": "GOAT", "price": 105, "condition": "New", "shipping": "$15", "url": "https://goat.com/sneakers/nike-dunk-low-retro-white-black"},
            {"store": "Foot Locker", "price": 110, "condition": "New", "shipping": "Free", "url": "https://footlocker.com"},
        ]
    },
    "new balance 550": {
        "name": "New Balance 550 White Green",
        "brand": "New Balance",
        "sku": "BB550WT1",
        "retail_price": 120,
        "image": "https://images.stockx.com/images/New-Balance-550-White-Green-Product.jpg",
        "colorway": "White/Green",
        "prices": [
            {"store": "eBay", "price": 85, "condition": "New", "shipping": "$10", "url": "https://ebay.com/sch/i.html?_nkw=new+balance+550"},
            {"store": "StockX", "price": 98, "condition": "New", "shipping": "Free", "url": "https://stockx.com/new-balance-550-white-green"},
            {"store": "GOAT", "price": 105, "condition": "New", "shipping": "$15", "url": "https://goat.com/sneakers/new-balance-550-white-green"},
            {"store": "New Balance", "price": 120, "condition": "New", "shipping": "Free", "url": "https://newbalance.com"},
        ]
    },
    "travis scott": {
        "name": "Nike Air Jordan 1 Low x Travis Scott Reverse Mocha",
        "brand": "Jordan",
        "sku": "DM7866-162",
        "retail_price": 150,
        "image": "https://images.stockx.com/images/Air-Jordan-1-Low-Travis-Scott-Reverse-Mocha-Product.jpg",
        "colorway": "Sail/University Red/Ridgerock/Black",
        "prices": [
            {"store": "eBay", "price": 850, "condition": "New", "shipping": "Free", "url": "https://ebay.com/sch/i.html?_nkw=travis+scott+reverse+mocha"},
            {"store": "StockX", "price": 920, "condition": "New", "shipping": "Free", "url": "https://stockx.com/air-jordan-1-low-travis-scott-reverse-mocha"},
            {"store": "GOAT", "price": 945, "condition": "New", "shipping": "$25", "url": "https://goat.com/sneakers/air-jordan-1-low-x-travis-scott-reverse-mocha"},
            {"store": "Flight Club", "price": 999, "condition": "New", "shipping": "Free", "url": "https://flightclub.com"},
        ]
    },
}


def search_sneakers(query: str) -> Optional[dict]:
    """
    Search for sneakers by name.
    Returns sneaker info with prices from multiple stores.
    """
    query_lower = query.lower().strip()
    
    # Direct match
    if query_lower in SNEAKER_DATABASE:
        sneaker = SNEAKER_DATABASE[query_lower].copy()
        sneaker["prices"] = sorted(sneaker["prices"], key=lambda x: x["price"])
        return sneaker
    
    # Partial match
    for key, sneaker in SNEAKER_DATABASE.items():
        if query_lower in key or key in query_lower:
            result = sneaker.copy()
            result["prices"] = sorted(result["prices"], key=lambda x: x["price"])
            return result
    
    # Fuzzy match - check if any word matches
    query_words = query_lower.split()
    for key, sneaker in SNEAKER_DATABASE.items():
        key_words = key.split()
        if any(qw in key_words for qw in query_words):
            result = sneaker.copy()
            result["prices"] = sorted(result["prices"], key=lambda x: x["price"])
            return result
    
    return None


def get_trending_sneakers() -> list[dict]:
    """
    Returns a list of trending/popular sneakers.
    """
    trending_keys = ["jordan 1", "dunk low", "yeezy 350", "travis scott", "new balance 550"]
    trending = []
    
    for key in trending_keys:
        if key in SNEAKER_DATABASE:
            sneaker = SNEAKER_DATABASE[key].copy()
            lowest_price = min(p["price"] for p in sneaker["prices"])
            trending.append({
                "name": sneaker["name"],
                "brand": sneaker["brand"],
                "image": sneaker["image"],
                "lowest_price": lowest_price,
                "retail_price": sneaker["retail_price"]
            })
    
    return trending