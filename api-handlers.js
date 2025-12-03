console.log('✅ api-handlers.js cargado correctamente');

class APIHandlers {
    constructor() {
        console.log('🛠️ Manejadores de API listos');
        this.supportedAPIs = this.checkSupportedAPIs();
        this.logSupportedAPIs();
    }

    checkSupportedAPIs() {
        return {
            geolocation: 'geolocation' in navigator,
            vibration: 'vibrate' in navigator,
            battery: 'getBattery' in navigator || 'battery' in navigator,
            share: 'share' in navigator,
            clipboard: 'clipboard' in navigator,
            bluetooth: 'bluetooth' in navigator,
            nfc: 'nfc' in navigator,
            contacts: 'contacts' in navigator
        };
    }

    logSupportedAPIs() {
        const supported = Object.values(this.supportedAPIs).filter(Boolean).length;
        const total = Object.keys(this.supportedAPIs).length;
        console.log(`📊 APIs soportadas: ${supported}/${total}`, this.supportedAPIs);
    }

    async getGeolocation(options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.supportedAPIs.geolocation) {
                const error = new Error('Geolocalización no soportada en este navegador');
                console.error('❌', error.message);
                reject(error);
                return;
            }

            const defaultOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            };

            const finalOptions = { ...defaultOptions, ...options };

            console.log('📍 Solicitando geolocalización con opciones:', finalOptions);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('📍 Geolocalización obtenida exitosamente:', {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                    resolve(position);
                },
                (error) => {
                    const errorMessages = {
                        1: 'Permiso de geolocalización denegado por el usuario',
                        2: 'La posición no está disponible',
                        3: 'Tiempo de espera agotado'
                    };
                    
                    const errorMessage = errorMessages[error.code] || error.message;
                    console.error('❌ Error de geolocalización:', errorMessage, error);
                    reject(new Error(errorMessage));
                },
                finalOptions
            );
        });
    }

    vibrate(pattern = [200, 100, 200]) {
        if (!this.supportedAPIs.vibration) {
            console.warn('⚠️ API de vibración no soportada');
            return false;
        }

        try {
            // Validar el patrón
            if (!Array.isArray(pattern)) {
                console.warn('⚠️ Patrón de vibración inválido, usando patrón por defecto');
                pattern = [200, 100, 200];
            }

            // Asegurarse de que todos los valores sean números positivos
            const validPattern = pattern.map(val => Math.max(0, Number(val) || 0));
            
            console.log('📳 Activando vibración con patrón:', validPattern);
            navigator.vibrate(validPattern);
            return true;
        } catch (error) {
            console.error('❌ Error activando vibración:', error);
            return false;
        }
    }

    stopVibration() {
        if (this.supportedAPIs.vibration) {
            navigator.vibrate(0);
            console.log('⏹️ Vibración detenida');
            return true;
        }
        return false;
    }

    async getBatteryInfo() {
        if (!this.supportedAPIs.battery) {
            console.warn('⚠️ API de batería no soportada');
            return null;
        }

        try {
            let battery;
            
            // Diferentes navegadores implementan la API de manera diferente
            if ('getBattery' in navigator) {
                battery = await navigator.getBattery();
            } else if ('battery' in navigator) {
                battery = await navigator.battery;
            } else {
                throw new Error('API de batería no disponible');
            }

            console.log('🔋 Información de batería obtenida:', {
                level: battery.level,
                charging: battery.charging,
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime
            });

            return battery;
        } catch (error) {
            console.error('❌ Error obteniendo información de batería:', error);
            return null;
        }
    }

    async shareData(data) {
        if (!this.supportedAPIs.share) {
            console.warn('⚠️ Web Share API no soportada');
            return false;
        }

        try {
            // Validar datos requeridos
            if (!data || (!data.url && !data.text && !data.title)) {
                throw new Error('Se requieren datos para compartir (url, text o title)');
            }

            console.log('📤 Compartiendo datos:', data);
            await navigator.share(data);
            console.log('✅ Datos compartidos exitosamente');
            return true;
        } catch (error) {
            // Error de cancelación por el usuario no es un error real
            if (error.name === 'AbortError') {
                console.log('📤 Compartir cancelado por el usuario');
                return false;
            }
            
            console.error('❌ Error compartiendo datos:', error);
            return false;
        }
    }

    async copyToClipboard(text) {
        if (!this.supportedAPIs.clipboard) {
            console.warn('⚠️ Clipboard API no soportada');
            return this.fallbackCopyToClipboard(text);
        }

        try {
            await navigator.clipboard.writeText(text);
            console.log('📋 Texto copiado al portapapeles:', text.substring(0, 50) + '...');
            return true;
        } catch (error) {
            console.error('❌ Error copiando al portapapeles:', error);
            return this.fallbackCopyToClipboard(text);
        }
    }

    async fallbackCopyToClipboard(text) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                console.log('📋 Texto copiado (fallback):', text.substring(0, 50) + '...');
                return true;
            } else {
                throw new Error('Fallback copy failed');
            }
        } catch (error) {
            console.error('❌ Error en fallback copy:', error);
            return false;
        }
    }

    async readFromClipboard() {
        if (!this.supportedAPIs.clipboard) {
            console.warn('⚠️ Clipboard API no soportada para lectura');
            return null;
        }

        try {
            const text = await navigator.clipboard.readText();
            console.log('📋 Texto leído del portapapeles:', text.substring(0, 50) + '...');
            return text;
        } catch (error) {
            console.error('❌ Error leyendo del portapapeles:', error);
            return null;
        }
    }

    async getDeviceInfo() {
        const info = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            cookieEnabled: navigator.cookieEnabled,
            javaEnabled: navigator.javaEnabled ? navigator.javaEnabled() : false,
            pdfViewerEnabled: navigator.pdfViewerEnabled || false,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown',
            maxTouchPoints: navigator.maxTouchPoints || 0,
            onLine: navigator.onLine
        };

        console.log('📱 Información del dispositivo:', info);
        return info;
    }

    async getScreenInfo() {
        const info = {
            width: screen.width,
            height: screen.height,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
            orientation: screen.orientation ? {
                type: screen.orientation.type,
                angle: screen.orientation.angle
            } : 'not supported'
        };

        console.log('🖥️ Información de pantalla:', info);
        return info;
    }

    async getConnectionInfo() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            const info = {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData,
                onchange: !!connection.onchange
            };
            console.log('📶 Información de conexión:', info);
            return info;
        } else {
            console.warn('⚠️ Network Information API no soportada');
            return { supported: false };
        }
    }

    // Método para probar múltiples APIs a la vez
    async testAllAPIs() {
        const results = {};

        try {
            results.geolocation = await this.getGeolocation().then(() => '✅').catch(() => '❌');
        } catch (error) {
            results.geolocation = '❌';
        }

        results.vibration = this.vibrate([100]) ? '✅' : '❌';
        
        try {
            const battery = await this.getBatteryInfo();
            results.battery = battery ? '✅' : '❌';
        } catch (error) {
            results.battery = '❌';
        }

        results.share = this.supportedAPIs.share ? '✅' : '❌';
        results.clipboard = this.supportedAPIs.clipboard ? '✅' : '❌';

        console.log('🧪 Resultados de pruebas de APIs:', results);
        return results;
    }

    // Método utilitario para verificar permisos
    async checkPermissions() {
        const permissions = {};

        if ('permissions' in navigator) {
            try {
                permissions.geolocation = await navigator.permissions.query({ name: 'geolocation' });
                permissions.notifications = await navigator.permissions.query({ name: 'notifications' });
                permissions.clipboard = await navigator.permissions.query({ name: 'clipboard-write' });
                
                console.log('🔐 Estado de permisos:', permissions);
            } catch (error) {
                console.warn('⚠️ Error verificando permisos:', error);
            }
        }

        return permissions;
    }

    // Método para obtener información del almacenamiento
    async getStorageInfo() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                console.log('💾 Información de almacenamiento:', estimate);
                return estimate;
            } catch (error) {
                console.error('❌ Error obteniendo información de almacenamiento:', error);
                return null;
            }
        } else {
            console.warn('⚠️ Storage Estimation API no soportada');
            return null;
        }
    }

    // Método para solicitar almacenamiento persistente
    async requestPersistentStorage() {
        if ('storage' in navigator && 'persist' in navigator.storage) {
            try {
                const persisted = await navigator.storage.persist();
                console.log('💾 Almacenamiento persistente:', persisted ? 'Concedido' : 'Denegado');
                return persisted;
            } catch (error) {
                console.error('❌ Error solicitando almacenamiento persistente:', error);
                return false;
            }
        } else {
            console.warn('⚠️ Persistent Storage API no soportada');
            return false;
        }
    }
}

// Crear instancia global
window.apiHandlers = new APIHandlers();

// Exportar para tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIHandlers;
}

console.log('🛠️ API Handlers completamente inicializados');