/**
 * Payment Gateway Demo JavaScript Module
 * 
 * Handles payment provider management, transaction processing, and subscription billing
 * for the Interviews.tv payment gateway integration demo interface.
 */

class PaymentGatewayDemo {
    constructor() {
        this.apiBase = '/api/payment';
        this.providers = [];
        this.connections = [];
        this.paymentMethods = [];
        this.transactions = [];
        this.subscriptionPlans = [];
        this.analytics = {};
        this.charts = {};
        
        this.init();
    }

    async init() {
        console.log('Initializing Payment Gateway Demo...');
        
        // Load initial data
        await this.loadDemoData();
        await this.loadProviders();
        await this.loadConnections();
        await this.loadPaymentMethods();
        await this.loadTransactions();
        await this.loadSubscriptionPlans();
        await this.loadAnalytics();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('Payment Gateway Demo initialized successfully');
    }

    setupEventListeners() {
        // Provider search and filters
        document.getElementById('providerSearch')?.addEventListener('input', (e) => {
            this.filterProviders();
        });
        
        document.getElementById('providerTypeFilter')?.addEventListener('change', (e) => {
            this.filterProviders();
        });
        
        document.getElementById('currencyFilter')?.addEventListener('change', (e) => {
            this.filterProviders();
        });

        // Tab change events
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const targetTab = e.target.getAttribute('data-bs-target');
                this.handleTabChange(targetTab);
            });
        });
    }

    async handleTabChange(targetTab) {
        switch(targetTab) {
            case '#providers':
                await this.loadProviders();
                break;
            case '#connections':
                await this.loadConnections();
                break;
            case '#methods':
                await this.loadPaymentMethods();
                break;
            case '#transactions':
                await this.loadTransactions();
                break;
            case '#subscriptions':
                await this.loadSubscriptionPlans();
                break;
            case '#analytics':
                await this.loadAnalytics();
                break;
        }
    }

    // ==================== DATA LOADING ====================

    async loadDemoData() {
        try {
            const response = await fetch(`${this.apiBase}/demo-data`);
            const result = await response.json();
            
            if (result.success) {
                this.demoData = result.data;
                console.log('Demo data loaded:', this.demoData);
            }
        } catch (error) {
            console.error('Error loading demo data:', error);
            this.showNotification('Failed to load demo data', 'error');
        }
    }

    async loadProviders() {
        try {
            this.showLoading('providersGrid');
            
            const response = await fetch(`${this.apiBase}/providers`);
            const result = await response.json();
            
            if (result.success) {
                this.providers = result.data;
                this.renderProviders();
            } else {
                this.showError('providersGrid', result.message);
            }
        } catch (error) {
            console.error('Error loading providers:', error);
            this.showError('providersGrid', 'Failed to load payment providers');
        }
    }

    async loadConnections() {
        try {
            this.showLoading('connectionsContainer');
            
            const response = await fetch(`${this.apiBase}/connections`);
            const result = await response.json();
            
            if (result.success) {
                this.connections = result.data;
                this.renderConnections();
            } else {
                // Use demo data if API fails
                this.connections = this.demoData?.connections || [];
                this.renderConnections();
            }
        } catch (error) {
            console.error('Error loading connections:', error);
            this.connections = this.demoData?.connections || [];
            this.renderConnections();
        }
    }

    async loadPaymentMethods() {
        try {
            this.showLoading('paymentMethodsContainer');
            
            const response = await fetch(`${this.apiBase}/methods`);
            const result = await response.json();
            
            if (result.success) {
                this.paymentMethods = result.data;
                this.renderPaymentMethods();
            } else {
                // Use demo data if API fails
                this.paymentMethods = this.demoData?.payment_methods || [];
                this.renderPaymentMethods();
            }
        } catch (error) {
            console.error('Error loading payment methods:', error);
            this.paymentMethods = this.demoData?.payment_methods || [];
            this.renderPaymentMethods();
        }
    }

    async loadTransactions() {
        try {
            this.showLoading('transactionsContainer');
            
            const response = await fetch(`${this.apiBase}/transactions`);
            const result = await response.json();
            
            if (result.success) {
                this.transactions = result.data;
                this.renderTransactions();
            } else {
                // Use demo data if API fails
                this.transactions = this.demoData?.transactions || [];
                this.renderTransactions();
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.transactions = this.demoData?.transactions || [];
            this.renderTransactions();
        }
    }

    async loadSubscriptionPlans() {
        try {
            this.showLoading('subscriptionPlansContainer');
            
            // Use demo data for subscription plans
            this.subscriptionPlans = this.demoData?.subscription_plans || [];
            this.renderSubscriptionPlans();
        } catch (error) {
            console.error('Error loading subscription plans:', error);
            this.showError('subscriptionPlansContainer', 'Failed to load subscription plans');
        }
    }

    async loadAnalytics() {
        try {
            const dateRange = document.getElementById('analyticsDateRange')?.value || '30';
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - (parseInt(dateRange) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
            
            const response = await fetch(`${this.apiBase}/analytics?start_date=${startDate}&end_date=${endDate}`);
            const result = await response.json();
            
            if (result.success) {
                this.analytics = result.data;
                this.renderAnalytics();
            } else {
                // Use demo data if API fails
                this.analytics = this.demoData?.analytics || {};
                this.renderAnalytics();
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.analytics = this.demoData?.analytics || {};
            this.renderAnalytics();
        }
    }

    // ==================== RENDERING METHODS ====================

    renderProviders() {
        const container = document.getElementById('providersGrid');
        if (!container) return;

        if (!this.providers || this.providers.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-dark text-center">
                        <i class="fas fa-info-circle me-2"></i>
                        No payment providers available
                    </div>
                </div>
            `;
            return;
        }

        const providersHtml = this.providers.map(provider => `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card provider-card h-100" onclick="paymentDemo.showProviderDetails('${provider.provider_id}')">
                    <div class="card-body text-center">
                        <img src="${provider.logo_url}" alt="${provider.provider_name}" class="provider-logo mb-3">
                        <h5 class="card-title">${provider.provider_name}</h5>
                        <p class="card-text text-muted small">${provider.description}</p>
                        <div class="mb-2">
                            <span class="badge bg-secondary">${this.formatProviderType(provider.provider_type)}</span>
                        </div>
                        <div class="d-flex justify-content-between text-small">
                            <span class="text-muted">Fee: ${provider.transaction_fee_percentage}%</span>
                            <span class="text-muted">+$${provider.transaction_fee_fixed}</span>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <button class="btn btn-outline-primary btn-sm w-100" onclick="event.stopPropagation(); paymentDemo.connectProvider('${provider.provider_id}')">
                            <i class="fas fa-plug me-1"></i>Connect
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = providersHtml;
    }

    renderConnections() {
        const container = document.getElementById('connectionsContainer');
        if (!container) return;

        if (!this.connections || this.connections.length === 0) {
            container.innerHTML = `
                <div class="alert alert-dark text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    No payment connections configured. Connect a payment provider to get started.
                </div>
            `;
            return;
        }

        const connectionsHtml = this.connections.map(connection => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <div class="d-flex align-items-center">
                                <span class="connection-status status-${connection.connection_status}"></span>
                                <div>
                                    <h5 class="mb-1">${connection.connection_name || connection.provider_name}</h5>
                                    <p class="text-muted mb-1">${connection.provider_name} • ${connection.environment}</p>
                                    <small class="text-muted">Connected: ${this.formatDate(connection.connected_at)}</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="btn-group">
                                <button class="btn btn-outline-primary btn-sm" onclick="paymentDemo.configureConnection('${connection.connection_id}')">
                                    <i class="fas fa-cog me-1"></i>Configure
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="paymentDemo.disconnectProvider('${connection.connection_id}')">
                                    <i class="fas fa-unlink me-1"></i>Disconnect
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = connectionsHtml;
    }

    renderPaymentMethods() {
        const container = document.getElementById('paymentMethodsContainer');
        if (!container) return;

        if (!this.paymentMethods || this.paymentMethods.length === 0) {
            container.innerHTML = `
                <div class="alert alert-dark text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    No payment methods configured. Add a payment method to process transactions.
                </div>
            `;
            return;
        }

        const methodsHtml = this.paymentMethods.map(method => `
            <div class="payment-method-card">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-${this.getMethodIcon(method.method_type)} fa-2x me-3 text-primary"></i>
                            <div>
                                <h6 class="mb-1">${this.formatMethodType(method.method_type)}</h6>
                                <p class="text-muted mb-1">${this.formatMethodData(method.method_data)}</p>
                                <small class="text-muted">
                                    ${method.provider_name} •
                                    ${method.is_verified ? '<span class="text-success">Verified</span>' : '<span class="text-warning">Unverified</span>'}
                                    ${method.is_default ? ' • <span class="text-primary">Default</span>' : ''}
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="btn-group">
                            <button class="btn btn-outline-primary btn-sm" onclick="paymentDemo.editPaymentMethod('${method.method_id}')">
                                <i class="fas fa-edit me-1"></i>Edit
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="paymentDemo.deletePaymentMethod('${method.method_id}')">
                                <i class="fas fa-trash me-1"></i>Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = methodsHtml;
    }

    renderTransactions() {
        const container = document.getElementById('transactionsContainer');
        if (!container) return;

        if (!this.transactions || this.transactions.length === 0) {
            container.innerHTML = `
                <div class="alert alert-dark text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    No transactions found. Process a payment to see transaction history.
                </div>
            `;
            return;
        }

        const transactionsHtml = `
            <div class="table-responsive">
                <table class="table table-dark table-hover">
                    <thead>
                        <tr>
                            <th>Transaction ID</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Provider</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.transactions.map(transaction => `
                            <tr>
                                <td>
                                    <code class="text-light">${transaction.transaction_id}</code>
                                </td>
                                <td>
                                    <span class="badge bg-secondary">${this.formatTransactionType(transaction.transaction_type)}</span>
                                </td>
                                <td>
                                    <span class="transaction-amount">${transaction.currency} ${transaction.amount}</span>
                                    ${transaction.fee_amount > 0 ? `<br><small class="text-muted">Fee: ${transaction.currency} ${transaction.fee_amount}</small>` : ''}
                                </td>
                                <td>
                                    <span class="badge bg-${this.getStatusColor(transaction.transaction_status)}">${this.formatStatus(transaction.transaction_status)}</span>
                                </td>
                                <td>${transaction.provider_name || 'Unknown'}</td>
                                <td>
                                    ${this.formatDate(transaction.created_at)}
                                    ${transaction.payment_source ? `<br><small class="text-muted">${transaction.payment_source}</small>` : ''}
                                </td>
                                <td>
                                    <button class="btn btn-outline-primary btn-sm" onclick="paymentDemo.viewTransactionDetails('${transaction.transaction_id}')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = transactionsHtml;
    }

    renderSubscriptionPlans() {
        const container = document.getElementById('subscriptionPlansContainer');
        if (!container) return;

        if (!this.subscriptionPlans || this.subscriptionPlans.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-dark text-center">
                        <i class="fas fa-info-circle me-2"></i>
                        No subscription plans available. Create a plan to start accepting recurring payments.
                    </div>
                </div>
            `;
            return;
        }

        const plansHtml = this.subscriptionPlans.map((plan, index) => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="subscription-plan ${index === 1 ? 'featured' : ''}">
                    <h5 class="mb-3">${plan.plan_name}</h5>
                    <div class="mb-3">
                        <span class="plan-currency">$</span>
                        <span class="plan-price">${plan.amount}</span>
                        <div class="plan-interval">per ${plan.billing_interval}</div>
                    </div>
                    <p class="text-muted mb-4">${plan.plan_description}</p>
                    ${plan.trial_period_days > 0 ? `<p class="text-success mb-3"><i class="fas fa-gift me-1"></i>${plan.trial_period_days} days free trial</p>` : ''}
                    <button class="btn btn-primary w-100" onclick="paymentDemo.subscribeToPlan('${plan.plan_id}')">
                        <i class="fas fa-credit-card me-1"></i>Subscribe Now
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = plansHtml;
    }

    renderAnalytics() {
        const summary = this.analytics.summary || {};

        // Update metric cards
        document.getElementById('totalTransactions').textContent = summary.total_transactions || 0;
        document.getElementById('totalVolume').textContent = `$${(summary.total_volume || 0).toLocaleString()}`;
        document.getElementById('conversionRate').textContent = `${(summary.avg_conversion_rate || 0).toFixed(1)}%`;
        document.getElementById('netRevenue').textContent = `$${(summary.net_volume || 0).toLocaleString()}`;

        // Render charts
        this.renderCharts();
    }

    renderCharts() {
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart');
        if (revenueCtx && this.analytics.monthly_revenue) {
            if (this.charts.revenue) {
                this.charts.revenue.destroy();
            }

            this.charts.revenue = new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: this.analytics.monthly_revenue.map(item => item.month),
                    datasets: [{
                        label: 'Revenue',
                        data: this.analytics.monthly_revenue.map(item => item.revenue),
                        borderColor: '#FF0000',
                        backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#f8f9fa'
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: '#f8f9fa'
                            },
                            grid: {
                                color: '#404040'
                            }
                        },
                        y: {
                            ticks: {
                                color: '#f8f9fa',
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            },
                            grid: {
                                color: '#404040'
                            }
                        }
                    }
                }
            });
        }

        // Status Chart
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx && this.analytics.summary) {
            if (this.charts.status) {
                this.charts.status.destroy();
            }

            const summary = this.analytics.summary;
            this.charts.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Successful', 'Failed'],
                    datasets: [{
                        data: [summary.successful_transactions || 0, summary.failed_transactions || 0],
                        backgroundColor: ['#28a745', '#dc3545'],
                        borderColor: ['#28a745', '#dc3545'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#f8f9fa'
                            }
                        }
                    }
                }
            });
        }
    }

    // ==================== ACTION METHODS ====================

    async showProviderDetails(providerId) {
        const provider = this.providers.find(p => p.provider_id === providerId);
        if (!provider) return;

        const modal = this.createModal('Provider Details', `
            <div class="row">
                <div class="col-md-4 text-center">
                    <img src="${provider.logo_url}" alt="${provider.provider_name}" class="provider-logo mb-3">
                    <h5>${provider.provider_name}</h5>
                    <span class="badge bg-secondary">${this.formatProviderType(provider.provider_type)}</span>
                </div>
                <div class="col-md-8">
                    <p class="text-muted">${provider.description}</p>
                    <div class="row mb-3">
                        <div class="col-6">
                            <strong>Transaction Fee:</strong><br>
                            ${provider.transaction_fee_percentage}% + $${provider.transaction_fee_fixed}
                        </div>
                        <div class="col-6">
                            <strong>Settlement Time:</strong><br>
                            ${provider.settlement_time_hours} hours
                        </div>
                    </div>
                    <div class="mb-3">
                        <strong>Supported Features:</strong><br>
                        ${provider.features.map(feature => `<span class="badge bg-primary me-1">${feature}</span>`).join('')}
                    </div>
                    <div class="mb-3">
                        <strong>Supported Currencies:</strong><br>
                        <small class="text-muted">${provider.supported_currencies.slice(0, 10).join(', ')}${provider.supported_currencies.length > 10 ? '...' : ''}</small>
                    </div>
                </div>
            </div>
        `, [
            {
                text: 'Connect Provider',
                class: 'btn-primary',
                action: () => this.connectProvider(providerId)
            },
            {
                text: 'Close',
                class: 'btn-secondary',
                action: 'close'
            }
        ]);

        modal.show();
    }

    async connectProvider(providerId) {
        try {
            const connectionData = {
                connection_name: `${providerId} Connection`,
                environment: 'sandbox',
                credentials: {
                    api_key: 'demo_api_key_' + Math.random().toString(36).substr(2, 9),
                    secret_key: 'demo_secret_' + Math.random().toString(36).substr(2, 9)
                },
                default_currency: 'USD'
            };

            const response = await fetch(`${this.apiBase}/connections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    provider_id: providerId,
                    connection_data: connectionData
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(`Successfully connected to ${providerId}`, 'success');
                await this.loadConnections();

                // Switch to connections tab
                const connectionsTab = document.querySelector('[data-bs-target="#connections"]');
                if (connectionsTab) {
                    new bootstrap.Tab(connectionsTab).show();
                }
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error connecting provider:', error);
            this.showNotification('Failed to connect provider', 'error');
        }
    }

    async disconnectProvider(connectionId) {
        if (!confirm('Are you sure you want to disconnect this payment provider?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/connections/delete?connection_id=${connectionId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Provider disconnected successfully', 'success');
                await this.loadConnections();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error disconnecting provider:', error);
            this.showNotification('Failed to disconnect provider', 'error');
        }
    }

    async processPayment(paymentData) {
        try {
            const response = await fetch(`${this.apiBase}/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Payment processed successfully', 'success');
                await this.loadTransactions();
                return result.data;
            } else {
                this.showNotification(result.message, 'error');
                return null;
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            this.showNotification('Failed to process payment', 'error');
            return null;
        }
    }

    // ==================== MODAL METHODS ====================

    showProcessPaymentModal() {
        const modal = this.createModal('Process Payment', `
            <form id="processPaymentForm">
                <div class="mb-3">
                    <label class="form-label">Connection</label>
                    <select class="form-select" id="paymentConnection" required>
                        <option value="">Select payment connection...</option>
                        ${this.connections.map(conn => `
                            <option value="${conn.connection_id}">${conn.connection_name} (${conn.provider_name})</option>
                        `).join('')}
                    </select>
                </div>
                <div class="row">
                    <div class="col-md-8">
                        <label class="form-label">Amount</label>
                        <input type="number" class="form-control" id="paymentAmount" step="0.01" min="0.01" required>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Currency</label>
                        <select class="form-select" id="paymentCurrency">
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                        </select>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Description</label>
                    <input type="text" class="form-control" id="paymentDescription" placeholder="Payment description...">
                </div>
                <div class="mb-3">
                    <label class="form-label">Payment Source</label>
                    <select class="form-select" id="paymentSource">
                        <option value="interview">Interview Session</option>
                        <option value="subscription">Subscription</option>
                        <option value="marketplace">Marketplace</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </form>
        `, [
            {
                text: 'Process Payment',
                class: 'btn-success',
                action: async () => {
                    const form = document.getElementById('processPaymentForm');
                    if (form.checkValidity()) {
                        const paymentData = {
                            connection_id: document.getElementById('paymentConnection').value,
                            amount: parseFloat(document.getElementById('paymentAmount').value),
                            currency: document.getElementById('paymentCurrency').value,
                            description: document.getElementById('paymentDescription').value,
                            payment_source: document.getElementById('paymentSource').value
                        };

                        const result = await this.processPayment(paymentData);
                        if (result) {
                            return 'close';
                        }
                    } else {
                        form.reportValidity();
                    }
                }
            },
            {
                text: 'Cancel',
                class: 'btn-secondary',
                action: 'close'
            }
        ]);

        modal.show();
    }

    // ==================== UTILITY METHODS ====================

    filterProviders() {
        const search = document.getElementById('providerSearch')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('providerTypeFilter')?.value || '';
        const currencyFilter = document.getElementById('currencyFilter')?.value || '';

        let filteredProviders = this.providers;

        if (search) {
            filteredProviders = filteredProviders.filter(provider =>
                provider.provider_name.toLowerCase().includes(search) ||
                provider.description.toLowerCase().includes(search)
            );
        }

        if (typeFilter) {
            filteredProviders = filteredProviders.filter(provider =>
                provider.provider_type === typeFilter
            );
        }

        if (currencyFilter) {
            filteredProviders = filteredProviders.filter(provider =>
                provider.supported_currencies.includes(currencyFilter)
            );
        }

        // Temporarily update providers for rendering
        const originalProviders = this.providers;
        this.providers = filteredProviders;
        this.renderProviders();
        this.providers = originalProviders;
    }

    formatProviderType(type) {
        const types = {
            'credit_card': 'Credit Card',
            'digital_wallet': 'Digital Wallet',
            'bank_transfer': 'Bank Transfer',
            'cryptocurrency': 'Cryptocurrency',
            'buy_now_pay_later': 'Buy Now Pay Later'
        };
        return types[type] || type;
    }

    formatMethodType(type) {
        const types = {
            'card': 'Credit/Debit Card',
            'bank_account': 'Bank Account',
            'digital_wallet': 'Digital Wallet',
            'crypto_wallet': 'Crypto Wallet',
            'bnpl': 'Buy Now Pay Later'
        };
        return types[type] || type;
    }

    formatMethodData(data) {
        if (data.brand && data.last4) {
            return `${data.brand.toUpperCase()} ending in ${data.last4}`;
        }
        if (data.account_number) {
            return `Account ending in ${data.account_number.slice(-4)}`;
        }
        return 'Payment method';
    }

    getMethodIcon(type) {
        const icons = {
            'card': 'credit-card',
            'bank_account': 'university',
            'digital_wallet': 'wallet',
            'crypto_wallet': 'bitcoin',
            'bnpl': 'calendar-check'
        };
        return icons[type] || 'credit-card';
    }

    formatTransactionType(type) {
        const types = {
            'payment': 'Payment',
            'refund': 'Refund',
            'chargeback': 'Chargeback',
            'fee': 'Fee',
            'payout': 'Payout'
        };
        return types[type] || type;
    }

    formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    getStatusColor(status) {
        const colors = {
            'succeeded': 'success',
            'failed': 'danger',
            'pending': 'warning',
            'processing': 'info',
            'cancelled': 'secondary',
            'refunded': 'warning',
            'disputed': 'danger'
        };
        return colors[status] || 'secondary';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ==================== UI HELPER METHODS ====================

    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="text-muted mt-2">Loading...</p>
                </div>
            `;
        }
    }

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger text-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${message}
                </div>
            `;
        }
    }

    showNotification(message, type = 'info') {
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const icon = {
            'success': 'check-circle',
            'error': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        }[type] || 'info-circle';

        const notification = document.createElement('div');
        notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            <i class="fas fa-${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    createModal(title, content, buttons = []) {
        const modalId = 'modal_' + Math.random().toString(36).substr(2, 9);

        const buttonsHtml = buttons.map((button, index) => `
            <button type="button" class="btn ${button.class}" data-modal-action="${index}">
                ${button.text}
            </button>
        `).join('');

        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-dark">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                        <div class="modal-footer border-secondary">
                            ${buttonsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        const modalContainer = document.getElementById('modalsContainer') || document.body;
        modalContainer.insertAdjacentHTML('beforeend', modalHtml);

        const modalElement = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalElement);

        // Handle button clicks
        modalElement.addEventListener('click', async (e) => {
            if (e.target.hasAttribute('data-modal-action')) {
                const actionIndex = parseInt(e.target.getAttribute('data-modal-action'));
                const button = buttons[actionIndex];

                if (button && button.action) {
                    if (typeof button.action === 'function') {
                        const result = await button.action();
                        if (result === 'close') {
                            modal.hide();
                        }
                    } else if (button.action === 'close') {
                        modal.hide();
                    }
                }
            }
        });

        // Clean up modal when hidden
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        });

        return modal;
    }
}

