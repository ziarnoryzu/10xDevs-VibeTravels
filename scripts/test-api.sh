#!/bin/bash

# Kolory dla czytelności
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000/10x-project/api"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Testowanie REST API Endpoints${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Test 1: GET /api/profiles/me
echo -e "${YELLOW}Test 1: GET /api/profiles/me${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/profiles/me")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ Status: $HTTP_CODE${NC}"
  echo "$BODY" | head -c 300
  echo -e "\n"
else
  echo -e "${RED}✗ Status: $HTTP_CODE${NC}"
  echo "$BODY"
fi
echo ""

# Test 2: GET /api/notes
echo -e "${YELLOW}Test 2: GET /api/notes (lista notatek)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/notes")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ Status: $HTTP_CODE${NC}"
  echo "$BODY" | head -c 500
  echo -e "\n"
else
  echo -e "${RED}✗ Status: $HTTP_CODE${NC}"
  echo "$BODY"
fi
echo ""

# Test 3: POST /api/notes
echo -e "${YELLOW}Test 3: POST /api/notes (tworzenie notatki)${NC}"
RESPONSE=$(curl -s -X POST -w "\n%{http_code}" \
  -H "Content-Type: application/json" \
  -d '{"title":"API Test Note","content":"This is a test note created via API testing"}' \
  "$BASE_URL/notes")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ Status: $HTTP_CODE${NC}"
  echo "$BODY"
  NEW_NOTE_ID=$(echo "$BODY" | grep -oP '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "Created Note ID: ${GREEN}$NEW_NOTE_ID${NC}"
else
  echo -e "${RED}✗ Status: $HTTP_CODE${NC}"
  echo "$BODY"
fi
echo ""

# Test 4: GET /api/notes/{noteId}
if [ -n "$NEW_NOTE_ID" ]; then
  echo -e "${YELLOW}Test 4: GET /api/notes/$NEW_NOTE_ID (szczegóły notatki)${NC}"
  RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/notes/$NEW_NOTE_ID")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Status: $HTTP_CODE${NC}"
    echo "$BODY" | head -c 400
    echo -e "\n"
  else
    echo -e "${RED}✗ Status: $HTTP_CODE${NC}"
    echo "$BODY"
  fi
  echo ""

  # Test 5: GET /api/notes/{noteId}/travel-plan
  echo -e "${YELLOW}Test 5: GET /api/notes/$NEW_NOTE_ID/travel-plan${NC}"
  RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/notes/$NEW_NOTE_ID/travel-plan")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "404" ]; then
    echo -e "${GREEN}✓ Status: $HTTP_CODE${NC}"
    if [ "$HTTP_CODE" == "404" ]; then
      echo "(Brak planu podróży - oczekiwane dla nowej notatki)"
    else
      echo "$BODY" | head -c 400
    fi
    echo -e "\n"
  else
    echo -e "${RED}✗ Status: $HTTP_CODE${NC}"
    echo "$BODY"
  fi
  echo ""

  # Test 6: PUT /api/notes/{noteId}
  echo -e "${YELLOW}Test 6: PUT /api/notes/$NEW_NOTE_ID (aktualizacja notatki)${NC}"
  RESPONSE=$(curl -s -X PUT -w "\n%{http_code}" \
    -H "Content-Type: application/json" \
    -d '{"title":"Updated API Test Note","content":"Content has been updated via API"}' \
    "$BASE_URL/notes/$NEW_NOTE_ID")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Status: $HTTP_CODE${NC}"
    echo "$BODY" | head -c 300
    echo -e "\n"
  else
    echo -e "${RED}✗ Status: $HTTP_CODE${NC}"
    echo "$BODY"
  fi
  echo ""

  # Test 7: DELETE /api/notes/{noteId}
  echo -e "${YELLOW}Test 7: DELETE /api/notes/$NEW_NOTE_ID (usuwanie notatki)${NC}"
  RESPONSE=$(curl -s -X DELETE -w "\n%{http_code}" "$BASE_URL/notes/$NEW_NOTE_ID")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  if [ "$HTTP_CODE" == "204" ] || [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Status: $HTTP_CODE - Notatka usunięta${NC}"
  else
    echo -e "${RED}✗ Status: $HTTP_CODE${NC}"
  fi
  echo ""
fi

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Testy zakończone${NC}"
echo -e "${YELLOW}========================================${NC}"
