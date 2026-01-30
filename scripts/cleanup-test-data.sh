#!/bin/bash
# Test Data Cleanup Script
# Deletes all surveys created during testing

set -e

BASE_URL="${TEST_BASE_URL:-http://localhost:3000}"
COOKIE_FILE="/tmp/test-cleanup-cookies.txt"

echo "=== Test Data Cleanup ==="
echo ""

# Login and get session
echo "1. Authenticating..."
CSRF_RESPONSE=$(curl -s -c "$COOKIE_FILE" "$BASE_URL/api/auth/csrf")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken')

curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF_TOKEN&email=test@example.com&password=test1234" \
  -o /dev/null

# Verify login
SESSION=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/auth/session")
USER_EMAIL=$(echo "$SESSION" | jq -r '.user.email // "not logged in"')
echo "   Logged in as: $USER_EMAIL"
echo ""

if [ "$USER_EMAIL" == "not logged in" ]; then
  echo "Error: Login failed"
  exit 1
fi

# Get all surveys
echo "2. Fetching surveys..."
SURVEYS_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/surveys")
SURVEY_COUNT=$(echo "$SURVEYS_RESPONSE" | jq '.surveys | length')
echo "   Found $SURVEY_COUNT total surveys"
echo ""

# Filter test surveys and delete
echo "3. Cleaning up test surveys..."
DELETED=0
ERRORS=0

# Get survey IDs and titles
echo "$SURVEYS_RESPONSE" | jq -c '.surveys[]' | while read -r survey; do
  SURVEY_ID=$(echo "$survey" | jq -r '.id')
  SURVEY_TITLE=$(echo "$survey" | jq -r '.title')

  # Check if it's a test survey
  if echo "$SURVEY_TITLE" | grep -qiE "(test|e2e|integration|ui test|nav test|tab test|question test|settings test|responses test|selection test|bulk delete|questions test)"; then
    echo "   Deleting: $SURVEY_TITLE"

    DELETE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_FILE" \
      -X DELETE "$BASE_URL/api/surveys/$SURVEY_ID")

    if [ "$DELETE_RESPONSE" == "200" ] || [ "$DELETE_RESPONSE" == "204" ]; then
      DELETED=$((DELETED + 1))
    else
      echo "     Failed (HTTP $DELETE_RESPONSE)"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

# Count remaining surveys
REMAINING=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/surveys" | jq '.surveys | length')

echo ""
echo "=== Cleanup Complete ==="
echo "Remaining surveys: $REMAINING"

# Cleanup cookie file
rm -f "$COOKIE_FILE"