// Global functions for HTML onclick handlers
window.paymentDemo = null;

// Global utility functions
function refreshAllData() {
    if (window.paymentDemo) {
        window.paymentDemo.loadProviders();
        window.paymentDemo.loadConnections();
        window.paymentDemo.loadPaymentMethods();
        window.paymentDemo.loadTransactions();
        window.paymentDemo.loadAnalytics();
    }
}

function filterTransactions(status) {
    if (window.paymentDemo) {
        // Filter transactions by status
        const originalTransactions = window.paymentDemo.transactions;
        if (status === 'all') {
            window.paymentDemo.renderTransactions();
        } else {
            const filteredTransactions = originalTransactions.filter(t => t.transaction_status === status);
            const temp = window.paymentDemo.transactions;
            window.paymentDemo.transactions = filteredTransactions;
            window.paymentDemo.renderTransactions();
            window.paymentDemo.transactions = temp;
        }
    }
}

function showConnectProviderModal() {
    if (window.paymentDemo) {
        window.paymentDemo.showConnectProviderModal();
    }
}

function showAddPaymentMethodModal() {
    if (window.paymentDemo) {
        window.paymentDemo.showAddPaymentMethodModal();
    }
}

function showProcessPaymentModal() {
    if (window.paymentDemo) {
        window.paymentDemo.showProcessPaymentModal();
    }
}

function showCreatePlanModal() {
    if (window.paymentDemo) {
        window.paymentDemo.showCreatePlanModal();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.paymentDemo = new PaymentGatewayDemo();
});
