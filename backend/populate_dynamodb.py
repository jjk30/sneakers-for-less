#!/usr/bin/env python3
"""
Populate DynamoDB with sneaker products from your existing lambda_handler.py

Usage:
1. Make sure you're in the backend folder: cd ~/Desktop/sneakers-for-less/backend
2. Run: python3 populate_dynamodb.py
"""
import boto3
import json
import sys

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
table = dynamodb.Table('sneakers-for-less-products')

def populate_from_existing():
    """Import and populate from existing lambda_handler.py"""
    try:
        # Try to import your existing SNEAKER_DATABASE
        from lambda_handler import SNEAKER_DATABASE
        print(f"Found {len(SNEAKER_DATABASE)} products in lambda_handler.py")
    except ImportError as e:
        print(f"Error importing: {e}")
        print("Make sure you're running this from the backend folder.")
        print("Run: cd ~/Desktop/sneakers-for-less/backend && python3 populate_dynamodb.py")
        sys.exit(1)
    
    success = 0
    errors = 0
    
    for product in SNEAKER_DATABASE:
        try:
            item = {
                'id': product['id'],
                'name': product['name'],
                'brand': product['brand'],
                'category': product['category'],
                'sku': product.get('sku', 'N/A'),
                'retail_price': product.get('retail_price', 0),
                'image': product.get('image', ''),
                'colorway': product.get('colorway', ''),
                'condition': product.get('condition', 'new'),
                'prices': json.dumps(product.get('prices', []))
            }
            
            table.put_item(Item=item)
            success += 1
            print(f"✓ [{success}] {product['name']}")
            
        except Exception as e:
            errors += 1
            print(f"✗ Error: {product.get('name', 'Unknown')} - {e}")
    
    print(f"\n{'='*50}")
    print(f"COMPLETE!")
    print(f"  ✓ Successfully added: {success}")
    print(f"  ✗ Errors: {errors}")
    print(f"{'='*50}")

if __name__ == "__main__":
    print("="*50)
    print("DynamoDB Population Script")
    print("="*50)
    populate_from_existing()
