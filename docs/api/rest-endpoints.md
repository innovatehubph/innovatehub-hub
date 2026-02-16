# REST Endpoints

InnovateHub uses Back4App's Parse REST API for all data operations.

## Base URL

```
https://parseapi.back4app.com
```

## Authentication Headers

All requests require these headers:

```
X-Parse-Application-Id: YOUR_APP_ID
X-Parse-REST-API-Key: YOUR_REST_KEY
```

For admin operations, add:
```
X-Parse-Master-Key: YOUR_MASTER_KEY
```

## CRUD Operations

### Query Objects
```bash
curl -X GET \
  -H "X-Parse-Application-Id: APP_ID" \
  -H "X-Parse-REST-API-Key: REST_KEY" \
  'https://parseapi.back4app.com/classes/Product?where={"business":{"__type":"Pointer","className":"Business","objectId":"GTHxktOij6"}}&limit=20&order=-createdAt'
```

### Create Object
```bash
curl -X POST \
  -H "X-Parse-Application-Id: APP_ID" \
  -H "X-Parse-REST-API-Key: REST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Product","price":29.99,"business":{"__type":"Pointer","className":"Business","objectId":"GTHxktOij6"}}' \
  https://parseapi.back4app.com/classes/Product
```

### Update Object
```bash
curl -X PUT \
  -H "X-Parse-Application-Id: APP_ID" \
  -H "X-Parse-REST-API-Key: REST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"price":34.99}' \
  https://parseapi.back4app.com/classes/Product/OBJECT_ID
```

### Delete Object
```bash
curl -X DELETE \
  -H "X-Parse-Application-Id: APP_ID" \
  -H "X-Parse-REST-API-Key: REST_KEY" \
  https://parseapi.back4app.com/classes/Product/OBJECT_ID
```

## Cloud Function Calls

```bash
curl -X POST \
  -H "X-Parse-Application-Id: APP_ID" \
  -H "X-Parse-REST-API-Key: REST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"businessId":"GTHxktOij6"}' \
  https://parseapi.back4app.com/functions/getBusinessStats
```
