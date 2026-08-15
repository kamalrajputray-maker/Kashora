import urllib.request
import json

url = "http://localhost:8000/api/v1/auth/register/seller/"
payload = {
    "phone": "9991234567",
    "email": "test.e2e@example.com",
    "password": "Seller@12345",
    "first_name": "Test",
    "last_name": "Seller",
    "business_name": "Test Business",
    "gst_number": "22AAAAA0000A1Z5",
    "pan_number": "ABCDE1234F"
}

req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode())
