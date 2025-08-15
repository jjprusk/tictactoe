#!/bin/sh
# © 2025 Joe Pruskowski
# Sets branch protection rules for the main branch using GitHub CLI (gh).
# Requirements:
# - gh installed (brew install gh)
# - gh auth login (with repo admin permissions)

set -euo pipefail

OWNER="jjprusk"
REPO="tictactoe"
BRANCH="main"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install with: brew install gh" >&2
  exit 1
fi

echo "Configuring branch protection for $OWNER/$REPO@$BRANCH..."

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  \
  "/repos/$OWNER/$REPO/branches/$BRANCH/protection" \
  -f required_status_checks.strict=true \
  -F required_status_checks.contexts[]="Lint and Typecheck" \
  -F enforce_admins=true \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F required_pull_request_reviews.dismiss_stale_reviews=true \
  -F required_pull_request_reviews.require_code_owner_reviews=true \
  -F restrictions= \
  -F allow_force_pushes=false \
  -F allow_deletions=false \
  -F block_creations=false \
  -F required_linear_history=true \
  -F lock_branch=false \
  -F allow_fork_syncing=true

echo "Done. Verify settings in the GitHub UI: https://github.com/$OWNER/$REPO/settings/branches"


