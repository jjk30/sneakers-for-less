import os
import json
import boto3
import hashlib
import secrets
import time
from urllib.parse import quote_plus
from decimal import Decimal

# Initialize DynamoDB outside handler for connection reuse (reduces cold start)
dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
products_table = dynamodb.Table('sneakers-for-less-products')
users_table = dynamodb.Table('sneakers-for-less-users')

API_VERSION = "8.0.0"  # Updated version with caching
CATEGORIES = ['Basketball', 'Running', 'Lifestyle', 'Soccer', 'Cricket', 'Luxury', 'Slides', 'Dress']
BRANDS = ['Jordan', 'Nike', 'Adidas', 'New Balance', 'Puma', 'Converse', 'Asics', 'Salomon', 'On', 'Hoka', 'Crocs', 'Common Projects', 'Golden Goose', 'Allen Edmonds', 'Cole Haan']

# ============================================
# IN-MEMORY CACHE (persists across warm Lambda invocations)
# ============================================
CACHE = {
    'products': None,
    'products_timestamp': 0,
    'deals': None,
    'deals_timestamp': 0
}
CACHE_TTL = 300  # 5 minutes cache

def get_cached_products():
    """Get products from cache or DynamoDB"""
    current_time = time.time()
    
    # Return cached if valid
    if CACHE['products'] and (current_time - CACHE['products_timestamp']) < CACHE_TTL:
        return CACHE['products']
    
    # Fetch from DynamoDB
    try:
        response = products_table.scan()
        products = response.get('Items', [])
        while 'LastEvaluatedKey' in response:
            response = products_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            products.extend(response.get('Items', []))
        
        # Convert Decimal to int/float for JSON serialization
        products = convert_decimals(products)
        
        # Update cache
        CACHE['products'] = products
        CACHE['products_timestamp'] = current_time
        
        return products
    except Exception as e:
        print(f"Error fetching products: {e}")
        return CACHE['products'] or []  # Return stale cache if available

def invalidate_cache():
    """Invalidate cache when products are modified"""
    CACHE['products'] = None
    CACHE['products_timestamp'] = 0
    CACHE['deals'] = None
    CACHE['deals_timestamp'] = 0

def convert_decimals(obj):
    """Convert DynamoDB Decimal types to Python int/float"""
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    else:
        return obj

# ============================================
# STORE URLs
# ============================================
STORE_URLS = {
    'eBay': lambda q: f"https://www.ebay.com/sch/i.html?_nkw={quote_plus(q)}",
    'StockX': lambda q: f"https://stockx.com/search?s={quote_plus(q)}",
    'GOAT': lambda q: f"https://www.goat.com/search?query={quote_plus(q)}",
    'Flight Club': lambda q: f"https://www.flightclub.com/catalogsearch/result/?q={quote_plus(q)}",
    'Nike': lambda q: f"https://www.nike.com/w?q={quote_plus(q)}",
    'Foot Locker': lambda q: f"https://www.footlocker.com/search?query={quote_plus(q)}",
    'Adidas': lambda q: f"https://www.adidas.com/us/search?q={quote_plus(q)}",
    'New Balance': lambda q: f"https://www.newbalance.com/search/?q={quote_plus(q)}",
    'Amazon': lambda q: f"https://www.amazon.com/s?k={quote_plus(q)}",
    'Stadium Goods': lambda q: f"https://www.stadiumgoods.com/search?q={quote_plus(q)}",
}

def get_store_url(store_name, product_name):
    if store_name in STORE_URLS:
        return STORE_URLS[store_name](product_name)
    return f"https://www.google.com/search?q={quote_plus(store_name + ' ' + product_name)}"

# ============================================
# PASSWORD HASHING
# ============================================
def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return salt, hashed.hex()

def verify_password(password, salt, hashed):
    _, new_hash = hash_password(password, salt)
    return new_hash == hashed

