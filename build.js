// Build Script - Minification and Optimization
// This script handles CSS/JS minification, bundling, and optimization for production

const fs = require('fs').promises;
const path = require('path');
const { minify: minifyJS } = require('terser');
const CleanCSS = require('clean-css');
const crypto = require('crypto');

// Build configuration
const BUILD_CONFIG = {
    srcDir: __dirname,
    distDir: path.join(__dirname, 'dist'),
    
    // Files to process
    jsFiles: [
        // Configuration files (bundle together)
        {
            output: 'config.bundle.min.js',
            files: [
                'config/config.js',
                'config/production.config.js',
                'config/security.config.js',
                'config/monitoring.config.js'
            ]
        },
        // Security bundle
        {
            output: 'security.bundle.min.js',
            files: [
                'js/security/SecurityManager.js',
                'js/security/InputValidator.js'
            ]
        },
        // Performance bundle
        {
            output: 'performance.bundle.min.js',
            files: [
                'js/performance/PerformanceManager.js',
                'js/performance/CacheManager.js'
            ]
        },
        // API bundle
        {
            output: 'api.bundle.min.js',
            files: [
                'js/api/APIManager.js',
                'js/api/RequestHandler.js'
            ]
        },
        // Monitoring bundle
        {
            output: 'monitoring.bundle.min.js',
            files: [
                'js/monitoring/ErrorHandler.js',
                'js/monitoring/AnalyticsManager.js',
                'js/monitoring/MonitoringDashboard.js'
            ]
        },
        // Core application bundle
        {
            output: 'app.bundle.min.js',
            files: [
                'js/walletHandler.js',
                'js/deepLinkBuilder.js',
                'js/geoRedirector.js',
                'js/main.js'
            ]
        }
    ],
    
    cssFiles: [
        {
            input: 'css/styles.css',
            output: 'styles.min.css'
        }
    ],
    
    // Terser options for JS minification
    terserOptions: {
        compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
            passes: 2
        },
        mangle: {
            toplevel: true,
            properties: {
                regex: /^_/
            }
        },
        format: {
            comments: false
        },
        sourceMap: {
            filename: 'bundle.min.js',
            url: 'bundle.min.js.map'
        }
    },
    
    // CleanCSS options
    cleanCSSOptions: {
        level: {
            1: {
                all: true,
                normalizeUrls: false
            },
            2: {
                restructureRules: true
            }
        },
        sourceMap: true
    }
};

/**
 * Main build function
 */
async function build() {
    console.log('🔨 Starting production build...\n');
    
    try {
        // Create dist directory
        await createDistDirectory();
        
        // Process JavaScript files
        await processJavaScriptBundles();
        
        // Process CSS files
        await processCSSFiles();
        
        // Copy static assets
        await copyStaticAssets();
        
        // Generate production HTML
        await generateProductionHTML();
        
        // Generate build manifest
        await generateBuildManifest();
        
        console.log('\n✅ Build completed successfully!');
        console.log(`📁 Output directory: ${BUILD_CONFIG.distDir}`);
        
    } catch (error) {
        console.error('\n❌ Build failed:', error);
        process.exit(1);
    }
}

/**
 * Create distribution directory
 */
async function createDistDirectory() {
    await fs.mkdir(BUILD_CONFIG.distDir, { recursive: true });
    await fs.mkdir(path.join(BUILD_CONFIG.distDir, 'js'), { recursive: true });
    await fs.mkdir(path.join(BUILD_CONFIG.distDir, 'css'), { recursive: true });
    await fs.mkdir(path.join(BUILD_CONFIG.distDir, 'config'), { recursive: true });
}

/**
 * Process JavaScript bundles
 */
