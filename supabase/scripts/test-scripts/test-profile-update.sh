#!/bin/bash

# Test script for profile update endpoint
# This script tests the /api/profiles/me endpoint

echo "=== Testing Profile Update Endpoint ==="
echo ""

# Test 1: Update with valid name (2+ characters)
echo "Test 1: Valid name update (should succeed)"
curl -X PUT http://localhost:4321/api/profiles/me \
  -H "Content-Type: application/json" \
  -d '{"name":"Jan"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""

# Test 2: Update with invalid name (1 character)
echo "Test 2: Invalid name update - too short (should fail with 400)"
curl -X PUT http://localhost:4321/api/profiles/me \
  -H "Content-Type: application/json" \
  -d '{"name":"J"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""

# Test 3: Update with empty name
echo "Test 3: Empty name update (should fail with 400)"
curl -X PUT http://localhost:4321/api/profiles/me \
  -H "Content-Type: application/json" \
  -d '{"name":""}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""

echo "=== Tests completed ==="
