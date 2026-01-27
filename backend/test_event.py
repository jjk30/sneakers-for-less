import json
import boto3

# Test the Lambda directly to see the event structure
lambda_client = boto3.client('lambda', region_name='us-east-2')

# Test with a path
response = lambda_client.invoke(
    FunctionName='sneakers-for-less-api',
    Payload=json.dumps({
        "httpMethod": "GET",
        "path": "/api/search",
        "queryStringParameters": {"q": "jordan"}
    })
)

result = json.loads(response['Payload'].read())
print(json.dumps(json.loads(result['body']), indent=2))
