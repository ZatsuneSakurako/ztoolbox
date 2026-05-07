#!/bin/bash

# Get the project root directory (assuming this script is in the project root or adjust the path)
PROJECT_ROOT_DIR="$(readlink -f "$(pwd)")"

FONT_PATH="$PROJECT_ROOT_DIR/webextension/assets/fonts/"
JS_LIB="$PROJECT_ROOT_DIR/webextension/lib/"

# Color output functions
info() {
    echo -e "\033[36m[INFO]\033[0m $1"
}

error() {
    echo -e "\033[31m[ERROR]\033[0m $1" >&2
}

# Copy function wrapper
_cp() {
    local src="$1"
    local dest="$2"
    cp "$PROJECT_ROOT_DIR/$src" "$dest"
}

# Check if JS lib folder exists
if [ ! -d "$JS_LIB" ]; then
    error "JS lib folder not found!"
    exit 1
else
    info "Copying nunjucks-slim..."
    _cp "./node_modules/nunjucks/browser/nunjucks-slim.js" "$JS_LIB"

    info "Copying MaterialIcons (material-symbols)..."
    _cp "./node_modules/material-symbols/material-symbols-outlined.woff2" "$FONT_PATH/material-symbols-outlined.woff2"
    _cp "./node_modules/material-symbols/material-symbols-rounded.woff2" "$FONT_PATH/material-symbols-rounded.woff2"
    _cp "./node_modules/material-symbols/material-symbols-sharp.woff2" "$FONT_PATH/material-symbols-sharp.woff2"

    # Create the CSS file with transformations
    cat "$PROJECT_ROOT_DIR/node_modules/material-symbols/index.css" | \
        sed 's/  /\t/g' | \
        sed 's/\(font-family: "Material Symbols [^"]*";\)/\/\*noinspection CssNoGenericFontName*\/\n\t\1 \/* stylelint-disable-line font-family-no-missing-generic-family-keyword *\//g' | \
        sed -e :a -e '/^\s*$/d;N;ba' > "$PROJECT_ROOT_DIR/webextension/assets/fonts/material-symbols.css"

    info "Copying socket.io-client..."
    _cp "./node_modules/socket.io-client/dist/socket.io.esm.min.js" "$JS_LIB"
    _cp "./node_modules/socket.io-client/dist/socket.io.esm.min.js.map" "$JS_LIB"
fi
