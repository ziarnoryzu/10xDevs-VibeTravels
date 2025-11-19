#!/bin/bash

# Create a test note
echo "Creating test note..."
RESPONSE=$(curl -s -X POST http://localhost:3001/10x-project/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Wycieczka do Krakowa","content":"Planujemy wycieczkę do Krakowa na weekend. Chcemy zobaczyć Wawel, Rynek Główny i Kazimierz. Interesuje nas również zwiedzanie muzeów i lokalna kuchnia."}')

echo "$RESPONSE"

# Extract note ID
NOTE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$NOTE_ID" ]; then
  echo ""
  echo "Note created with ID: $NOTE_ID"
  echo "View it at: http://localhost:3001/10x-project/app/notes/$NOTE_ID"
else
  echo "Failed to create note"
fi
