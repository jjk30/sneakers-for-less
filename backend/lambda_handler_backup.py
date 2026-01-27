import json
import boto3
import hashlib
import secrets
from urllib.parse import quote_plus

dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
products_table = dynamodb.Table('sneakers-for-less-products')
users_table = dynamodb.Table('sneakers-for-less-users')

API_VERSION = "7.1.0"
CATEGORIES = ['Basketball', 'Running', 'Lifestyle', 'Soccer', 'Cricket', 'Luxury', 'Slides', 'Dress']
BRANDS = ['Jordan', 'Nike', 'Adidas', 'New Balance', 'Puma', 'Converse', 'Asics', 'Salomon', 'On', 'Hoka', 'Crocs', 'Common Projects', 'Golden Goose', 'Allen Edmonds', 'Cole Haan']

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
}

def get_store_url(store_name, product_name):
    if store_name in STORE_URLS:
        return STORE_URLS[store_name](product_name)
    return f"https://www.google.com/search?q={quote_plus(store_name + ' ' + product_name)}"

def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return salt, hashed.hex()

def verify_password(password, salt, hashed):
    _, new_hash = hash_password(password, salt)
    return new_hash == hashed

def get_all_products():
    try:
        response = products_table.scan()
        products = response.get('Items', [])
        while 'LastEvaluatedKey' in response:
            response = products_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            products.extend(response.get('Items', []))
        return products
    except Exception as e:
        print(f"Error: {e}")
        return []

def search_products(query):
    query_lower = query.lower()
    products = get_all_products()
    results = []
    for product in products:
        name = product.get('name', '').lower()
        brand = product.get('brand', '').lower()
        category = product.get('category', '').lower()
        product_id = product.get('id', '').lower()
        if query_lower in name or query_lower in brand or query_lower in category or query_lower in product_id:
            results.append(product)
    return results

def get_products_by_category(category):
    products = get_all_products()
    return [p for p in products if p.get('category', '').lower() == category.lower()]

def get_products_by_brand(brand):
    products = get_all_products()
    return [p for p in products if p.get('brand', '').lower() == brand.lower()]

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
        'results': prices
    }

def format_product_list_item(product):
    prices_str = product.get('prices', '[]')
    prices = json.loads(prices_str) if isinstance(prices_str, str) else prices_str
    prices = sorted(prices, key=lambda x: x.get('price', 999999))
    lowest = prices[0]['price'] if prices else int(product.get('retail_price', 0))
    return {
        'id': product.get('id'),
        'name': product.get('name'),
        'brand': product.get('brand'),
        'category': product.get('category'),
        'image': product.get('image'),
        'retail_price': int(product.get('retail_price', 0)),
        'lowest_price': lowest,
        'condition': product.get('condition', 'new')
    }

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
        return True
    except Exception as e:
        print(f"Error saving product: {e}")
        return False

def delete_product(product_id):
    try:
        products_table.delete_item(Key={'id': product_id})
        return True
    except Exception as e:
        print(f"Error deleting product: {e}")
        return False

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
            'priceAlerts': '[]'
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

def handler(event, context):
    path = event.get('rawPath') or event.get('path') or '/'
    http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod', 'GET')
    query_params = event.get('queryStringParameters') or {}
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    try:
        if path == '/' or path == '':
            all_products = get_all_products()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
                'service': 'Sneakers For Less API',
                'version': API_VERSION,
                'database': 'DynamoDB',
                'total_products': len(all_products),
                'categories': CATEGORIES,
                'brands': BRANDS
            })}
        
        if path == '/api/search':
            query = query_params.get('q', '')
            if not query:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Missing q parameter'})}
            results = search_products(query)
            if not results:
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'query': query, 'results': [], 'message': 'No products found'})}
            response = format_product_response(results[0])
            response['query'] = query
            response['total_matches'] = len(results)
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(response)}
        
        if path == '/api/products':
            category = query_params.get('category')
            brand = query_params.get('brand')
            if category:
                products = get_products_by_category(category)
            elif brand:
                products = get_products_by_brand(brand)
            else:
                products = get_all_products()
            def get_lowest(p):
                pr = json.loads(p.get('prices', '[]')) if isinstance(p.get('prices'), str) else p.get('prices', [])
                return min((x.get('price', 999999) for x in pr), default=999999)
            products = sorted(products, key=get_lowest)
            formatted = [format_product_list_item(p) for p in products]
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'category': category, 'brand': brand, 'count': len(formatted), 'products': formatted})}
        
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
        
        if path == '/api/user/data' and http_method == 'GET':
            email = query_params.get('email', '')
            if not email:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Email required'})}
            data = get_user_data(email)
            if data:
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps(data)}
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'User not found'})}
        
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
        
        if path == '/api/admin/product' and http_method == 'POST':
            body = event.get('body', '{}')
            product_data = json.loads(body) if isinstance(body, str) else body
            if not product_data.get('id') or not product_data.get('name'):
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Product ID and name required'})}
            if add_or_update_product(product_data):
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'Failed to save'})}
        
        if path == '/api/admin/product' and http_method == 'DELETE':
            product_id = query_params.get('id')
            if not product_id:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Product ID required'})}
            if delete_product(product_id):
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'Failed to delete'})}
        
        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
    except Exception as e:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}
