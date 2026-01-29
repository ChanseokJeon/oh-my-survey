#!/bin/bash
# AI Survey Generation Test Runner
# Usage: ./run-tests.sh

set -e

BASE_URL="http://localhost:3000"
COOKIE_FILE="/tmp/ai-test-cookies.txt"
OUTPUT_DIR="tests/ai-generation/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULT_FILE="$OUTPUT_DIR/results_$TIMESTAMP.json"

mkdir -p "$OUTPUT_DIR"

echo "=== AI Survey Generation Test ==="
echo "Timestamp: $TIMESTAMP"
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

SESSION=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/auth/session")
USER_NAME=$(echo "$SESSION" | jq -r '.user.name // "Unknown"')
echo "   Logged in as: $USER_NAME"
echo ""

# Read test cases
TEST_CASES=$(cat tests/ai-generation/test-cases.json)
CASE_COUNT=$(echo "$TEST_CASES" | jq '.testCases | length')

echo "2. Running $CASE_COUNT test cases..."
echo ""

# Initialize results array
RESULTS="[]"

for i in $(seq 0 $((CASE_COUNT - 1))); do
  CASE=$(echo "$TEST_CASES" | jq ".testCases[$i]")
  CASE_ID=$(echo "$CASE" | jq -r '.id')
  CASE_TYPE=$(echo "$CASE" | jq -r '.type')
  CASE_DESC=$(echo "$CASE" | jq -r '.description')
  CASE_INPUT=$(echo "$CASE" | jq -r '.input')
  EXPECTED=$(echo "$CASE" | jq '.expectedCriteria')

  echo "   [$((i+1))/$CASE_COUNT] $CASE_ID ($CASE_TYPE)"
  echo "       Input: ${CASE_INPUT:0:50}..."

  # Call API - properly escape the input for JSON
  START_TIME=$(python3 -c 'import time; print(int(time.time() * 1000))')
  REQUEST_BODY=$(jq -n --arg desc "$CASE_INPUT" '{description: $desc}')
  RESPONSE=$(curl -s -b "$COOKIE_FILE" \
    -X POST "$BASE_URL/api/surveys/generate" \
    -H "Content-Type: application/json" \
    -d "$REQUEST_BODY" \
    --max-time 120)
  END_TIME=$(python3 -c 'import time; print(int(time.time() * 1000))')
  DURATION=$((END_TIME - START_TIME))

  # Check for errors
  ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')

  if [ -n "$ERROR" ]; then
    echo "       ❌ Error: $ERROR"
    RESULT=$(jq -n \
      --arg id "$CASE_ID" \
      --arg type "$CASE_TYPE" \
      --arg desc "$CASE_DESC" \
      --arg input "$CASE_INPUT" \
      --arg error "$ERROR" \
      --argjson duration "$DURATION" \
      '{
        id: $id,
        type: $type,
        description: $desc,
        input: $input,
        status: "ERROR",
        error: $error,
        durationMs: $duration
      }')
  else
    SURVEY=$(echo "$RESPONSE" | jq '.survey')
    TITLE=$(echo "$SURVEY" | jq -r '.title')
    QUESTION_COUNT=$(echo "$SURVEY" | jq '.questions | length')
    TYPES=$(echo "$SURVEY" | jq '[.questions[].type] | unique')

    # Validation
    MIN_Q=$(echo "$EXPECTED" | jq -r '.minQuestions')
    MAX_Q=$(echo "$EXPECTED" | jq -r '.maxQuestions')
    REQ_TYPES=$(echo "$EXPECTED" | jq -r '.requiredTypes // []')

    VALID_COUNT="true"
    if [ "$QUESTION_COUNT" -lt "$MIN_Q" ] || [ "$QUESTION_COUNT" -gt "$MAX_Q" ]; then
      VALID_COUNT="false"
    fi

    echo "       ✅ Generated: \"$TITLE\" ($QUESTION_COUNT questions, ${DURATION}ms)"
    echo "       Types: $TYPES"

    RESULT=$(jq -n \
      --arg id "$CASE_ID" \
      --arg type "$CASE_TYPE" \
      --arg desc "$CASE_DESC" \
      --arg input "$CASE_INPUT" \
      --argjson survey "$SURVEY" \
      --argjson expected "$EXPECTED" \
      --argjson duration "$DURATION" \
      --argjson validCount "$VALID_COUNT" \
      '{
        id: $id,
        type: $type,
        description: $desc,
        input: $input,
        status: "SUCCESS",
        durationMs: $duration,
        result: {
          title: $survey.title,
          questionCount: ($survey.questions | length),
          types: ([$survey.questions[].type] | unique),
          questions: $survey.questions
        },
        validation: {
          questionCountValid: $validCount,
          expectedRange: "\($expected.minQuestions)-\($expected.maxQuestions)"
        }
      }')
  fi

  RESULTS=$(echo "$RESULTS" | jq ". + [$RESULT]")
  echo ""
done

# Calculate summary
SUCCESS_COUNT=$(echo "$RESULTS" | jq '[.[] | select(.status == "SUCCESS")] | length')
ERROR_COUNT=$(echo "$RESULTS" | jq '[.[] | select(.status == "ERROR")] | length')
AVG_DURATION=$(echo "$RESULTS" | jq '[.[] | select(.status == "SUCCESS") | .durationMs] | if length > 0 then add / length | floor else 0 end')

FINAL_RESULT=$(jq -n \
  --arg timestamp "$TIMESTAMP" \
  --argjson total "$CASE_COUNT" \
  --argjson success "$SUCCESS_COUNT" \
  --argjson errors "$ERROR_COUNT" \
  --argjson avgDuration "$AVG_DURATION" \
  --argjson results "$RESULTS" \
  '{
    timestamp: $timestamp,
    summary: {
      total: $total,
      success: $success,
      errors: $errors,
      avgDurationMs: $avgDuration
    },
    results: $results
  }')

echo "$FINAL_RESULT" > "$RESULT_FILE"

echo "=== Summary ==="
echo "Total: $CASE_COUNT | Success: $SUCCESS_COUNT | Errors: $ERROR_COUNT"
echo "Avg Duration: ${AVG_DURATION}ms"
echo ""
echo "Results saved to: $RESULT_FILE"
