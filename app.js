// App.js optimizado para performance y Lighthouse
console.log('✅ app.js cargado correctamente');

class PWAApp {
    constructor() {
        this.deferredPrompt = null;
        this.isOnline = navigator.onLine;
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando PWA App...');
        await this.checkDependencies();
        this.setupInstallListener();
        this.setupEventListeners();
        await this.loadStoredData();
        this.updateUIStatus();
        console.log('✅ PWA App inicializada correctamente');
    }

    async checkDependencies() {
        const checks = {
            serviceWorker: 'serviceWorker' in navigator,
            indexedDB: 'indexedDB' in window,
            geolocation: 'geolocation' in navigator,
            notifications: 'Notification' in window,
            vibration: 'vibrate' in navigator,
            pushManager: 'PushManager' in window,
            share: 'share' in navigator
        };

        console.log('📊 Dependencias verificadas:', checks);
        this.updateDependencyStatus(checks);
    }

    updateDependencyStatus(checks) {
        const element = document.getElementById('notificationsStatus');
        if (element) {
            const supported = Object.values(checks).filter(Boolean).length;
            element.innerHTML = `<strong>🔔 Notificaciones:</strong> ${supported}/7 APIs`;
        }
    }

    setupInstallListener() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('🎯 beforeinstallprompt capturado');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA instalada');
            this.deferredPrompt = null;
            this.hideInstallButton();
            this.showInstallationSuccess();
        });
    }

    showInstallButton() {
        const btn = document.getElementById('installBtn');
        if (btn) {
            btn.style.display = 'block';
            btn.textContent = '📲 Instalar App';
        }
    }

    hideInstallButton() {
        const btn = document.getElementById('installBtn');
        if (btn) btn.style.display = 'none';
    }

    setupEventListeners() {
        // Delegación de eventos para mejor performance
        document.addEventListener('click', (e) => {
            const handlers = {
                'notifyBtn': () => this.showNotification(),
                'installBtn': () => this.showInstallPrompt(),
                'geolocationBtn': () => this.getGeolocation(),
                'vibrateBtn': () => this.vibrateDevice(),
                'saveDataBtn': () => this.saveSampleData(),
                'loadDataBtn': () => this.loadStoredData(),
                'clearDataBtn': () => this.clearAllData(),
                'batteryBtn': () => this.getBatteryStatus(),
                'shareBtn': () => this.shareApp(),
                'pushSubscribeBtn': () => this.subscribeToPush(),
                'pushUnsubscribeBtn': () => this.unsubscribeFromPush(),
                'pushTestBtn': () => this.testPushNotification()
            };

            if (e.target.id in handlers) {
                e.preventDefault();
                handlers[e.target.id]();
            }
        });

        const dataForm = document.getElementById('dataForm');
        if (dataForm) {
            dataForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCustomData();
            });
        }

        // Listeners globales
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateUIStatus();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateUIStatus();
        });
    }

    updateUIStatus() {
        // Actualizar estado de conexión
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            if (this.isOnline) {
                statusElement.textContent = '🟢 En línea';
                statusElement.className = 'status-online';
            } else {
                statusElement.textContent = '🔴 Sin conexión';
                statusElement.className = 'status-offline';
            }
        }

        // Actualizar estados de cache y DB
        const cacheStatus = document.getElementById('cacheStatus');
        if (cacheStatus) {
            cacheStatus.innerHTML = `<strong>💾 Cache:</strong> ${this.isOnline ? 'En línea' : 'Offline'}`;
        }

        const dbStatus = document.getElementById('dbStatus');
        if (dbStatus) {
            dbStatus.innerHTML = `<strong>🗃️ Base de datos:</strong> IndexedDB activa`;
        }
    }

    async showNotification() {
        if (!('Notification' in window)) {
            this.displayError('debugResult', 'Notificaciones no soportadas');
            return;
        }

        try {
            if (Notification.permission === 'granted') {
                this.createNotification();
            } else if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    this.createNotification();
                }
            }
        } catch (error) {
            this.displayError('debugResult', 'Error: ' + error.message);
        }
    }

    createNotification() {
        const notification = new Notification('¡Mi PWA Avanzada! 🎉', {
            body: `Notificación local - ${new Date().toLocaleString()}`,
            icon: './icon-192.png',
            tag: 'pwa-local',
            requireInteraction: true
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        this.displayResult('debugResult', {
            tipo: 'notificación_local',
            estado: 'enviada',
            timestamp: new Date().toISOString()
        }, 'Notificación');
    }

    async showInstallPrompt() {
        if (this.deferredPrompt) {
            try {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                
                this.deferredPrompt = null;
                this.hideInstallButton();
                
                if (outcome === 'accepted') {
                    this.displayResult('installResult', {
                        estado: '✅ Instalación en progreso',
                        mensaje: 'La app se agregará a tu pantalla de inicio'
                    }, 'Instalación');
                }
            } catch (error) {
                this.displayError('installResult', 'Error: ' + error.message);
            }
        } else {
            this.displayResult('installResult', {
                estado: '📲 Instalación Manual',
                mensaje: 'Usa el menú de tu navegador para instalar la app'
            }, 'Instalación');
        }
    }

    showInstallationSuccess() {
        this.displayResult('installResult', {
            estado: '✅ ¡App instalada!',
            mensaje: 'La PWA ahora está disponible en tu pantalla de inicio'
        }, 'Instalación Completa');
    }

    async getGeolocation() {
        try {
            this.showLoading('📍 Obteniendo ubicación...');
            const position = await window.apiHandlers.getGeolocation();
            
            const result = {
                latitud: position.coords.latitude.toFixed(6),
                longitud: position.coords.longitude.toFixed(6),
                precisión: `${position.coords.accuracy}m`,
                timestamp: new Date(position.timestamp).toLocaleString()
            };

            await window.db.saveData({
                type: 'geolocation',
                data: result,
                timestamp: new Date().getTime()
            });

            this.displayResult('geolocationResult', result, '📍 Geolocalización');
            this.hideLoading();
        } catch (error) {
            this.displayError('geolocationResult', 'Error: ' + error.message);
            this.hideLoading();
        }
    }

    vibrateDevice() {
        try {
            const success = window.apiHandlers.vibrate([100, 50, 100]);
            if (success) {
                this.displayResult('vibrateResult', { 
                    estado: '✅ Vibración activada',
                    patron: '[100ms, 50ms, 100ms]'
                }, '📳 Vibración');
            }
        } catch (error) {
            this.displayError('vibrateResult', 'Error: ' + error.message);
        }
    }

    async saveSampleData() {
        try {
            this.showLoading('💾 Guardando ejemplo...');
            const sampleData = {
                type: 'ejemplo',
                mensaje: 'Dato de ejemplo en IndexedDB',
                numero: Math.random(),
                timestamp: new Date().getTime()
            };

            const savedData = await window.db.saveData(sampleData);
            this.displayResult('dataResult', {
                operacion: 'guardar',
                estado: '✅ Éxito',
                dato: savedData
            }, '💾 Datos Guardados');
            this.hideLoading();
        } catch (error) {
            this.displayError('dataResult', 'Error: ' + error.message);
            this.hideLoading();
        }
    }

    async saveCustomData() {
        const input = document.getElementById('customDataInput');
        if (!input || !input.value.trim()) {
            this.displayError('dataResult', 'Escribe algo para guardar');
            return;
        }

        try {
            this.showLoading('💾 Guardando...');
            const customData = {
                type: 'personalizado',
                contenido: input.value.trim(),
                timestamp: new Date().getTime()
            };

            const savedData = await window.db.saveData(customData);
            this.displayResult('dataResult', {
                operacion: 'guardar_personalizado',
                estado: '✅ Éxito',
                dato: savedData
            }, '💾 Dato Guardado');
            
            input.value = '';
            this.hideLoading();
        } catch (error) {
            this.displayError('dataResult', 'Error: ' + error.message);
            this.hideLoading();
        }
    }

    async loadStoredData() {
        try {
            this.showLoading('📂 Cargando datos...');
            const allData = await window.db.getData();
            
            const result = {
                operacion: 'cargar',
                estado: '✅ Éxito',
                totalRegistros: allData.length,
                registrosRecientes: allData.slice(-3).reverse()
            };

            this.displayResult('dataResult', result, '📂 Datos Almacenados');
            this.hideLoading();
        } catch (error) {
            this.displayError('dataResult', 'Error: ' + error.message);
            this.hideLoading();
        }
    }

    async clearAllData() {
        if (!confirm('¿Eliminar TODOS los datos?\nEsta acción no se puede deshacer.')) {
            return;
        }

        try {
            this.showLoading('🗑️ Eliminando...');
            await window.db.clearAll();
            this.displayResult('dataResult', {
                operacion: 'limpiar',
                estado: '✅ Éxito',
                mensaje: 'Todos los datos eliminados'
            }, '🧹 Limpieza');
            this.hideLoading();
        } catch (error) {
            this.displayError('dataResult', 'Error: ' + error.message);
            this.hideLoading();
        }
    }

    async getBatteryStatus() {
        try {
            this.showLoading('🔋 Consultando...');
            const battery = await window.apiHandlers.getBatteryInfo();
            
            if (battery) {
                const result = {
                    nivel: `${Math.round(battery.level * 100)}%`,
                    cargando: battery.charging ? '✅ Sí' : '❌ No',
                    tiempoCarga: battery.chargingTime === Infinity ? 'Desconocido' : `${Math.round(battery.chargingTime / 60)}min`
                };
                this.displayResult('batteryResult', result, '🔋 Batería');
            }
            this.hideLoading();
        } catch (error) {
            this.displayError('batteryResult', 'Error: ' + error.message);
            this.hideLoading();
        }
    }

    async shareApp() {
        const shareData = {
            title: 'Mi PWA Avanzada',
            text: '¡Mira esta increíble PWA!',
            url: window.location.href
        };

        try {
            const success = await window.apiHandlers.shareData(shareData);
            if (!success) {
                this.displayResult('shareResult', { 
                    estado: '📤 Compartir no disponible',
                    mensaje: 'Usa la función de compartir de tu navegador'
                }, 'Compartir');
            }
        } catch (error) {
            this.displayError('shareResult', 'Error: ' + error.message);
        }
    }

    async subscribeToPush() {
        try {
            this.showLoading('📱 Suscribiendo...');
            await window.pushManager.subscribeToPush();
            this.displayResult('pushResult', {
                estado: '✅ Suscrito',
                mensaje: 'Notificaciones push activadas'
            }, '📬 Push');
            this.hideLoading();
        } catch (error) {
            this.displayError('pushResult', 'Error: ' + error.message);
            this.hideLoading();
        }
    }

    async unsubscribeFromPush() {
        try {
            this.showLoading('📱 Desuscribiendo...');
            await window.pushManager.unsubscribeFromPush();
            this.displayResult('pushResult', {
                estado: '🚫 Desuscrito',
                mensaje: 'Notificaciones push desactivadas'
            }, '📬 Push');
            this.hideLoading();
        } catch (error) {
            this.displayError('pushResult', 'Error: ' + error.message);
            this.hideLoading();
        }
    }

    async testPushNotification() {
        try {
            this.showLoading('🧪 Probando...');
            const sent = await window.pushManager.sendTestPush();
            if (sent) {
                this.displayResult('pushResult', {
                    estado: '🧪 Notificación enviada',
                    mensaje: 'Revisa tus notificaciones'
                }, 'Push Test');
            }
            this.hideLoading();
        } catch (error) {
            this.displayError('pushResult', 'Error: ' + error.message);
            this.hideLoading();
        }
    }

    displayResult(containerId, data, title = 'Resultado') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="result-card">
                <h4>${title}</h4>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
        `;
        container.style.display = 'block';
    }

    displayError(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="error-card">
                <h4>❌ Error</h4>
                <p>${message}</p>
            </div>
        `;
        container.style.display = 'block';
    }

    showLoading(message) {
        console.log('⏳', message);
    }

    hideLoading() {
        console.log('✅ Listo');
    }
}

// Inicialización optimizada
let appInitialized = false;

function initializeApp() {
    if (appInitialized) return;
    appInitialized = true;
    
    window.app = new PWAApp();
}

// Inicializar cuando sea seguro
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // Pequeño delay para no bloquear el render
    setTimeout(initializeApp, 100);
}