async function processJavaScriptBundles() {
    console.log('📦 Processing JavaScript bundles...');
    
    for (const bundle of BUILD_CONFIG.jsFiles) {
        console.log(`  • Building ${bundle.output}...`);
        
        // Read and concatenate files
        let concatenated = '';
        for (const file of bundle.files) {
            const filePath = path.join(BUILD_CONFIG.srcDir, file);
            try {
                const content = await fs.readFile(filePath, 'utf8');
                concatenated += `\n// Source: ${file}\n${content}\n`;
            } catch (error) {
                console.warn(`    ⚠️  Warning: Could not read ${file}`);
            }
        }
        
        // Minify
        try {
            const result = await minifyJS(concatenated, {
                ...BUILD_CONFIG.terserOptions,
                sourceMap: {
                    filename: bundle.output,
                    url: `${bundle.output}.map`
                }
            });
            
            // Write minified file
            const outputPath = path.join(BUILD_CONFIG.distDir, 'js', bundle.output);
            await fs.writeFile(outputPath, result.code);
            
            // Write source map
            if (result.map) {
                await fs.writeFile(`${outputPath}.map`, result.map);
            }
            
            // Calculate size reduction
            const originalSize = Buffer.byteLength(concatenated);
            const minifiedSize = Buffer.byteLength(result.code);
            const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
            
            console.log(`    ✓ Minified: ${formatBytes(originalSize)} → ${formatBytes(minifiedSize)} (${reduction}% reduction)`);
            
        } catch (error) {
            console.error(`    ✗ Error minifying ${bundle.output}:`, error.message);
        }
    }
}

/**
 * Process CSS files
 */
async function processCSSFiles() {
    console.log('\n🎨 Processing CSS files...');
    
    for (const cssFile of BUILD_CONFIG.cssFiles) {
        console.log(`  • Processing ${cssFile.input}...`);
        
        try {
            const inputPath = path.join(BUILD_CONFIG.srcDir, cssFile.input);
            const outputPath = path.join(BUILD_CONFIG.distDir, 'css', cssFile.output);
            
            const input = await fs.readFile(inputPath, 'utf8');
            const output = new CleanCSS(BUILD_CONFIG.cleanCSSOptions).minify(input);
            
            if (output.errors.length > 0) {
                console.error('    ✗ CSS minification errors:', output.errors);
                continue;
            }
            
            await fs.writeFile(outputPath, output.styles);
            
            if (output.sourceMap) {
                await fs.writeFile(`${outputPath}.map`, output.sourceMap.toString());
            }
            
            // Stats
            const originalSize = Buffer.byteLength(input);
            const minifiedSize = Buffer.byteLength(output.styles);
            const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
            
            console.log(`    ✓ Minified: ${formatBytes(originalSize)} → ${formatBytes(minifiedSize)} (${reduction}% reduction)`);
            
        } catch (error) {
            console.error(`    ✗ Error processing ${cssFile.input}:`, error.message);
        }
    }
}

/**
 * Copy static assets
 */
async function copyStaticAssets() {
    console.log('\n📁 Copying static assets...');
    
    // Copy images, fonts, etc.
    const staticDirs = ['images', 'fonts'];
    
    for (const dir of staticDirs) {
        const srcPath = path.join(BUILD_CONFIG.srcDir, dir);
        const destPath = path.join(BUILD_CONFIG.distDir, dir);
        
        try {
            await fs.access(srcPath);
            await copyDirectory(srcPath, destPath);
            console.log(`  ✓ Copied ${dir}/`);
        } catch (error) {
            // Directory doesn't exist, skip
        }
    }
}

/**
 * Generate production HTML with updated paths
 */
