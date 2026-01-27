import json
import boto3
from urllib.parse import quote_plus
from decimal import Decimal

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
table = dynamodb.Table('sneakers-for-less-products')

# API Version
API_VERSION = "5.0.0"

# Categories and Brands (can also be derived from DB)
CATEGORIES = ['Basketball', 'Running', 'Lifestyle', 'Soccer', 'Cricket', 'Luxury', 'Slides', 'Dress']
BRANDS = ['Jordan', 'Nike', 'Adidas', 'New Balance', 'Puma', 'Converse', 'Asics', 'Salomon', 'On', 'Hoka', 'Crocs', 'Common Projects', 'Golden Goose', 'Allen Edmonds', 'Cole Haan']

# Store URL generators
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
    'Soccer.com': lambda q: f"https://www.soccer.com/search?q={quote_plus(q)}",
    'Puma': lambda q: f"https://us.puma.com/us/en/search?q={quote_plus(q)}",
    'Asics': lambda q: f"https://www.asics.com/us/en-us/search?q={quote_plus(q)}",
    'Salomon': lambda q: f"https://www.salomon.com/en-us/search?q={quote_plus(q)}",
    'On': lambda q: f"https://www.on-running.com/en-us/search?q={quote_plus(q)}",
    'Hoka': lambda q: f"https://www.hoka.com/en/us/search?q={quote_plus(q)}",
    'Crocs': lambda q: f"https://www.crocs.com/search?q={quote_plus(q)}",
}

def get_store_url(store_name, product_name):
    """Generate search URL for a store"""
    if store_name in STORE_URLS:
        return STORE_URLS[store_name](product_name)
    return f"https://www.google.com/search?q={quote_plus(store_name + ' ' + product_name)}"

def decimal_to_float(obj):
    """Convert DynamoDB Decimal to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def get_all_products():
    """Fetch all products from DynamoDB"""
    try:
        response = table.scan()
        products = response.get('Items', [])
        
        # Handle pagination if there are many products
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            products.extend(response.get('Items', []))
        
        return products
    except Exception as e:
        print(f"Error fetching products: {e}")
        return []

def search_products(query):
    """Search products by name, brand, or category"""
    query_lower = query.lower()
    products = get_all_products()
    
    results = []
    for product in products:
        name = product.get('name', '').lower()
        brand = product.get('brand', '').lower()
        category = product.get('category', '').lower()
        product_id = product.get('id', '').lower()
        
        if (query_lower in name or 
            query_lower in brand or 
            query_lower in category or
            query_lower in product_id):
            results.append(product)
    
    return results

def get_products_by_category(category):
    """Get products filtered by category"""
    products = get_all_products()
    return [p for p in products if p.get('category', '').lower() == category.lower()]

def get_products_by_brand(brand):
    """Get products filtered by brand"""
    products = get_all_products()
    return [p for p in products if p.get('brand', '').lower() == brand.lower()]

def format_product_response(product):
    """Format a product for API response"""
    # Parse prices from JSON string
    prices_str = product.get('prices', '[]')
    if isinstance(prices_str, str):
        prices = json.loads(prices_str)
    else:
        prices = prices_str
    
    # Sort prices by price (lowest first)
    prices = sorted(prices, key=lambda x: x.get('price', 999999))
    
    # Add URLs to prices
    product_name = product.get('name', '')
    for price in prices:
        price['url'] = get_store_url(price.get('store', ''), product_name)
    
    # Calculate savings
    retail = int(product.get('retail_price', 0))
    lowest = prices[0]['price'] if prices else retail
    savings = max(0, retail - lowest)
    
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
        'savings': savings,
        'results': prices
    }

def format_product_list_item(product):
    """Format a product for list view"""
    prices_str = product.get('prices', '[]')
    if isinstance(prices_str, str):
        prices = json.loads(prices_str)
    else:
        prices = prices_str
    
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

def handler(event, context):
    """Main Lambda handler"""
    
    # Get HTTP method and path
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    query_params = event.get('queryStringParameters') or {}
    
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    # Handle OPTIONS (CORS preflight)
    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    try:
        # Root endpoint - API info
        if path == '/' or path == '':
            all_products = get_all_products()
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'service': 'Sneakers For Less API',
                    'version': API_VERSION,
                    'database': 'DynamoDB',
                    'total_products': len(all_products),
                    'categories': CATEGORIES,
                    'brands': BRANDS,
                    'endpoints': ['/api/search', '/api/products']
                })
            }
        
        # Search endpoint
        if path == '/api/search':
            query = query_params.get('q', '')
            if not query:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Missing search query parameter "q"'})
                }
            
            results = search_products(query)
            
            if not results:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'query': query,
                        'results': [],
                        'message': 'No products found'
                    })
                }
            
            # Return best match with full details
            best_match = results[0]
            response = format_product_response(best_match)
            response['query'] = query
            response['total_matches'] = len(results)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(response)
            }
        
        # Products endpoint (browse by category/brand)
        if path == '/api/products':
            category = query_params.get('category')
            brand = query_params.get('brand')
            
            if category:
                products = get_products_by_category(category)
            elif brand:
                products = get_products_by_brand(brand)
            else:
                products = get_all_products()
            
            # Sort by lowest price
            def get_lowest_price(p):
                prices_str = p.get('prices', '[]')
                if isinstance(prices_str, str):
                    prices = json.loads(prices_str)
                else:
                    prices = prices_str
                if prices:
                    return min(pr.get('price', 999999) for pr in prices)
                return 999999
            
            products = sorted(products, key=get_lowest_price)
            
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
        
        # 404 for unknown paths
        return {
            'statusCode': 404,
            'headers': headers,
            'body': json.dumps({'error': 'Not found', 'path': path})
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
