#!/bin/bash

# Color/emoji definitions
WARNING_CHAR="⚠"
SUCCESS_CHAR="✅"

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Custom console functions
info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

warning() {
    echo -e "${YELLOW}$1${NC}"
}

success() {
    echo -e "${GREEN}$1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}" >&2
}

# Get current directory (equivalent to pwd variable)
pwd=$(pwd)

info "Current dir: ${pwd}\n"

warning "${WARNING_CHAR} Test only cover linting with CSS (with Stylelint), and web-ext for now ${WARNING_CHAR}\n"

info "Testing CSS..."

# Test CSS with stylelint
if ! yarn dlx stylelint --config-basedir "${pwd}" --default-severity warning "webextension/**/*.css" --formatter verbose; then
    error "Stylelint failed"
    exit 1
fi

info "Testing web-ext lint..."

# Test with web-ext
if ! web-ext lint --self-hosted --source-dir ./webextension; then
    error "web-ext lint failed"
    exit 1
fi

success "\n${SUCCESS_CHAR} No errors"
