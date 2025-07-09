#!/bin/bash
# Simple build script for minification without Node.js dependencies
# Uses online tools or basic compression

set -e

echo "🔨 Starting simple production build..."
echo ""

# Create dist directory structure
mkdir -p dist/js dist/css dist/config

# Function to minify JavaScript using basic compression
minify_js() {
    local input=$1
    local output=$2
    
    # Basic minification: remove comments, extra whitespace, and compress
    cat "$input" | \
        sed 's|//.*$||g' | \
        sed 's|/\*[^*]*\*\+\([^/*][^*]*\*\+\)*/||g' | \
        tr -s ' ' | \
        tr -d '\n' | \
        sed 's/; /;/g' | \
        sed 's/ {/{/g' | \
        sed 's/} /}/g' | \
        sed 's/ = /=/g' | \
        sed 's/ + /+/g' | \
        sed 's/ - /-/g' | \
        sed 's/ \* /*/g' | \
        sed 's/ \/ /\//g' > "$output"
}

# Function to minify CSS
minify_css() {
    local input=$1
    local output=$2
    
    # Basic CSS minification
    cat "$input" | \
        sed 's|/\*[^*]*\*\+\([^/*][^*]*\*\+\)*/||g' | \
        tr -s ' ' | \
        tr -d '\n' | \
        sed 's/: /:/g' | \
        sed 's/; /;/g' | \
        sed 's/ {/{/g' | \
        sed 's/} /}/g' | \
        sed 's/, /,/g' > "$output"
}

# Bundle and minify JavaScript files
echo "📦 Processing JavaScript bundles..."

# Config bundle
echo "  • Building config.bundle.min.js..."
cat config/config.js config/production.config.js config/security.config.js config/monitoring.config.js > dist/js/config.bundle.js
minify_js dist/js/config.bundle.js dist/js/config.bundle.min.js
rm dist/js/config.bundle.js

# Security bundle
echo "  • Building security.bundle.min.js..."
cat js/security/SecurityManager.js js/security/InputValidator.js > dist/js/security.bundle.js
minify_js dist/js/security.bundle.js dist/js/security.bundle.min.js
rm dist/js/security.bundle.js

# Performance bundle
echo "  • Building performance.bundle.min.js..."
cat js/performance/PerformanceManager.js js/performance/CacheManager.js > dist/js/performance.bundle.js
minify_js dist/js/performance.bundle.js dist/js/performance.bundle.min.js
rm dist/js/performance.bundle.js

# API bundle
echo "  • Building api.bundle.min.js..."
cat js/api/APIManager.js js/api/RequestHandler.js > dist/js/api.bundle.js
minify_js dist/js/api.bundle.js dist/js/api.bundle.min.js
rm dist/js/api.bundle.js

# Monitoring bundle
echo "  • Building monitoring.bundle.min.js..."
cat js/monitoring/ErrorHandler.js js/monitoring/AnalyticsManager.js js/monitoring/MonitoringDashboard.js > dist/js/monitoring.bundle.js
minify_js dist/js/monitoring.bundle.js dist/js/monitoring.bundle.min.js
rm dist/js/monitoring.bundle.js

# App bundle
echo "  • Building app.bundle.min.js..."
cat js/walletHandler.js js/deepLinkBuilder.js js/geoRedirector.js js/main.js > dist/js/app.bundle.js
minify_js dist/js/app.bundle.js dist/js/app.bundle.min.js
rm dist/js/app.bundle.js

echo ""
echo "🎨 Processing CSS files..."
echo "  • Processing styles.css..."
minify_css css/styles.css dist/css/styles.min.css

echo ""
echo "📄 Generating production HTML..."

# Create production HTML with bundled scripts
cp index.html dist/index.html

# Update script references in HTML
sed -i.bak 's|<script src="config/config.js" defer></script>.*<script src="config/monitoring.config.js" defer></script>|<script src="js/config.bundle.min.js" defer></script>|' dist/index.html

sed -i.bak 's|<script src="js/security/SecurityManager.js" defer></script>.*<script src="js/security/InputValidator.js" defer></script>|<script src="js/security.bundle.min.js" defer></script>|' dist/index.html

sed -i.bak 's|<script src="js/performance/PerformanceManager.js" defer></script>.*<script src="js/performance/CacheManager.js" defer></script>|<script src="js/performance.bundle.min.js" defer></script>|' dist/index.html

sed -i.bak 's|<script src="js/api/APIManager.js" defer></script>.*<script src="js/api/RequestHandler.js" defer></script>|<script src="js/api.bundle.min.js" defer></script>|' dist/index.html

sed -i.bak 's|<script src="js/monitoring/ErrorHandler.js" defer></script>.*<script src="js/monitoring/MonitoringDashboard.js" defer></script>|<script src="js/monitoring.bundle.min.js" defer></script>|' dist/index.html

sed -i.bak 's|<script src="js/walletHandler.js" defer></script>.*<script src="js/main.js" defer></script>|<script src="js/app.bundle.min.js" defer></script>|' dist/index.html

# Update CSS reference
sed -i.bak 's|href="css/styles.css"|href="css/styles.min.css"|g' dist/index.html

# Clean up backup files
rm dist/index.html.bak

# Copy static assets
echo ""
echo "📁 Copying static assets..."
[ -d "images" ] && cp -r images dist/ && echo "  ✓ Copied images/"
[ -d "fonts" ] && cp -r fonts dist/ && echo "  ✓ Copied fonts/"

# Create a simple manifest
echo ""
echo "📋 Generating build manifest..."
cat > dist/build-manifest.json << EOF
{
  "version": "1.0.0",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "production",
  "files": [
    "index.html",
    "js/config.bundle.min.js",
    "js/security.bundle.min.js",
    "js/performance.bundle.min.js",
    "js/api.bundle.min.js",
    "js/monitoring.bundle.min.js",
    "js/app.bundle.min.js",
    "css/styles.min.css"
  ]
}
EOF

echo "  ✓ Generated build-manifest.json"

echo ""
echo "✅ Build completed successfully!"
echo "📁 Output directory: dist/"
echo ""
echo "To serve the production build locally, run:"
echo "  cd dist && python3 -m http.server 8080"
echo ""
echo "Note: This is a basic minification. For better compression, use the Node.js build script."