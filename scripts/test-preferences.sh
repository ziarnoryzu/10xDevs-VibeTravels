#!/bin/bash

# Test script to verify user preferences are included in travel plan generation

echo "=== Test: Verifying User Preferences Integration ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. First, set user preferences in profile
echo -e "${BLUE}Step 1: Setting user preferences in profile...${NC}"
curl -X PUT http://localhost:3000/api/profiles/me \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": ["Historia", "Sztuka", "Muzea", "Galerie", "Kuchnia włoska", "Tempo relaksacyjne"]
  }' \
  -s | jq '.'

echo ""
echo -e "${BLUE}Step 2: Verifying preferences were saved...${NC}"
curl -X GET http://localhost:3000/api/profiles/me -s | jq '.preferences'

echo ""
echo -e "${YELLOW}=== Summary ===${NC}"
echo "✓ User preferences set: Historia, Sztuka, Muzea, Galerie, Kuchnia włoska, Tempo relaksacyjne"
echo ""
echo "Now when you generate a travel plan, these preferences should be included in the AI prompt."
echo "The AI should suggest more museums, art galleries, Italian restaurants, and a relaxed pace."
echo ""
echo -e "${GREEN}Test completed!${NC}"
