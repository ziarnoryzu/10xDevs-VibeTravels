#!/bin/bash

# Test script for Note Detail View API endpoints
NOTE_ID="d852b3c7-8cf1-4bce-ab9f-9d6ef509f3d6"
BASE_URL="http://localhost:3000/10x-project/api/notes"

echo "=========================================="
echo "Testing Note API Endpoints"
echo "=========================================="
echo ""

# Test 1: GET note
echo "1. Testing GET /api/notes/{noteId}..."
RESPONSE=$(curl -s -X GET "$BASE_URL/$NOTE_ID")
echo "Response: $RESPONSE"
echo ""

# Test 2: PUT update note (title only)
echo "2. Testing PUT /api/notes/{noteId} (update title)..."
RESPONSE=$(curl -s -X PUT "$BASE_URL/$NOTE_ID" \
  -H "Content-Type: application/json" \
  -d '{"title":"Wycieczka do Krakowa - Zaktualizowana"}')
echo "Response: $RESPONSE"
echo ""

# Wait a moment
sleep 1

# Test 3: GET note again to verify update
echo "3. Verifying update with GET..."
RESPONSE=$(curl -s -X GET "$BASE_URL/$NOTE_ID")
echo "Response: $RESPONSE"
echo ""

# Test 4: PUT update note (content only)
echo "4. Testing PUT /api/notes/{noteId} (update content)..."
RESPONSE=$(curl -s -X PUT "$BASE_URL/$NOTE_ID" \
  -H "Content-Type: application/json" \
  -d '{"content":"Nowa treść notatki z jeszcze więcej słów aby przekroczyć minimalną liczbę dziesięciu słów wymaganych do generowania planu podróży."}')
echo "Response: $RESPONSE"
echo ""

# Test 5: Copy note
echo "5. Testing POST /api/notes/{noteId}/copy..."
RESPONSE=$(curl -s -X POST "$BASE_URL/$NOTE_ID/copy")
echo "Response: $RESPONSE"

# Extract new note ID
NEW_NOTE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$NEW_NOTE_ID" ]; then
  echo "✓ New note created with ID: $NEW_NOTE_ID"
  echo ""
  
  # Test 6: GET copied note
  echo "6. Verifying copied note with GET..."
  RESPONSE=$(curl -s -X GET "$BASE_URL/$NEW_NOTE_ID")
  echo "Response: $RESPONSE"
  echo ""
  
  # Test 7: DELETE copied note
  echo "7. Testing DELETE /api/notes/{noteId} (on copied note)..."
  RESPONSE=$(curl -s -X DELETE "$BASE_URL/$NEW_NOTE_ID" -w "\nHTTP Status: %{http_code}")
  echo "$RESPONSE"
  echo ""
  
  # Test 8: Verify deletion
  echo "8. Verifying deletion with GET (should return 404)..."
  RESPONSE=$(curl -s -X GET "$BASE_URL/$NEW_NOTE_ID" -w "\nHTTP Status: %{http_code}")
  echo "$RESPONSE"
  echo ""
else
  echo "✗ Failed to create copy"
  echo ""
fi

echo "=========================================="
echo "Testing Complete!"
echo "=========================================="
