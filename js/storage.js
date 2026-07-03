// Конфиг API
const API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : `${window.location.protocol}//${window.location.host}`
};

// Безопасный fetch с retry и timeout
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    const timeout = options.timeout || 5000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let timeoutId; // объявляем вне try, чтобы был виден в catch
        try {
            const controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (err) {
            clearTimeout(timeoutId);
            if (attempt === maxRetries) throw err;
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

// Безопасное сохранение в localStorage с проверкой размера
function safeSetItem(key, value) {
    try {
        const jsonStr = JSON.stringify(value);
        const sizeInBytes = new Blob([jsonStr]).size;
        
        // Проверка размера перед сохранением (5MB max)
        if (sizeInBytes > 5 * 1024 * 1024) {
            throw new Error(`Данные слишком большие (${Math.round(sizeInBytes / 1024 / 1024)}MB > 5MB)`);
        }
        
        localStorage.setItem(key, jsonStr);
        return true;
    } catch (err) {
        if (err.name === 'QuotaExceededError' || err.message.includes('слишком большие')) {
            console.error('localStorage error:', err.message);
            alert(`❌ Ошибка хранилища: ${err.message}\nОчистите старые данные или выгрузите архив.`);
            return false;
        }
        throw err;
    }
}

class Storage {
    static async init() {
        try {
            const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/api/data`, { timeout: 5000 }, 3);
            const data = await response.json();
            try {
                safeSetItem('pp_clients', data.clients);
                safeSetItem('pp_products', data.products);
                safeSetItem('pp_orders', data.orders);
                safeSetItem('pp_invoices', data.invoices);
                safeSetItem('pp_payments', data.payments);
                safeSetItem('pp_reconciliations', data.reconciliations);
                console.log('✅ Data synced from server');
            } catch (storageErr) {
                console.error('localStorage error:', storageErr.message);
            }
        } catch (err) {
            console.warn('Using local data (server unavailable):', err.message);
        }
    }

    static async syncToServer(type, item) {
        try {
            const urls = {
                client: `${API_CONFIG.BASE_URL}/api/clients`,
                product: `${API_CONFIG.BASE_URL}/api/products`,
                order: `${API_CONFIG.BASE_URL}/api/orders`,
                invoice: `${API_CONFIG.BASE_URL}/api/invoices`,
                payment: `${API_CONFIG.BASE_URL}/api/payments`,
                reconciliation: `${API_CONFIG.BASE_URL}/api/reconciliations`,
                techcard: `${API_CONFIG.BASE_URL}/api/techcards`
            };
            const baseUrl = urls[type]; if (!baseUrl) return;
            const id = item._id || item.id;
            const cleanItem = { ...item }; delete cleanItem._id; delete cleanItem.__v;
            await fetch(`${baseUrl}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanItem)
            });
        } catch (err) { console.warn('Sync failed', err); }
    }

    static async deleteFromServer(type, id) {
        try {
            const urls = {
                client: `${API_CONFIG.BASE_URL}/api/clients`,
                product: `${API_CONFIG.BASE_URL}/api/products`,
                order: `${API_CONFIG.BASE_URL}/api/orders`,
                invoice: `${API_CONFIG.BASE_URL}/api/invoices`,
                payment: `${API_CONFIG.BASE_URL}/api/payments`,
                reconciliation: `${API_CONFIG.BASE_URL}/api/reconciliations`,
                techcard: `${API_CONFIG.BASE_URL}/api/techcards`
            };
            await fetch(`${urls[type]}/${id}`, { method: 'DELETE' });
        } catch (err) { console.warn('Delete sync failed', err); }
    }

    static getClients() { return JSON.parse(localStorage.getItem('pp_clients') || '[]'); }
    static async saveClient(client) {
        const clients = this.getClients();
        const index = clients.findIndex(c => c.id === client.id);
        if (index >= 0) clients[index] = client; else clients.push(client);
        safeSetItem('pp_clients', clients);
        await this.syncToServer('client', client);
    }
    static getClient(id) { return this.getClients().find(c => c.id === id); }
    static async deleteClient(id) {
        const client = this.getClient(id);
        if (client) {
            this.moveToTrash('client', client);
            const clients = this.getClients().filter(c => c.id !== id);
            safeSetItem('pp_clients', clients);
            await this.deleteFromServer('client', id);
        }
    }

    static getProducts() { return JSON.parse(localStorage.getItem('pp_products') || '[]'); }
    static async saveProduct(product) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === product.id);
        if (index >= 0) products[index] = product; else products.push(product);
        safeSetItem('pp_products', products);
        await this.syncToServer('product', product);
    }
    static getProduct(id) { return this.getProducts().find(p => p.id === id); }
    static async deleteProduct(id) {
        const product = this.getProduct(id);
        if (product) {
            this.moveToTrash('product', product);
            const products = this.getProducts().filter(p => p.id !== id);
            safeSetItem('pp_products', products);
            await this.deleteFromServer('product', id);
        }
    }

    static getOrders() { return JSON.parse(localStorage.getItem('pp_orders') || '[]'); }
    static async saveOrder(order) {
        const orders = this.getOrders();
        const index = orders.findIndex(o => o.id === order.id);
        if (index >= 0) orders[index] = order; else orders.push(order);
        safeSetItem('pp_orders', orders);
        await this.syncToServer('order', order);
    }
    static getOrder(id) { return this.getOrders().find(o => o.id === id); }
    static async deleteOrder(id) {
        const order = this.getOrder(id);
        if (order) {
            this.moveToTrash('order', order);
            const orders = this.getOrders().filter(o => o.id !== id);
            safeSetItem('pp_orders', orders);
            await this.deleteFromServer('order', id);
        }
    }

    static getInvoices() { return JSON.parse(localStorage.getItem('pp_invoices') || '[]'); }
    static async saveInvoice(invoice) {
        const invoices = this.getInvoices();
        const index = invoices.findIndex(i => i.id === invoice.id);
        if (index >= 0) invoices[index] = invoice; else invoices.push(invoice);
        safeSetItem('pp_invoices', invoices);
        await this.syncToServer('invoice', invoice);
    }
    static getInvoice(id) { return this.getInvoices().find(i => i.id === id); }
    static async deleteInvoice(id) {
        const invoice = this.getInvoice(id);
        if (invoice) {
            this.moveToTrash('invoice', invoice);
            const invoices = this.getInvoices().filter(i => i.id !== id);
            safeSetItem('pp_invoices', invoices);
            await this.deleteFromServer('invoice', id);
        }
    }

    static getPayments() { return JSON.parse(localStorage.getItem('pp_payments') || '[]'); }
    static async savePayment(payment) {
        const payments = this.getPayments();
        const index = payments.findIndex(p => p.id === payment.id);
        if (index >= 0) payments[index] = payment; else payments.push(payment);
        safeSetItem('pp_payments', payments);
        await this.syncToServer('payment', payment);
    }
    static getPayment(id) { return this.getPayments().find(p => p.id === id); }
    static async deletePayment(id) {
        const payment = this.getPayment(id);
        if (payment) {
            this.moveToTrash('payment', payment);
            const payments = this.getPayments().filter(p => p.id !== id);
            safeSetItem('pp_payments', payments);
            await this.deleteFromServer('payment', id);
        }
    }

    static getReconciliations() { return JSON.parse(localStorage.getItem('pp_reconciliations') || '[]'); }
    static async saveReconciliation(recon) {
        const recons = this.getReconciliations();
        const index = recons.findIndex(r => r.id === recon.id);
        if (index >= 0) recons[index] = recon; else recons.push(recon);
        safeSetItem('pp_reconciliations', recons);
        await this.syncToServer('reconciliation', recon);
    }
    static getReconciliation(id) { return this.getReconciliations().find(r => r.id === id); }
    static async deleteReconciliation(id) {
        const recon = this.getReconciliation(id);
        if (recon) {
            this.moveToTrash('reconciliation', recon);
            const recons = this.getReconciliations().filter(r => r.id !== id);
            safeSetItem('pp_reconciliations', recons);
            await this.deleteFromServer('reconciliation', id);
        }
    }

    static getTechCards() { return JSON.parse(localStorage.getItem('pp_techcards') || '[]'); }
    static async saveTechCard(card) {
        const cards = this.getTechCards();
        const index = cards.findIndex(c => c.id === card.id);
        if (index >= 0) cards[index] = card; else cards.push(card);
        safeSetItem('pp_techcards', cards);
        await this.syncToServer('techcard', card);
    }
    static getTechCard(id) { return this.getTechCards().find(c => c.id === id); }
    static async deleteTechCard(id) {
        const card = this.getTechCard(id);
        if (card) {
            this.moveToTrash('techcard', card);
            const cards = this.getTechCards().filter(c => c.id !== id);
            safeSetItem('pp_techcards', cards);
            await this.deleteFromServer('techcard', id);
        }
    }

    static getProductionOrders() {
        return JSON.parse(localStorage.getItem('pp_production') || '[]');
    }

    static getTrash() { return JSON.parse(localStorage.getItem('pp_trash') || '[]'); }
    static saveTrash(trash) { safeSetItem('pp_trash', trash); }
    static moveToTrash(type, item) {
        const trash = this.getTrash();
        trash.push({ type, item, deletedAt: new Date().toISOString() });
        this.saveTrash(trash);
    }
    static async restoreFromTrash(index) {
        const trash = this.getTrash();
        if (index < 0 || index >= trash.length) return false;
        const entry = trash[index];
        switch (entry.type) {
            case 'order': await this.saveOrder(entry.item); break;
            case 'invoice': await this.saveInvoice(entry.item); break;
            case 'reconciliation': await this.saveReconciliation(entry.item); break;
            case 'payment': await this.savePayment(entry.item); break;
            case 'client': await this.saveClient(entry.item); break;
            case 'product': await this.saveProduct(entry.item); break;
            case 'techcard': await this.saveTechCard(entry.item); break;
        }
        trash.splice(index, 1);
        this.saveTrash(trash);
        return true;
    }
    static permanentlyDeleteFromTrash(index) {
        const trash = this.getTrash();
        if (index >= 0 && index < trash.length) trash.splice(index, 1);
        this.saveTrash(trash);
    }
    static clearTrash() { safeSetItem('pp_trash', []); }
}