# ============================================
# OPTIMIZED SEARCH (uses cached data)
# ============================================
def search_products(query):
    """Optimized search using cached products"""
    query_lower = query.lower()
    query_words = query_lower.split()
    products = get_cached_products()
    
    scored_results = []
    for product in products:
        name = product.get('name', '').lower()
        brand = product.get('brand', '').lower()
        category = product.get('category', '').lower()
        product_id = product.get('id', '').lower()
        sku = product.get('sku', '').lower()
        
        # Calculate relevance score
        score = 0
        
        # Exact ID match (highest priority)
        if query_lower == product_id:
            score += 1000
        
        # SKU match
        if query_lower == sku:
            score += 500
        
        # Full query in name
        if query_lower in name:
            score += 100
        
        # All words match
        all_words_match = all(word in name or word in brand for word in query_words)
        if all_words_match:
            score += 50
        
        # Individual word matches
        for word in query_words:
            if word in name:
                score += 10
            if word in brand:
                score += 5
            if word in category:
                score += 3
        
        if score > 0:
            scored_results.append((score, product))
    
    # Sort by score descending
    scored_results.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in scored_results]

def get_products_by_category(category):
    """Get products by category using cached data"""
    products = get_cached_products()
    return [p for p in products if p.get('category', '').lower() == category.lower()]

def get_products_by_brand(brand):
    """Get products by brand using cached data"""
    products = get_cached_products()
    return [p for p in products if p.get('brand', '').lower() == brand.lower()]

# ============================================
# DEALS SECTION (products with biggest discounts)
# ============================================
def get_deals(limit=20):
    """Get products with biggest discounts from retail"""
    current_time = time.time()
    
    # Return cached deals if valid
    if CACHE['deals'] and (current_time - CACHE['deals_timestamp']) < CACHE_TTL:
        return CACHE['deals'][:limit]
    
    products = get_cached_products()
    deals = []
    
    for product in products:
        retail = int(product.get('retail_price', 0))
        if retail <= 0:
            continue
            
        prices_str = product.get('prices', '[]')
        prices = json.loads(prices_str) if isinstance(prices_str, str) else prices_str
        
        if not prices:
            continue
            
        lowest = min(p.get('price', 999999) for p in prices)
        
        if lowest < retail:
            discount = retail - lowest
            discount_percent = round((discount / retail) * 100)
            
            deals.append({
                'id': product.get('id'),
                'name': product.get('name'),
                'brand': product.get('brand'),
                'category': product.get('category'),
                'image': product.get('image'),
                'retail_price': retail,
                'lowest_price': lowest,
                'discount': discount,
                'discount_percent': discount_percent,
                'condition': product.get('condition', 'new')
            })
    
    # Sort by discount percentage descending
    deals.sort(key=lambda x: x['discount_percent'], reverse=True)
    
    # Cache the deals
    CACHE['deals'] = deals
    CACHE['deals_timestamp'] = current_time
    
    return deals[:limit]

# ============================================
# PRODUCT FORMATTING
# ============================================
def format_product_response(product):
    prices_str = product.get('prices', '[]')
    prices = json.loads(prices_str) if isinstance(prices_str, str) else prices_str
    prices = sorted(prices, key=lambda x: x.get('price', 999999))
    
    product_name = product.get('name', '')
    for price in prices:
        price['url'] = get_store_url(price.get('store', ''), product_name)
    
    retail = int(product.get('retail_price', 0))
    lowest = prices[0]['price'] if prices else retail
    
    return {
        'id': product.get('id'),
        'name': product_name,
        'brand': product.get('brand'),
        'category': product.get('category'),
        'sku': product.get('sku'),
        'retail_price': retail,
        'image': product.get('image'),
        'colorway': product.get('colorway'),
        'condition': product.get('condition', 'new'),
        'lowest_price': lowest,
        'savings': max(0, retail - lowest),
        'discount_percent': round(((retail - lowest) / retail) * 100) if retail > 0 and lowest < retail else 0,
        'results': prices
    }

def format_product_list_item(product):
    prices_str = product.get('prices', '[]')
    prices = json.loads(prices_str) if isinstance(prices_str, str) else prices_str
    prices = sorted(prices, key=lambda x: x.get('price', 999999))
    
    retail = int(product.get('retail_price', 0))
    lowest = prices[0]['price'] if prices else retail
    
    return {
        'id': product.get('id'),
        'name': product.get('name'),
        'brand': product.get('brand'),
        'category': product.get('category'),
        'image': product.get('image'),
        'retail_price': retail,
        'lowest_price': lowest,
        'discount_percent': round(((retail - lowest) / retail) * 100) if retail > 0 and lowest < retail else 0,
        'condition': product.get('condition', 'new')
    }

