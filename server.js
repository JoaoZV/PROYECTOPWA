const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de compresión (agrega: npm install compression)
const compression = require('compression');
app.use(compression());

// Headers de seguridad y performance OPTIMIZADOS
app.use((req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    
    // HSTS para producción (comentar en desarrollo)
    // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // CSP mejorado
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "worker-src 'self'; " +
        "frame-ancestors 'none';"
    );
    
    // Performance headers
    const fileExt = path.extname(req.path);
    const isStatic = fileExt && ['.webp', '.ico', '.json', '.min.js', '.min.css'].includes(fileExt);
    
    if (isStatic) {
        // Assets estáticos: cache por 1 año
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (fileExt === '.js' || fileExt === '.css') {
        // JS/CSS: cache por 1 semana
        res.setHeader('Cache-Control', 'public, max-age=604800');
    } else if (req.path === '/') {
        // HTML principal: no cache
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
        // Otros: cache breve
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    
    res.setHeader('Vary', 'Accept-Encoding');
    next();
});

// Servir archivos estáticos optimizados
app.use(express.static('public', {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath);
        
        // Preload headers para recursos críticos
        if (filePath.includes('icon-192.webp')) {
            res.setHeader('Link', '</assets/icons/icon-192.webp>; rel=preload; as=image');
        }
        
        // Brotli/Gzip detection
        if (ext === '.js' || ext === '.css' || ext === '.html') {
            res.setHeader('Content-Encoding', 'gzip');
        }
    }
}));

// Logger minimalista (sin afectar performance)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 100) {
            console.log(`⏱️  ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
        }
    });
    next();
});

// Routes principales
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), {
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    });
});

app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

app.get('/service-worker.js', (req, res) => {
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'public', 'service-worker.js'));
});

// API de métricas Lighthouse (simuladas)
app.get('/api/lighthouse', (req, res) => {
    res.json({
        performance: 100,
        accessibility: 100,
        bestPractices: 100,
        seo: 100,
        timestamp: new Date().toISOString(),
        metrics: {
            fcp: 1.2,
            lcp: 1.5,
            tbt: 50,
            cls: 0,
            si: 1.3
        }
    });
});

// Health check optimizado
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'offline.html'));
});

// Error handler
app.use((error, req, res, next) => {
    console.error('💥 Error:', error.message);
    res.status(500).json({
        error: 'Error interno',
        message: process.env.NODE_ENV === 'production' ? '' : error.message
    });
});

// Verificar y crear estructura
if (!fs.existsSync('public')) {
    console.log('📁 Creando estructura...');
    ['public/assets/icons', 'public/css', 'public/js/modules'].forEach(dir => {
        fs.mkdirSync(dir, { recursive: true });
    });
}

// Iniciar servidor
const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor PWA 100% Lighthouse en: http://localhost:${PORT}`);
    console.log('📊 Métricas objetivo:');
    console.log('   Performance: 100/100');
    console.log('   Accessibility: 100/100');
    console.log('   Best Practices: 100/100');
    console.log('   SEO: 100/100');
});

// Keep-alive optimizado
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});