async function generateProductionHTML() {
    console.log('\n📄 Generating production HTML...');
    
    const htmlPath = path.join(BUILD_CONFIG.srcDir, 'index.html');
    let html = await fs.readFile(htmlPath, 'utf8');
    
    // Update script paths to use bundles
    const scriptReplacements = [
        // Config bundle
        {
            from: /<script src="config\/config\.js"[^>]*><\/script>\s*<script src="config\/production\.config\.js"[^>]*><\/script>\s*<script src="config\/security\.config\.js"[^>]*><\/script>\s*<script src="config\/monitoring\.config\.js"[^>]*><\/script>/g,
            to: '<script src="js/config.bundle.min.js" defer></script>'
        },
        // Security bundle
        {
            from: /<script src="js\/security\/SecurityManager\.js"[^>]*><\/script>\s*<script src="js\/security\/InputValidator\.js"[^>]*><\/script>/g,
            to: '<script src="js/security.bundle.min.js" defer></script>'
        },
        // Performance bundle
        {
            from: /<script src="js\/performance\/PerformanceManager\.js"[^>]*><\/script>\s*<script src="js\/performance\/CacheManager\.js"[^>]*><\/script>/g,
            to: '<script src="js/performance.bundle.min.js" defer></script>'
        },
        // API bundle
        {
            from: /<script src="js\/api\/APIManager\.js"[^>]*><\/script>\s*<script src="js\/api\/RequestHandler\.js"[^>]*><\/script>/g,
            to: '<script src="js/api.bundle.min.js" defer></script>'
        },
        // Monitoring bundle
        {
            from: /<script src="js\/monitoring\/ErrorHandler\.js"[^>]*><\/script>\s*<script src="js\/monitoring\/AnalyticsManager\.js"[^>]*><\/script>\s*<script src="js\/monitoring\/MonitoringDashboard\.js"[^>]*><\/script>/g,
            to: '<script src="js/monitoring.bundle.min.js" defer></script>'
        },
        // App bundle
        {
            from: /<script src="js\/walletHandler\.js"[^>]*><\/script>\s*<script src="js\/deepLinkBuilder\.js"[^>]*><\/script>\s*<script src="js\/geoRedirector\.js"[^>]*><\/script>\s*<script src="js\/main\.js"[^>]*><\/script>/g,
            to: '<script src="js/app.bundle.min.js" defer></script>'
        }
    ];
    
    // Apply replacements
    for (const replacement of scriptReplacements) {
        html = html.replace(replacement.from, replacement.to);
    }
    
    // Update CSS path
    html = html.replace(
        '<link rel="preload" href="css/styles.css"',
        '<link rel="preload" href="css/styles.min.css"'
    );
    html = html.replace(
        '<link rel="stylesheet" href="css/styles.css">',
        '<link rel="stylesheet" href="css/styles.min.css">'
    );
    
    // Add cache busting
    const buildHash = crypto.randomBytes(8).toString('hex');
    html = html.replace(/\.min\.(js|css)"/g, `.min.$1?v=${buildHash}"`);
    
    // Save production HTML
    await fs.writeFile(path.join(BUILD_CONFIG.distDir, 'index.html'), html);
    console.log('  ✓ Generated production index.html');
}

/**
 * Generate build manifest
 */
async function generateBuildManifest() {
    console.log('\n📋 Generating build manifest...');
    
    const manifest = {
        version: '1.0.0',
        buildDate: new Date().toISOString(),
        environment: 'production',
        files: []
    };
    
    // Walk dist directory
    async function walkDir(dir, baseDir = '') {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(baseDir, entry.name);
            
            if (entry.isDirectory()) {
                await walkDir(fullPath, relativePath);
            } else {
                const stats = await fs.stat(fullPath);
                const content = await fs.readFile(fullPath);
                const hash = crypto.createHash('sha256').update(content).digest('hex');
                
                manifest.files.push({
                    path: relativePath.replace(/\\/g, '/'),
                    size: stats.size,
                    hash: hash.substring(0, 16)
                });
            }
        }
    }
    
    await walkDir(BUILD_CONFIG.distDir);
    
    // Save manifest
    await fs.writeFile(
        path.join(BUILD_CONFIG.distDir, 'build-manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    console.log('  ✓ Generated build-manifest.json');
}

/**
 * Copy directory recursively
 */
async function copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run build
build();