# ============================================
# ADMIN FUNCTIONS (with cache invalidation)
# ============================================
def add_or_update_product(product_data):
    try:
        item = {
            'id': product_data['id'],
            'name': product_data['name'],
            'brand': product_data['brand'],
            'category': product_data['category'],
            'sku': product_data.get('sku', 'N/A'),
            'retail_price': int(product_data.get('retail_price', 0)),
            'image': product_data.get('image', ''),
            'colorway': product_data.get('colorway', ''),
            'condition': product_data.get('condition', 'new'),
            'prices': json.dumps(product_data.get('prices', []))
        }
        products_table.put_item(Item=item)
        invalidate_cache()  # Clear cache when product changes
        return True
    except Exception as e:
        print(f"Error saving product: {e}")
        return False

def delete_product(product_id):
    try:
        products_table.delete_item(Key={'id': product_id})
        invalidate_cache()  # Clear cache when product deleted
        return True
    except Exception as e:
        print(f"Error deleting product: {e}")
        return False

# ============================================
# USER FUNCTIONS
# ============================================
def register_user(email, password):
    try:
        response = users_table.get_item(Key={'email': email.lower()})
        if 'Item' in response:
            return False, "Email already registered"
        
        salt, hashed = hash_password(password)
        users_table.put_item(Item={
            'email': email.lower(),
            'password_hash': hashed,
            'salt': salt,
            'role': 'user',
            'favorites': '[]',
            'priceAlerts': '[]',
            'created_at': int(time.time())
        })
        return True, "Registration successful"
    except Exception as e:
        return False, str(e)

def login_user(email, password):
    try:
        response = users_table.get_item(Key={'email': email.lower()})
        if 'Item' not in response:
            return False, "Invalid email or password"
        
        user = response['Item']
        if verify_password(password, user['salt'], user['password_hash']):
            return True, {"email": email.lower(), "role": user.get('role', 'user')}
        else:
            return False, "Invalid email or password"
    except Exception as e:
        return False, str(e)

def get_user_data(email):
    try:
        response = users_table.get_item(Key={'email': email.lower()})
        if 'Item' not in response:
            return None
        
        user = response['Item']
        favorites = user.get('favorites', '[]')
        alerts = user.get('priceAlerts', '[]')
        
        return {
            'favorites': json.loads(favorites) if isinstance(favorites, str) else favorites,
            'priceAlerts': json.loads(alerts) if isinstance(alerts, str) else alerts
        }
    except Exception as e:
        print(f"Error getting user data: {e}")
        return None

def save_user_favorites(email, favorites):
    try:
        users_table.update_item(
            Key={'email': email.lower()},
            UpdateExpression='SET favorites = :f',
            ExpressionAttributeValues={':f': json.dumps(favorites)}
        )
        return True
    except Exception as e:
        print(f"Error saving favorites: {e}")
        return False

def save_user_alerts(email, alerts):
    try:
        users_table.update_item(
            Key={'email': email.lower()},
            UpdateExpression='SET priceAlerts = :a',
            ExpressionAttributeValues={':a': json.dumps(alerts)}
        )
        return True
    except Exception as e:
        print(f"Error saving alerts: {e}")
        return False

