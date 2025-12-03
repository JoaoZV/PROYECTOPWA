console.log('✅ db.js cargado correctamente');

class Database {
    constructor() {
        console.log('🗃️ Base de datos inicializada');
        this.dbName = 'PWA_DB';
        this.dbVersion = 2; // Incrementar si cambia el schema
        this.storeName = 'datos';
        this.db = null;
        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                const error = new Error('IndexedDB no está soportado en este navegador');
                console.error('❌', error.message);
                reject(error);
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('❌ Error abriendo IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = (event) => {
                console.log('✅ IndexedDB abierta correctamente');
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                console.log('🔄 Actualizando estructura de IndexedDB');
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                
                // Crear objectStore si no existe
                if (!db.objectStoreNames.contains(this.storeName)) {
                    console.log('📝 Creando nuevo objectStore:', this.storeName);
                    const store = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    
                    // Crear índices para búsquedas eficientes
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('timestamp_type', ['timestamp', 'type'], { unique: false });
                    
                    console.log('✅ ObjectStore e índices creados');
                }
                
                // Migraciones según versión anterior
                if (oldVersion < 1) {
                    console.log('🔄 Ejecutando migración de v0 a v1');
                    // Migraciones para versión 1
                }
                
                if (oldVersion < 2) {
                    console.log('🔄 Ejecutando migración de v1 a v2');
                    // Migraciones para versión 2
                }
            };

            request.onblocked = (event) => {
                console.warn('⚠️ IndexedDB bloqueada - cierra otras pestañas con esta app');
            };
        });
    }

    async ensureDB() {
        if (!this.db) {
            await this.init();
        }
        return this.db;
    }

    async saveData(data) {
        try {
            await this.ensureDB();
            
            if (!data || typeof data !== 'object') {
                throw new Error('Los datos deben ser un objeto');
            }

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                
                // Agregar metadata
                const dataWithMeta = {
                    ...data,
                    timestamp: new Date().getTime(),
                    version: 1
                };
                
                const request = store.add(dataWithMeta);
                
                request.onsuccess = () => {
                    const result = { id: request.result, ...dataWithMeta };
                    console.log('💾 Dato guardado con ID:', request.result);
                    resolve(result);
                };
                
                request.onerror = () => {
                    console.error('❌ Error guardando dato:', request.error);
                    reject(request.error);
                };

                transaction.oncomplete = () => {
                    console.log('✅ Transacción de guardado completada');
                };

                transaction.onerror = () => {
                    console.error('❌ Error en transacción:', transaction.error);
                };
            });
        } catch (error) {
            console.error('❌ Error en saveData:', error);
            throw error;
        }
    }

    async getData(options = {}) {
        try {
            await this.ensureDB();
            
            const { 
                limit = 0, 
                offset = 0, 
                type = null,
                order = 'desc' 
            } = options;

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const index = store.index('timestamp');
                
                let request;
                if (type) {
                    // Filtrar por tipo usando índice compuesto
                    const range = IDBKeyRange.bound(
                        [0, type],
                        [Date.now(), type]
                    );
                    request = index.openCursor(range, order === 'desc' ? 'prev' : 'next');
                } else {
                    // Obtener todos ordenados por timestamp
                    request = index.openCursor(null, order === 'desc' ? 'prev' : 'next');
                }

                const results = [];
                let count = 0;
                let skipped = 0;

                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        // Aplicar offset
                        if (skipped < offset) {
                            skipped++;
                            cursor.continue();
                            return;
                        }
                        
                        // Aplicar limit
                        if (limit > 0 && count >= limit) {
                            resolve(results);
                            return;
                        }
                        
                        results.push(cursor.value);
                        count++;
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ Error obteniendo datos:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ Error en getData:', error);
            throw error;
        }
    }

    async getDataById(id) {
        try {
            await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(id);
                
                request.onsuccess = () => {
                    resolve(request.result);
                };
                
                request.onerror = () => {
                    console.error('❌ Error obteniendo dato por ID:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ Error en getDataById:', error);
            throw error;
        }
    }

    async updateData(id, updates) {
        try {
            await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                
                // Primero obtener el dato existente
                const getRequest = store.get(id);
                
                getRequest.onsuccess = () => {
                    const existingData = getRequest.result;
                    if (!existingData) {
                        reject(new Error(`Dato con ID ${id} no encontrado`));
                        return;
                    }
                    
                    // Actualizar el dato
                    const updatedData = {
                        ...existingData,
                        ...updates,
                        updatedAt: new Date().getTime()
                    };
                    
                    const putRequest = store.put(updatedData);
                    
                    putRequest.onsuccess = () => {
                        console.log('✏️ Dato actualizado con ID:', id);
                        resolve(updatedData);
                    };
                    
                    putRequest.onerror = () => {
                        console.error('❌ Error actualizando dato:', putRequest.error);
                        reject(putRequest.error);
                    };
                };
                
                getRequest.onerror = () => {
                    console.error('❌ Error obteniendo dato para actualizar:', getRequest.error);
                    reject(getRequest.error);
                };
            });
        } catch (error) {
            console.error('❌ Error en updateData:', error);
            throw error;
        }
    }

    async deleteData(id) {
        try {
            await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(id);
                
                request.onsuccess = () => {
                    console.log('🗑️ Dato eliminado con ID:', id);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ Error eliminando dato:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ Error en deleteData:', error);
            throw error;
        }
    }

    async clearAll() {
        try {
            await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log('🧹 Todos los datos eliminados');
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ Error eliminando todos los datos:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ Error en clearAll:', error);
            throw error;
        }
    }

    async getStats() {
        try {
            await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName');
                const countRequest = store.count();
                
                countRequest.onsuccess = () => {
                    const stats = {
                        totalRecords: countRequest.result,
                        dbName: this.dbName,
                        storeName: this.storeName,
                        version: this.dbVersion
                    };
                    resolve(stats);
                };
                
                countRequest.onerror = () => {
                    console.error('❌ Error obteniendo estadísticas:', countRequest.error);
                    reject(countRequest.error);
                };
            });
        } catch (error) {
            console.error('❌ Error en getStats:', error);
            throw error;
        }
    }

    async exportData() {
        try {
            const allData = await this.getData();
            return {
                exportDate: new Date().toISOString(),
                version: this.dbVersion,
                totalRecords: allData.length,
                data: allData
            };
        } catch (error) {
            console.error('❌ Error exportando datos:', error);
            throw error;
        }
    }

    async importData(data) {
        try {
            if (!data || !Array.isArray(data.data)) {
                throw new Error('Formato de datos de importación inválido');
            }

            console.log('📥 Importando', data.data.length, 'registros...');
            
            for (const item of data.data) {
                await this.saveData(item);
            }
            
            console.log('✅ Importación completada');
            return true;
        } catch (error) {
            console.error('❌ Error importando datos:', error);
            throw error;
        }
    }

    // Método para cerrar la base de datos (útil para tests)
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('🔒 Base de datos cerrada');
        }
    }

    // Método para eliminar la base de datos completamente (útil para reset)
    async deleteDatabase() {
        if (this.db) {
            this.db.close();
        }
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            
            request.onsuccess = () => {
                console.log('🗑️ Base de datos eliminada:', this.dbName);
                this.db = null;
                resolve(true);
            };
            
            request.onerror = () => {
                console.error('❌ Error eliminando base de datos:', request.error);
                reject(request.error);
            };
            
            request.onblocked = () => {
                console.warn('⚠️ Eliminación de BD bloqueada - cierra otras pestañas');
                reject(new Error('Database deletion blocked'));
            };
        });
    }
}

// Crear instancia global
window.db = new Database();

// Manejar errores no capturados
window.db.catchErrors = (error) => {
    console.error('💥 Error no capturado en Database:', error);
};

console.log('🗃️ Database class ready - métodos disponibles:', 
    Object.getOwnPropertyNames(Database.prototype)
        .filter(name => name !== 'constructor' && typeof Database.prototype[name] === 'function')
);