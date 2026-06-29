class Storage {
    static async init() {
        try {
            const response = await fetch('http://localhost:3000/api/data');
            if (!response.ok) throw new Error('Server not available');
            const data = await response.json();
            localStorage.setItem('pp_clients', JSON.stringify(data.clients));
            localStorage.setItem('pp_products', JSON.stringify(data.products));
            localStorage.setItem('pp_orders', JSON.stringify(data.orders));
            localStorage.setItem('pp_invoices', JSON.stringify(data.invoices));
            localStorage.setItem('pp_payments', JSON.stringify(data.payments));
            localStorage.setItem('pp_reconciliations', JSON.stringify(data.reconciliations));
            console.log('Data synced from server');
        } catch (err) {
            console.warn('Using local data (server unavailable):', err.message);
        }
    }

    static async syncToServer(type, item) {
        try {
            const urls = {
                client: 'http://localhost:3000/api/clients',
                product: 'http://localhost:3000/api/products',
                order: 'http://localhost:3000/api/orders',
                invoice: 'http://localhost:3000/api/invoices',
                payment: 'http://localhost:3000/api/payments',
                reconciliation: 'http://localhost:3000/api/reconciliations'
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
                client: 'http://localhost:3000/api/clients',
                product: 'http://localhost:3000/api/products',
                order: 'http://localhost:3000/api/orders',
                invoice: 'http://localhost:3000/api/invoices',
                payment: 'http://localhost:3000/api/payments',
                reconciliation: 'http://localhost:3000/api/reconciliations'
            };
            await fetch(`${urls[type]}/${id}`, { method: 'DELETE' });
        } catch (err) { console.warn('Delete sync failed', err); }
    }

    static getClients() { return JSON.parse(localStorage.getItem('pp_clients') || '[]'); }
    static saveClient(client) {
        const clients = this.getClients();
        const index = clients.findIndex(c => c.id === client.id);
        if (index >= 0) clients[index] = client; else clients.push(client);
        localStorage.setItem('pp_clients', JSON.stringify(clients));
        this.syncToServer('client', client);
    }
    static getClient(id) { return this.getClients().find(c => c.id === id); }
    static deleteClient(id) {
        const client = this.getClient(id);
        if (client) {
            this.moveToTrash('client', client);
            const clients = this.getClients().filter(c => c.id !== id);
            localStorage.setItem('pp_clients', JSON.stringify(clients));
            this.deleteFromServer('client', id);
        }
    }

    static getProducts() { return JSON.parse(localStorage.getItem('pp_products') || '[]'); }
    static saveProduct(product) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === product.id);
        if (index >= 0) products[index] = product; else products.push(product);
        localStorage.setItem('pp_products', JSON.stringify(products));
        this.syncToServer('product', product);
    }
    static getProduct(id) { return this.getProducts().find(p => p.id === id); }
    static deleteProduct(id) {
        const product = this.getProduct(id);
        if (product) {
            this.moveToTrash('product', product);
            const products = this.getProducts().filter(p => p.id !== id);
            localStorage.setItem('pp_products', JSON.stringify(products));
            this.deleteFromServer('product', id);
        }
    }

    static getOrders() { return JSON.parse(localStorage.getItem('pp_orders') || '[]'); }
    static saveOrder(order) {
        const orders = this.getOrders();
        const index = orders.findIndex(o => o.id === order.id);
        if (index >= 0) orders[index] = order; else orders.push(order);
        localStorage.setItem('pp_orders', JSON.stringify(orders));
        this.syncToServer('order', order);
    }
    static getOrder(id) { return this.getOrders().find(o => o.id === id); }
    static deleteOrder(id) {
        const order = this.getOrder(id);
        if (order) {
            this.moveToTrash('order', order);
            const orders = this.getOrders().filter(o => o.id !== id);
            localStorage.setItem('pp_orders', JSON.stringify(orders));
            this.deleteFromServer('order', id);
        }
    }

    static getInvoices() { return JSON.parse(localStorage.getItem('pp_invoices') || '[]'); }
    static saveInvoice(invoice) {
        const invoices = this.getInvoices();
        const index = invoices.findIndex(i => i.id === invoice.id);
        if (index >= 0) invoices[index] = invoice; else invoices.push(invoice);
        localStorage.setItem('pp_invoices', JSON.stringify(invoices));
        this.syncToServer('invoice', invoice);
    }
    static getInvoice(id) { return this.getInvoices().find(i => i.id === id); }
    static deleteInvoice(id) {
        const invoice = this.getInvoice(id);
        if (invoice) {
            this.moveToTrash('invoice', invoice);
            const invoices = this.getInvoices().filter(i => i.id !== id);
            localStorage.setItem('pp_invoices', JSON.stringify(invoices));
            this.deleteFromServer('invoice', id);
        }
    }

    static getPayments() { return JSON.parse(localStorage.getItem('pp_payments') || '[]'); }
    static savePayment(payment) {
        const payments = this.getPayments();
        const index = payments.findIndex(p => p.id === payment.id);
        if (index >= 0) payments[index] = payment; else payments.push(payment);
        localStorage.setItem('pp_payments', JSON.stringify(payments));
        this.syncToServer('payment', payment);
    }
    static getPayment(id) { return this.getPayments().find(p => p.id === id); }
    static deletePayment(id) {
        const payment = this.getPayment(id);
        if (payment) {
            this.moveToTrash('payment', payment);
            const payments = this.getPayments().filter(p => p.id !== id);
            localStorage.setItem('pp_payments', JSON.stringify(payments));
            this.deleteFromServer('payment', id);
        }
    }

    static getReconciliations() { return JSON.parse(localStorage.getItem('pp_reconciliations') || '[]'); }
    static saveReconciliation(recon) {
        const recons = this.getReconciliations();
        const index = recons.findIndex(r => r.id === recon.id);
        if (index >= 0) recons[index] = recon; else recons.push(recon);
        localStorage.setItem('pp_reconciliations', JSON.stringify(recons));
        this.syncToServer('reconciliation', recon);
    }
    static getReconciliation(id) { return this.getReconciliations().find(r => r.id === id); }
    static deleteReconciliation(id) {
        const recon = this.getReconciliation(id);
        if (recon) {
            this.moveToTrash('reconciliation', recon);
            const recons = this.getReconciliations().filter(r => r.id !== id);
            localStorage.setItem('pp_reconciliations', JSON.stringify(recons));
            this.deleteFromServer('reconciliation', id);
        }
    }

    static getProductionOrders() {
        return JSON.parse(localStorage.getItem('pp_production') || '[]');
    }

    static getTrash() { return JSON.parse(localStorage.getItem('pp_trash') || '[]'); }
    static saveTrash(trash) { localStorage.setItem('pp_trash', JSON.stringify(trash)); }
    static moveToTrash(type, item) {
        const trash = this.getTrash();
        trash.push({ type, item, deletedAt: new Date().toISOString() });
        this.saveTrash(trash);
    }
    static restoreFromTrash(index) {
        const trash = this.getTrash();
        if (index < 0 || index >= trash.length) return false;
        const entry = trash[index];
        switch (entry.type) {
            case 'order': this.saveOrder(entry.item); break;
            case 'invoice': this.saveInvoice(entry.item); break;
            case 'reconciliation': this.saveReconciliation(entry.item); break;
            case 'payment': this.savePayment(entry.item); break;
            case 'client': this.saveClient(entry.item); break;
            case 'product': this.saveProduct(entry.item); break;
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
    static clearTrash() { localStorage.setItem('pp_trash', '[]'); }
}