# ============================================
# MAIN HANDLER
# ============================================
def handler(event, context):
    path = event.get('rawPath') or event.get('path') or '/'
    http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod', 'GET')
    query_params = event.get('queryStringParameters') or {}
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=60'  # Browser caching hint
    }
    
    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    try:
        # ============================================
        # ROOT - API Info
        # ============================================
        if path == '/' or path == '':
            all_products = get_cached_products()
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'service': 'Sneakers For Less API',
                    'version': API_VERSION,
                    'database': 'DynamoDB',
                    'caching': 'Enabled (5 min TTL)',
                    'total_products': len(all_products),
                    'categories': CATEGORIES,
                    'brands': BRANDS
                })
            }
        
        # ============================================
        # SEARCH
        # ============================================
        if path == '/api/search':
            query = query_params.get('q', '')
            if not query:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Missing q parameter'})}
            
            results = search_products(query)
            if not results:
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
                    'query': query,
                    'results': [],
                    'message': 'No products found'
                })}
            
            response = format_product_response(results[0])
            response['query'] = query
            response['total_matches'] = len(results)
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(response)}
        
        # ============================================
        # PRODUCTS LIST
        # ============================================
        if path == '/api/products':
            category = query_params.get('category')
            brand = query_params.get('brand')
            
            if category:
                products = get_products_by_category(category)
            elif brand:
                products = get_products_by_brand(brand)
            else:
                products = get_cached_products()
            
            # Sort by lowest price
            def get_lowest(p):
                pr = json.loads(p.get('prices', '[]')) if isinstance(p.get('prices'), str) else p.get('prices', [])
                return min((x.get('price', 999999) for x in pr), default=999999)
            
            products = sorted(products, key=get_lowest)
            formatted = [format_product_list_item(p) for p in products]
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'category': category,
                    'brand': brand,
                    'count': len(formatted),
                    'products': formatted
                })
            }
        
        # ============================================
        # DEALS - NEW ENDPOINT
        # ============================================
        if path == '/api/deals':
            limit = int(query_params.get('limit', 20))
            deals = get_deals(limit)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'count': len(deals),
                    'deals': deals
                })
            }
        
        # ============================================
        # AUTH - Register
        # ============================================
        if path == '/api/auth/register' and http_method == 'POST':
            body = event.get('body', '{}')
            data = json.loads(body) if isinstance(body, str) else body
            email = data.get('email', '').strip()
            password = data.get('password', '')
            
            if not email or not password:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Email and password required'})}
            if len(password) < 6:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Password must be at least 6 characters'})}
            
            success, message = register_user(email, password)
            if success:
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'message': message})}
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': message})}
        
        # ============================================
        # AUTH - Login
        # ============================================
        if path == '/api/auth/login' and http_method == 'POST':
            body = event.get('body', '{}')
            data = json.loads(body) if isinstance(body, str) else body
            email = data.get('email', '').strip()
            password = data.get('password', '')
            
            if not email or not password:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Email and password required'})}
            
            success, result = login_user(email, password)
            if success:
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'user': result})}
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': result})}
        
        # ============================================
        # USER DATA
        # ============================================
        if path == '/api/user/data' and http_method == 'GET':
            email = query_params.get('email', '')
            if not email:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Email required'})}
            
            data = get_user_data(email)
            if data:
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps(data)}
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'User not found'})}
        
        # ============================================
        # USER FAVORITES
        # ============================================
        if path == '/api/user/favorites' and http_method == 'POST':
            body = event.get('body', '{}')
            data = json.loads(body) if isinstance(body, str) else body
            email = data.get('email', '')
            favorites = data.get('favorites', [])
            
            if not email:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Email required'})}
            
            if save_user_favorites(email, favorites):
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'Failed to save'})}
        
        # ============================================
        # USER ALERTS
        # ============================================
        if path == '/api/user/alerts' and http_method == 'POST':
            body = event.get('body', '{}')
            data = json.loads(body) if isinstance(body, str) else body
            email = data.get('email', '')
            alerts = data.get('alerts', [])
            
            if not email:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Email required'})}
            
            if save_user_alerts(email, alerts):
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'Failed to save'})}
        
        # ============================================
        # ADMIN - Add/Update Product
        # ============================================
        if path == '/api/admin/product' and http_method == 'POST':
            provided_secret = (event.get('headers') or {}).get('x-admin-secret') or (event.get('headers') or {}).get('X-Admin-Secret', '')
            expected_secret = os.environ.get('ADMIN_SECRET', '')
            if not expected_secret or provided_secret != expected_secret:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Unauthorized'})}
        
        # ============================================
        # ADMIN - Delete Product
        # ============================================
        if path == '/api/admin/product' and http_method == 'DELETE':
           provided_secret = (event.get('headers') or {}).get('x-admin-secret') or (event.get('headers') or {}).get('X-Admin-Secret', '')
           expected_secret = os.environ.get('ADMIN_SECRET', '')
           if not expected_secret or provided_secret != expected_secret:
               return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Unauthorized'})}
        
        # ============================================
        # CACHE STATS - Debug endpoint
        # ============================================
        if path == '/api/cache/stats':
            current_time = time.time()
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'products_cached': CACHE['products'] is not None,
                    'products_count': len(CACHE['products']) if CACHE['products'] else 0,
                    'products_age_seconds': round(current_time - CACHE['products_timestamp']) if CACHE['products'] else None,
                    'cache_ttl': CACHE_TTL,
                    'deals_cached': CACHE['deals'] is not None
                })
            }
        
        # ============================================
        # 404 Not Found
        # ============================================
        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
        
    except Exception as e:
        print(f"Error: {e}")
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}