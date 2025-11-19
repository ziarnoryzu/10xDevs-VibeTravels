#!/bin/bash

# Test script for Note API error handling
BASE_URL="http://localhost:3000/10x-project/api/notes"
VALID_NOTE_ID="d852b3c7-8cf1-4bce-ab9f-9d6ef509f3d6"
INVALID_UUID="not-a-valid-uuid"
NON_EXISTENT_UUID="00000000-0000-0000-0000-000000000000"

echo "=========================================="
echo "Testing Note API Error Handling"
echo "=========================================="
echo ""

# Test 1: GET with non-existent UUID (should return 404)
echo "1. Testing GET with non-existent UUID (expecting 404)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/$NON_EXISTENT_UUID")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
if [ "$HTTP_CODE" = "404" ]; then
  echo "✓ Correctly returned 404"
else
  echo "✗ Expected 404, got $HTTP_CODE"
fi
echo ""

# Test 2: GET with invalid UUID format (should return 400)
echo "2. Testing GET with invalid UUID format (expecting 400)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/$INVALID_UUID")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
if [ "$HTTP_CODE" = "400" ]; then
  echo "✓ Correctly returned 400"
else
  echo "✗ Expected 400, got $HTTP_CODE"
fi
echo ""

# Test 3: PUT with invalid UUID format (should return 400)
echo "3. Testing PUT with invalid UUID format (expecting 400)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/$INVALID_UUID" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
if [ "$HTTP_CODE" = "400" ]; then
  echo "✓ Correctly returned 400"
else
  echo "✗ Expected 400, got $HTTP_CODE"
fi
echo ""

# Test 4: PUT with empty body (should return 400)
echo "4. Testing PUT with empty body (expecting 400)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/$VALID_NOTE_ID" \
  -H "Content-Type: application/json" \
  -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
if [ "$HTTP_CODE" = "400" ]; then
  echo "✓ Correctly returned 400"
else
  echo "✗ Expected 400, got $HTTP_CODE"
fi
echo ""

# Test 5: PUT with invalid JSON (should return 400)
echo "5. Testing PUT with invalid JSON (expecting 400)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/$VALID_NOTE_ID" \
  -H "Content-Type: application/json" \
  -d 'invalid json')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
if [ "$HTTP_CODE" = "400" ]; then
  echo "✓ Correctly returned 400"
else
  echo "✗ Expected 400, got $HTTP_CODE"
fi
echo ""

# Test 6: PUT with empty title (should return 400)
echo "6. Testing PUT with empty title (expecting 400)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/$VALID_NOTE_ID" \
  -H "Content-Type: application/json" \
  -d '{"title":""}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
if [ "$HTTP_CODE" = "400" ]; then
  echo "✓ Correctly returned 400"
else
  echo "✗ Expected 400, got $HTTP_CODE"
fi
echo ""

# Test 7: DELETE with non-existent UUID (should return 404)
echo "7. Testing DELETE with non-existent UUID (expecting 404)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/$NON_EXISTENT_UUID")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
if [ "$HTTP_CODE" = "404" ]; then
  echo "✓ Correctly returned 404"
else
  echo "✗ Expected 404, got $HTTP_CODE"
fi
echo ""

# Test 8: POST /copy with non-existent UUID (should return 404)
echo "8. Testing POST /copy with non-existent UUID (expecting 404)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/$NON_EXISTENT_UUID/copy")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
if [ "$HTTP_CODE" = "404" ]; then
  echo "✓ Correctly returned 404"
else
  echo "✗ Expected 404, got $HTTP_CODE"
fi
echo ""

# Test 9: Valid PUT request (should return 200)
echo "9. Testing valid PUT request (expecting 200)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/$VALID_NOTE_ID" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Update"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Correctly returned 200"
else
  echo "✗ Expected 200, got $HTTP_CODE"
fi
echo ""

echo "=========================================="
echo "Error Handling Tests Complete!"
echo "=========================================="
