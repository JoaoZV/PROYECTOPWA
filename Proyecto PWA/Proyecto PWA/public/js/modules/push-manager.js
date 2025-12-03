console.log('✅ push-manager.js cargado correctamente');

class PushManager {
    constructor() {
        console.log('📬 Push Manager inicializado');
        this.publicVapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-WkvGNg8dS1W6XJSNpmSNPrQc6MHd1_nXq0pd2d3m-W8n2feGT8Yds0E';
        this.subscription = null;
        this.isSubscribed = false;
        this.registration = null;
        this.init();
    }

    async init() {
        if (!this.supportsPush()) {
            console.warn('⚠️ Push notifications no soportadas en este navegador');
            return;
        }

        try {
            this.registration = await navigator.serviceWorker.ready;
            await this.checkSubscription();
            console.log('📬 Push Manager listo - Suscripción:', this.isSubscribed);
        } catch (error) {
            console.error('❌ Error inicializando Push Manager:', error);
        }
    }

    supportsPush() {
        const supported = 'serviceWorker' in navigator && 'PushManager' in window;
        console.log('🔍 Push notifications soportadas:', supported);
        return supported;
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async subscribeToPush() {
        if (!this.supportsPush()) {
            throw new Error('Push notifications no soportadas');
        }

        try {
            if (!this.registration) {
                this.registration = await navigator.serviceWorker.ready;
            }

            // Verificar permisos de notificación
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permiso de notificación denegado por el usuario');
            }

            // Suscribir al usuario
            this.subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.publicVapidKey)
            });

            this.isSubscribed = true;
            console.log('✅ Usuario suscrito a push notifications:', this.subscription);

            // Enviar suscripción al servidor (simulado)
            await this.sendSubscriptionToServer(this.subscription);
            
            return this.subscription;
        } catch (error) {
            console.error('❌ Error suscribiendo a push:', error);
            this.isSubscribed = false;
            throw error;
        }
    }

    async unsubscribeFromPush() {
        if (!this.subscription) {
            console.log('ℹ️ Usuario no está suscrito');
            return;
        }

        try {
            await this.subscription.unsubscribe();
            this.isSubscribed = false;
            this.subscription = null;
            console.log('✅ Usuario desuscrito de push notifications');
            
            // Notificar al servidor (simulado)
            await this.removeSubscriptionFromServer();
        } catch (error) {
            console.error('❌ Error desuscribiendo de push:', error);
            throw error;
        }
    }

    async checkSubscription() {
        if (!this.supportsPush()) {
            return false;
        }

        try {
            if (!this.registration) {
                this.registration = await navigator.serviceWorker.ready;
            }

            this.subscription = await this.registration.pushManager.getSubscription();
            this.isSubscribed = !!(this.subscription);
            
            console.log('📊 Estado de suscripción:', this.isSubscribed);
            return this.isSubscribed;
        } catch (error) {
            console.error('❌ Error verificando suscripción:', error);
            return false;
        }
    }

    async sendSubscriptionToServer(subscription) {
        console.log('📤 Enviando suscripción al servidor...', subscription);
        
        // Simular envío al servidor
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.setItem('push-subscription', JSON.stringify(subscription));
                console.log('✅ Suscripción guardada en servidor (simulado)');
                resolve(true);
            }, 1000);
        });
    }

    async removeSubscriptionFromServer() {
        console.log('🗑️ Eliminando suscripción del servidor...');
        
        // Simular eliminación del servidor
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.removeItem('push-subscription');
                console.log('✅ Suscripción eliminada del servidor (simulado)');
                resolve(true);
            }, 1000);
        });
    }

    async sendTestPush() {
        if (!this.isSubscribed) {
            throw new Error('Usuario no suscrito a push notifications');
        }

        console.log('🧪 Enviando notificación push de prueba...');
        
        // En una app real, esto lo haría tu servidor
        // Aquí simulamos el envío mostrando una notificación local
        if (this.registration) {
            await this.registration.showNotification('Prueba de Push Notifications 🎉', {
                body: '¡Esta es una notificación push de prueba! Funciona correctamente.',
                icon: './icon-192.png',
                badge: './icon-72.png',
                tag: 'test-push',
                requireInteraction: true,
                actions: [
                    {
                        action: 'open',
                        title: 'Abrir App'
                    },
                    {
                        action: 'close', 
                        title: 'Cerrar'
                    }
                ],
                data: {
                    url: window.location.href,
                    test: true,
                    timestamp: new Date().getTime()
                }
            });
            
            console.log('✅ Notificación de prueba enviada');
            return true;
        }
        
        return false;
    }

    getSubscriptionInfo() {
        if (!this.subscription) {
            return null;
        }

        try {
            const subscriptionJSON = this.subscription.toJSON();
            return {
                endpoint: subscriptionJSON.endpoint ? '...' + subscriptionJSON.endpoint.slice(-20) : 'N/A',
                keys: subscriptionJSON.keys ? {
                    p256dh: '••••' + (subscriptionJSON.keys.p256dh || '').slice(-8),
                    auth: '••••' + (subscriptionJSON.keys.auth || '').slice(-8)
                } : null,
                expirationTime: this.subscription.expirationTime,
                isSubscribed: this.isSubscribed
            };
        } catch (error) {
            console.error('❌ Error obteniendo información de suscripción:', error);
            return null;
        }
    }

    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            throw new Error('Notifications no soportadas');
        }

        const permission = await Notification.requestPermission();
        console.log('🔔 Permiso de notificación:', permission);
        return permission;
    }

    getNotificationPermission() {
        if (!('Notification' in window)) {
            return 'not-supported';
        }
        return Notification.permission;
    }

    async simulatePushFromServer() {
        if (!this.registration) {
            throw new Error('Service Worker no registrado');
        }

        // Simular una notificación push del servidor
        await this.registration.showNotification('Mensaje del Servidor 📡', {
            body: 'Este es un mensaje simulado del servidor. En producción, esto vendría a través de Push API.',
            icon: './icon-192.png',
            badge: './icon-72.png',
            tag: 'server-simulation',
            requireInteraction: false,
            data: {
                url: window.location.href,
                source: 'server-simulation',
                timestamp: new Date().getTime()
            }
        });

        console.log('📡 Notificación del servidor simulada');
        return true;
    }

    // Método para debug
    async debugPushManager() {
        const debugInfo = {
            supportsPush: this.supportsPush(),
            isSubscribed: this.isSubscribed,
            subscription: this.getSubscriptionInfo(),
            notificationPermission: this.getNotificationPermission(),
            serviceWorker: !!this.registration,
            publicVapidKey: this.publicVapidKey ? 'Configurada' : 'No configurada'
        };

        console.log('🐛 Debug Push Manager:', debugInfo);
        return debugInfo;
    }
}

// Crear instancia global
window.pushManager = new PushManager();

// Manejar errores no capturados
window.addEventListener('error', (event) => {
    console.error('💥 Error no capturado:', event.error);
});

console.log('📬 Push Manager completamente inicializado');