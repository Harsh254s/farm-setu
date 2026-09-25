// =============================================================================
// FarmSetu - From Farm to You (Application Logic)
// Role-Based Access Control & Clean Web App Authentication
// =============================================================================

(function () {
  'use strict';

  // Application State
  const STATE = {
    users: [],
    currentUser: null,
    crops: [],
    orders: [],
    currentView: 'auth',
    authRole: 'farmer', // 'farmer', 'consumer', 'transporter'
    authTab: 'login', // 'login' or 'signup'
    isOffline: false,
    offlineQueue: [],
    selectedCropForOrder: null,
    searchQuery: '',
    demandFilter: 'all'
  };

  // ---------------------------------------------------------------------------
  // Initialize State & Storage
  // ---------------------------------------------------------------------------
  function init() {
    try {
      const savedUsers = localStorage.getItem('farmsetu_users');
      STATE.users = savedUsers ? JSON.parse(savedUsers) : [...INITIAL_USERS];

      const savedCurrentUser = localStorage.getItem('farmsetu_current_user');
      STATE.currentUser = savedCurrentUser ? JSON.parse(savedCurrentUser) : null;

      const savedCrops = localStorage.getItem('farmsetu_crops');
      STATE.crops = savedCrops ? JSON.parse(savedCrops) : [...INITIAL_CROPS];

      const savedOrders = localStorage.getItem('farmsetu_orders');
      STATE.orders = savedOrders ? JSON.parse(savedOrders) : [...INITIAL_ORDERS];

      const savedQueue = localStorage.getItem('farmsetu_offline_queue');
      STATE.offlineQueue = savedQueue ? JSON.parse(savedQueue) : [];
    } catch (e) {
      console.warn("Storage fallback", e);
      STATE.users = [...INITIAL_USERS];
      STATE.currentUser = null;
      STATE.crops = [...INITIAL_CROPS];
      STATE.orders = [...INITIAL_ORDERS];
    }

    // Default harvest date in form to today
    const harvestInput = document.getElementById('add-crop-harvest-date');
    if (harvestInput) {
      harvestInput.value = new Date().toISOString().split('T')[0];
    }

    setupEventListeners();
    updateUserSessionUI();

    // Default Homepage is Login page if not signed in!
    if (!STATE.currentUser) {
      switchView('auth');
    } else {
      // Navigate to role-permitted homepage
      if (STATE.currentUser.role === 'farmer') switchView('farmer');
      else if (STATE.currentUser.role === 'transporter') switchView('transporter');
      else switchView('marketplace');
    }

    renderMarketplace();
    renderFarmerHub();
    renderConsumerHub();
    renderTransporterHub();
    renderInsights();

    // Trigger initial AI suggestion for Tomato
    evaluateAiPrice("Tomato");
  }

  function persist() {
    try {
      localStorage.setItem('farmsetu_users', JSON.stringify(STATE.users));
      if (STATE.currentUser) {
        localStorage.setItem('farmsetu_current_user', JSON.stringify(STATE.currentUser));
      } else {
        localStorage.removeItem('farmsetu_current_user');
      }
      localStorage.setItem('farmsetu_crops', JSON.stringify(STATE.crops));
      localStorage.setItem('farmsetu_orders', JSON.stringify(STATE.orders));
      localStorage.setItem('farmsetu_offline_queue', JSON.stringify(STATE.offlineQueue));
    } catch (e) {
      console.warn("Failed to persist", e);
    }
  }

  // ---------------------------------------------------------------------------
  // View Router with Strict Role-Based Access Control (RBAC)
  // ---------------------------------------------------------------------------
  function switchView(viewId) {
    // 1. If not logged in, enforce that only 'auth' (Login Page) is accessible
    if (!STATE.currentUser && viewId !== 'auth') {
      viewId = 'auth';
      showToast("Please sign in to access FarmSetu.");
    }

    // 2. Strict Role Permissions Check when logged in
    if (STATE.currentUser && viewId !== 'auth') {
      const role = STATE.currentUser.role;

      // Farmer only views
      if (viewId === 'farmer' || viewId === 'add-crop') {
        if (role !== 'farmer') {
          showToast(`Access Denied: Only farmers can access this section. You are signed in as a ${role}.`);
          return;
        }
      }

      // Consumer only views
      if (viewId === 'consumer') {
        if (role !== 'consumer') {
          showToast(`Access Denied: Only consumers can access My Orders. You are signed in as a ${role}.`);
          return;
        }
      }

      // Transport worker only views
      if (viewId === 'transporter') {
        if (role !== 'transporter') {
          showToast(`Access Denied: Only transport workers can access Delivery Trips. You are signed in as a ${role}.`);
          return;
        }
      }
    }

    STATE.currentView = viewId;

    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
    });

    // Toggle active view section
    document.querySelectorAll('.view-section').forEach(section => {
      section.classList.toggle('active', section.id === `view-${viewId}`);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh dynamic content on view switch
    if (viewId === 'marketplace') renderMarketplace();
    if (viewId === 'farmer') renderFarmerHub();
    if (viewId === 'consumer') renderConsumerHub();
    if (viewId === 'transporter') renderTransporterHub();
    if (viewId === 'insights') renderInsights();
  }

  // ---------------------------------------------------------------------------
  // User Session & Role Header Controls
  // ---------------------------------------------------------------------------
  function updateUserSessionUI() {
    const navLinks = document.getElementById('main-nav-links');
    const badge = document.getElementById('current-user-badge');
    const logoutBtn = document.getElementById('btn-logout');
    const farmerNameEl = document.getElementById('farmer-name-display');
    const consumerNameEl = document.getElementById('consumer-name-display');
    const transporterNameEl = document.getElementById('transporter-name-display');
    const btnMarketAdd = document.getElementById('btn-market-add-crop');

    // Not logged in: Hide portal navigation and user badge completely
    if (!STATE.currentUser) {
      if (navLinks) navLinks.style.display = 'none';
      if (badge) badge.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (btnMarketAdd) btnMarketAdd.style.display = 'none';
      return;
    }

    // Logged in: Display permitted header controls
    if (navLinks) navLinks.style.display = 'flex';
    if (badge) badge.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';

    const u = STATE.currentUser;
    let icon = '🧑🌾';
    let roleName = 'Farmer';
    let roleClass = 'role-tag-farmer';

    if (u.role === 'consumer') {
      icon = '🛒';
      roleName = 'Consumer';
      roleClass = 'role-tag-consumer';
    } else if (u.role === 'transporter') {
      icon = '🚚';
      roleName = 'Transport Worker';
      roleClass = 'role-tag-transporter';
    }

    if (badge) {
      badge.innerHTML = `<span class="${roleClass}">${icon} ${u.name} (${roleName})</span>`;
    }

    if (farmerNameEl && u.role === 'farmer') farmerNameEl.textContent = u.name;
    if (consumerNameEl && u.role === 'consumer') consumerNameEl.textContent = u.name;
    if (transporterNameEl && u.role === 'transporter') transporterNameEl.textContent = u.name;

    // Show/hide relevant nav items based on user role strictly
    const navAddCrop = document.getElementById('nav-add-crop');
    const navFarmerHub = document.getElementById('nav-farmer-hub');
    const navConsumerHub = document.getElementById('nav-consumer-hub');
    const navTransporterHub = document.getElementById('nav-transporter-hub');

    if (navAddCrop) navAddCrop.style.display = 'none';
    if (navFarmerHub) navFarmerHub.style.display = 'none';
    if (navConsumerHub) navConsumerHub.style.display = 'none';
    if (navTransporterHub) navTransporterHub.style.display = 'none';

    // Strict role navigation
    if (u.role === 'farmer') {
      if (navFarmerHub) navFarmerHub.style.display = 'inline-flex';
      if (navAddCrop) navAddCrop.style.display = 'inline-flex';
      if (btnMarketAdd) btnMarketAdd.style.display = 'inline-flex';
    } else if (u.role === 'consumer') {
      if (navConsumerHub) navConsumerHub.style.display = 'inline-flex';
      if (btnMarketAdd) btnMarketAdd.style.display = 'none';
    } else if (u.role === 'transporter') {
      if (navTransporterHub) navTransporterHub.style.display = 'inline-flex';
      if (btnMarketAdd) btnMarketAdd.style.display = 'none';
    }
  }

  function setAuthRole(role) {
    STATE.authRole = role;

    // Update segmented control active button
    document.querySelectorAll('.role-seg-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-role') === role);
    });

    // Update login button label
    const roleLabels = { farmer: 'Farmer', consumer: 'Consumer', transporter: 'Transport Worker' };
    const labelEl = document.getElementById('login-role-label');
    if (labelEl) labelEl.textContent = roleLabels[role] || 'User';

    // Update dynamic field in sign-up form
    const extraLabel = document.getElementById('signup-extra-label');
    const extraField = document.getElementById('signup-extra-field');
    if (extraLabel && extraField) {
      if (role === 'farmer') {
        extraLabel.textContent = "Farm / Mandi Location";
        extraField.placeholder = "e.g. Kolar, Karnataka";
      } else if (role === 'consumer') {
        extraLabel.textContent = "Delivery Address";
        extraField.placeholder = "e.g. Indiranagar, Bengaluru";
      } else if (role === 'transporter') {
        extraLabel.textContent = "Vehicle Type & Capacity";
        extraField.placeholder = "e.g. Mini Truck / Bolero Maxi Truck";
      }
    }
  }

  function setAuthTab(tab) {
    STATE.authTab = tab;
    const loginBtn = document.getElementById('tab-login-btn');
    const signupBtn = document.getElementById('tab-signup-btn');
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');

    if (tab === 'login') {
      loginBtn.classList.add('active');
      signupBtn.classList.remove('active');
      formLogin.style.display = 'block';
      formSignup.style.display = 'none';
    } else {
      signupBtn.classList.add('active');
      loginBtn.classList.remove('active');
      formSignup.style.display = 'block';
      formLogin.style.display = 'none';
    }
  }

  function loginUser(user) {
    STATE.currentUser = user;
    persist();
    updateUserSessionUI();
    showToast(`Signed in as ${user.name} (${user.role.toUpperCase()})`);

    // Route to user's permitted dashboard
    if (user.role === 'farmer') switchView('farmer');
    else if (user.role === 'transporter') switchView('transporter');
    else switchView('marketplace');
  }

  function logoutUser() {
    STATE.currentUser = null;
    localStorage.removeItem('farmsetu_current_user');
    updateUserSessionUI();
    switchView('auth');
    showToast("Signed out successfully.");
  }

  function notifyRoleRestriction(role) {
    if (!STATE.currentUser) {
      showToast("Please sign in to place an order.");
      switchView('auth');
      return;
    }
    if (role === 'farmer') {
      showToast("Notice: You are signed in as a Farmer. Only Consumers can place produce orders.");
    } else if (role === 'transporter') {
      showToast("Notice: You are signed in as a Transport Worker. Only Consumers can place produce orders.");
    }
  }

  // ---------------------------------------------------------------------------
  // AI Pricing & Demand Logic
  // ---------------------------------------------------------------------------
  function evaluateAiPrice(cropName) {
    const raw = (cropName || "").toLowerCase().trim();
    let rule = AI_RULES[raw];

    if (!rule) {
      for (const k in AI_RULES) {
        if (raw.includes(k) || k.includes(raw)) {
          rule = AI_RULES[k];
          break;
        }
      }
    }

    if (!rule) {
      rule = {
        crop: cropName,
        demand: "Low",
        baseMandiPrice: 15,
        suggestedPrice: 18,
        reason: "Low Demand: Stable pricing recommended."
      };
    }

    const textEl = document.getElementById('ai-suggested-text');
    const noteEl = document.getElementById('ai-logic-note');
    const applyBtn = document.getElementById('btn-apply-ai-price');

    if (textEl) {
      textEl.textContent = `Recommended Price: ₹${rule.suggestedPrice}/kg (based on ${rule.demand} Demand)`;
    }
    if (noteEl) {
      noteEl.textContent = rule.reason;
    }
    if (applyBtn) {
      applyBtn.dataset.price = rule.suggestedPrice;
    }

    return rule;
  }

  // ---------------------------------------------------------------------------
  // Marketplace Render (From Farm to You)
  // ---------------------------------------------------------------------------
  function renderMarketplace() {
    const container = document.getElementById('crops-grid-container');
    if (!container) return;

    let list = [...STATE.crops];

    // Filter by search query
    if (STATE.searchQuery.trim() !== '') {
      const q = STATE.searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q));
    }

    // Filter by demand
    if (STATE.demandFilter !== 'all') {
      list = list.filter(c => c.demandLevel === STATE.demandFilter);
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; background:#fff; border:1px solid var(--gray-200); border-radius:var(--border-radius);">
          <p style="color:var(--gray-600); font-weight:600;">No crops match your filter.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(c => {
      const demandClass = c.demandLevel === 'High' ? 'demand-high' : (c.demandLevel === 'Medium' ? 'demand-medium' : 'demand-low');
      const icon = c.demandLevel === 'High' ? '📈' : (c.demandLevel === 'Medium' ? '⚡' : '📉');

      let actionBtn = '';
      if (!STATE.currentUser) {
        actionBtn = `<button class="btn btn-primary btn-sm" onclick="window.farmSetu.switchView('auth')">Sign in to Order</button>`;
      } else if (STATE.currentUser.role === 'consumer') {
        actionBtn = `<button class="btn btn-primary btn-sm" onclick="window.farmSetu.openOrderModal('${c.id}')">🛒 Order Produce</button>`;
      } else if (STATE.currentUser.role === 'farmer') {
        actionBtn = `<button class="btn btn-secondary btn-sm" onclick="window.farmSetu.notifyRoleRestriction('farmer')">Farmer View (Stock: ${c.quantity} kg)</button>`;
      } else if (STATE.currentUser.role === 'transporter') {
        actionBtn = `<button class="btn btn-secondary btn-sm" onclick="window.farmSetu.notifyRoleRestriction('transporter')">Transporter View (${c.quantity} kg)</button>`;
      }

      return `
        <div class="crop-card">
          <div>
            <div class="crop-card-top">
              <div class="crop-card-title">${c.name}</div>
              <span class="demand-pill ${demandClass}">${icon} ${c.demandLevel} Demand</span>
            </div>
            
            <div class="crop-details-list">
              <div>📍 <strong>Location:</strong> ${c.location}</div>
              <div>🧑🌾 <strong>Farmer:</strong> ${c.farmerName}</div>
              <div>📦 <strong>Available Quantity:</strong> ${c.quantity} kg</div>
              <div>📅 <strong>Harvest Date:</strong> ${c.harvestDate}</div>
            </div>
          </div>

          <div class="crop-price-row">
            <div class="price-display">₹${c.pricePerKg} <span>/ kg</span></div>
            ${actionBtn}
          </div>
        </div>
      `;
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // Farmer Hub Render
  // ---------------------------------------------------------------------------
  function renderFarmerHub() {
    const cropsTbody = document.getElementById('farmer-crops-tbody');
    const ordersTbody = document.getElementById('farmer-orders-tbody');

    if (cropsTbody) {
      cropsTbody.innerHTML = STATE.crops.map(c => {
        const icon = c.demandLevel === 'High' ? '📈' : (c.demandLevel === 'Medium' ? '⚡' : '📉');
        return `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.quantity} kg</td>
            <td><strong>₹${c.pricePerKg} / kg</strong></td>
            <td>${c.location}</td>
            <td>${c.harvestDate}</td>
            <td><span class="demand-pill demand-${c.demandLevel.toLowerCase()}">${icon} ${c.demandLevel}</span></td>
          </tr>
        `;
      }).join('');
    }

    if (ordersTbody) {
      if (STATE.orders.length === 0) {
        ordersTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--gray-500);">No incoming orders.</td></tr>`;
      } else {
        ordersTbody.innerHTML = STATE.orders.map(o => {
          let actionBtn = '';
          if (o.status === 'Pending') {
            actionBtn = `<button class="btn btn-primary btn-sm" onclick="window.farmSetu.updateOrderStatus('${o.id}', 'Confirmed')">Accept Order</button>`;
          } else if (o.status === 'Confirmed') {
            actionBtn = `<span style="font-size:0.8rem; color:#2563eb; font-weight:600;">Ready for Transporter</span>`;
          } else if (o.status === 'In Transit') {
            actionBtn = `<span style="font-size:0.8rem; color:#6b21a8; font-weight:600;">🚚 In Transit</span>`;
          } else {
            actionBtn = `<span style="font-size:0.8rem; color:#15803d; font-weight:600;">✓ Delivered</span>`;
          }

          const statusClass = o.status.toLowerCase().replace(' ', '-');

          return `
            <tr>
              <td><strong>#${o.id}</strong></td>
              <td>${o.cropName}</td>
              <td>${o.consumerName}</td>
              <td>${o.quantity} kg</td>
              <td><strong>₹${o.totalAmount}</strong></td>
              <td>${o.deliveryAddress}</td>
              <td><span class="status-badge status-${statusClass}">${o.status}</span></td>
              <td>${actionBtn}</td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Consumer Hub Render
  // ---------------------------------------------------------------------------
  function renderConsumerHub() {
    const tbody = document.getElementById('consumer-orders-tbody');
    if (!tbody) return;

    if (STATE.orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--gray-500);">No orders placed yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = STATE.orders.map(o => {
      const statusClass = o.status.toLowerCase().replace(' ', '-');
      const transporterText = o.transporterName ? `🚚 ${o.transporterName}` : `<span style="color:var(--gray-400);">Assigning Transporter...</span>`;

      return `
        <tr>
          <td><strong>#${o.id}</strong></td>
          <td>${o.cropName}</td>
          <td>${o.farmerName} (${o.farmerLocation})</td>
          <td>${o.quantity} kg</td>
          <td><strong>₹${o.totalAmount}</strong></td>
          <td>${o.deliveryAddress}</td>
          <td>${transporterText}</td>
          <td><span class="status-badge status-${statusClass}">${o.status}</span></td>
        </tr>
      `;
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // Transport Worker Hub Render (From Farm to You)
  // ---------------------------------------------------------------------------
  function renderTransporterHub() {
    const tbody = document.getElementById('transporter-trips-tbody');
    if (!tbody) return;

    if (STATE.orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--gray-500);">No transport trips available.</td></tr>`;
      return;
    }

    tbody.innerHTML = STATE.orders.map(o => {
      let actionControl = '';
      const fee = o.deliveryFee || 100;

      if (o.status === 'Confirmed' && !o.transporterId) {
        actionControl = `<button class="btn btn-primary btn-sm" onclick="window.farmSetu.acceptTransportTrip('${o.id}')">Accept Delivery Gig</button>`;
      } else if (o.status === 'Confirmed' && o.transporterId) {
        actionControl = `<button class="btn btn-primary btn-sm" style="background-color:#7c3aed;" onclick="window.farmSetu.updateOrderStatus('${o.id}', 'In Transit')">Mark Picked Up from Farm</button>`;
      } else if (o.status === 'In Transit') {
        actionControl = `<button class="btn btn-secondary btn-sm" style="color:#15803d; border-color:#15803d;" onclick="window.farmSetu.updateOrderStatus('${o.id}', 'Delivered')">Mark Delivered to Home</button>`;
      } else if (o.status === 'Delivered') {
        actionControl = `<span style="font-size:0.8rem; color:#15803d; font-weight:700;">✓ Trip Finished (+₹${fee})</span>`;
      } else {
        actionControl = `<span style="font-size:0.8rem; color:var(--gray-400);">Waiting for farmer confirmation</span>`;
      }

      const statusClass = o.status.toLowerCase().replace(' ', '-');

      return `
        <tr>
          <td><strong>#${o.id}</strong></td>
          <td>${o.cropName} (${o.quantity} kg)</td>
          <td>📍 Farm: ${o.farmerName} (${o.farmerLocation})</td>
          <td>🏡 Home: ${o.consumerName} (${o.deliveryAddress})</td>
          <td><strong style="color:var(--primary);">₹${fee}</strong></td>
          <td><span class="status-badge status-${statusClass}">${o.status}</span></td>
          <td>${actionControl}</td>
        </tr>
      `;
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // Market Insights Render
  // ---------------------------------------------------------------------------
  function renderInsights() {
    const rulesTbody = document.getElementById('insights-rules-tbody');
    if (!rulesTbody) return;

    rulesTbody.innerHTML = Object.keys(AI_RULES).map(k => {
      const r = AI_RULES[k];
      const icon = r.demand === 'High' ? '📈' : (r.demand === 'Medium' ? '⚡' : '📉');
      return `
        <tr>
          <td><strong>${r.crop}</strong></td>
          <td><span class="demand-pill demand-${r.demand.toLowerCase()}">${icon} ${r.demand} Demand</span></td>
          <td>₹${r.baseMandiPrice} / kg</td>
          <td><strong style="color:var(--primary);">₹${r.suggestedPrice} / kg</strong></td>
          <td>${r.reason}</td>
        </tr>
      `;
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // Order Modal Handling (Strictly for Consumers)
  // ---------------------------------------------------------------------------
  function openOrderModal(cropId) {
    if (!STATE.currentUser) {
      showToast("Please sign in as a consumer to place an order.");
      switchView('auth');
      return;
    }

    if (STATE.currentUser.role !== 'consumer') {
      showToast(`Access Denied: Only consumers can place orders. You are signed in as a ${STATE.currentUser.role}.`);
      return;
    }

    const crop = STATE.crops.find(c => c.id === cropId);
    if (!crop) return;

    STATE.selectedCropForOrder = crop;

    const modal = document.getElementById('order-modal');
    document.getElementById('modal-crop-name').textContent = crop.name;
    document.getElementById('modal-farmer-info').textContent = `Farmer: ${crop.farmerName} • ${crop.location}`;
    document.getElementById('modal-crop-price').textContent = `Price: ₹${crop.pricePerKg} / kg`;
    document.getElementById('modal-crop-stock').textContent = `Available: ${crop.quantity} kg`;

    const qtyInput = document.getElementById('order-quantity');
    qtyInput.max = crop.quantity;
    qtyInput.value = Math.min(25, crop.quantity);

    // Auto-fill delivery address from consumer profile
    const addressInput = document.getElementById('order-address');
    if (STATE.currentUser && STATE.currentUser.location) {
      addressInput.value = STATE.currentUser.location;
    }

    recalcTotal();
    modal.classList.add('active');
  }

  function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    modal.classList.remove('active');
    STATE.selectedCropForOrder = null;
  }

  function recalcTotal() {
    const crop = STATE.selectedCropForOrder;
    if (!crop) return;

    const qty = parseInt(document.getElementById('order-quantity').value, 10) || 0;
    const total = qty * crop.pricePerKg;
    document.getElementById('order-total-calc').textContent = `₹${total}`;
  }

  function handleOrderSubmit(e) {
    e.preventDefault();

    if (!STATE.currentUser || STATE.currentUser.role !== 'consumer') {
      showToast("Access Denied: Only consumers can place orders.");
      return;
    }

    const crop = STATE.selectedCropForOrder;
    if (!crop) return;

    const qty = parseInt(document.getElementById('order-quantity').value, 10);
    const address = document.getElementById('order-address').value.trim();

    if (qty <= 0 || qty > crop.quantity) {
      showToast(`Quantity must be between 1 and ${crop.quantity} kg`);
      return;
    }

    const orderId = `ORD-${Math.floor(100 + Math.random() * 900)}`;

    const newOrder = {
      id: orderId,
      cropId: crop.id,
      cropName: crop.name,
      quantity: qty,
      unitPrice: crop.pricePerKg,
      totalAmount: qty * crop.pricePerKg,
      farmerId: crop.farmerId,
      farmerName: crop.farmerName,
      farmerLocation: crop.location,
      consumerId: STATE.currentUser.id,
      consumerName: STATE.currentUser.name,
      consumerPhone: STATE.currentUser.phone,
      deliveryAddress: address,
      status: "Confirmed", // Ready for transport
      transporterId: null,
      transporterName: null,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryFee: Math.round(50 + (qty * 1.5))
    };

    // Deduct available crop stock
    crop.quantity = Math.max(0, crop.quantity - qty);

    if (STATE.isOffline) {
      STATE.offlineQueue.push({ type: 'ORDER', data: newOrder });
      showToast(`Saved offline: Order #${orderId}`);
    } else {
      showToast(`Order #${orderId} placed successfully! From Farm to You.`);
    }

    STATE.orders.unshift(newOrder);
    persist();
    closeOrderModal();

    renderMarketplace();
    renderFarmerHub();
    renderConsumerHub();
    renderTransporterHub();

    switchView('consumer');
  }

  // ---------------------------------------------------------------------------
  // Add Crop Submit (Strictly for Farmers)
  // ---------------------------------------------------------------------------
  function handleAddCropSubmit(e) {
    e.preventDefault();

    if (!STATE.currentUser || STATE.currentUser.role !== 'farmer') {
      showToast("Access Denied: Only registered farmers can list crops.");
      return;
    }

    const name = document.getElementById('add-crop-name').value.trim();
    const quantity = parseInt(document.getElementById('add-crop-qty').value, 10);
    const price = parseFloat(document.getElementById('add-crop-price').value);
    const location = document.getElementById('add-crop-location').value.trim();
    const harvestDate = document.getElementById('add-crop-harvest-date').value;

    const ai = evaluateAiPrice(name);

    const newCrop = {
      id: `crop-${Date.now()}`,
      name: name,
      quantity: quantity,
      pricePerKg: price,
      location: location,
      harvestDate: harvestDate,
      farmerId: STATE.currentUser.id,
      farmerName: STATE.currentUser.name,
      farmerPhone: STATE.currentUser.phone,
      demandLevel: ai.demand
    };

    if (STATE.isOffline) {
      STATE.offlineQueue.push({ type: 'CROP', data: newCrop });
      showToast(`Saved offline: Crop ${name}`);
    } else {
      showToast(`Crop "${name}" listed for sale! Demand: ${ai.demand}`);
    }

    STATE.crops.unshift(newCrop);
    persist();

    document.getElementById('form-add-crop').reset();
    document.getElementById('add-crop-harvest-date').value = new Date().toISOString().split('T')[0];

    renderMarketplace();
    renderFarmerHub();
    switchView('farmer');
  }

  // ---------------------------------------------------------------------------
  // Transporter Actions & Order Status Updates
  // ---------------------------------------------------------------------------
  function acceptTransportTrip(orderId) {
    if (!STATE.currentUser || STATE.currentUser.role !== 'transporter') {
      showToast("Access Denied: Only transport workers can accept delivery gigs.");
      return;
    }

    const order = STATE.orders.find(o => o.id === orderId);
    if (!order) return;

    order.transporterId = STATE.currentUser.id;
    order.transporterName = STATE.currentUser.name;
    persist();

    showToast(`Accepted Delivery Gig for Order #${orderId}! Pick up from ${order.farmerName}.`);
    renderFarmerHub();
    renderConsumerHub();
    renderTransporterHub();
  }

  function updateOrderStatus(orderId, newStatus) {
    if (!STATE.currentUser) {
      showToast("Please sign in to update order status.");
      return;
    }

    const order = STATE.orders.find(o => o.id === orderId);
    if (!order) return;

    // Validate status permissions
    if (newStatus === 'Confirmed' && STATE.currentUser.role !== 'farmer') {
      showToast("Only the farmer can confirm this order.");
      return;
    }
    if ((newStatus === 'In Transit' || newStatus === 'Delivered') && STATE.currentUser.role !== 'transporter') {
      showToast("Only the transport worker can update transit and delivery status.");
      return;
    }

    order.status = newStatus;
    persist();

    showToast(`Order #${orderId} updated to: ${newStatus}`);
    renderFarmerHub();
    renderConsumerHub();
    renderTransporterHub();
  }

  // ---------------------------------------------------------------------------
  // Offline Mode Toggle
  // ---------------------------------------------------------------------------
  function toggleOffline() {
    STATE.isOffline = !STATE.isOffline;
    const bar = document.getElementById('offline-bar');
    const text = document.getElementById('offline-status-text');

    if (bar) bar.classList.toggle('active', STATE.isOffline);
    if (text) text.textContent = STATE.isOffline ? 'Offline' : 'Online';

    if (STATE.isOffline) {
      showToast("Offline Mode Activated (Rural Simulation)");
    } else {
      const count = STATE.offlineQueue.length;
      STATE.offlineQueue = [];
      persist();
      showToast(`Back Online! Synced ${count} offline items.`);
    }
  }

  // ---------------------------------------------------------------------------
  // Toast Notifications
  // ---------------------------------------------------------------------------
  function showToast(msg) {
    const toast = document.getElementById('toast-msg');
    if (!toast) return;

    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // ---------------------------------------------------------------------------
  // Event Listeners Setup
  // ---------------------------------------------------------------------------
  function setupEventListeners() {
    // Brand home button click
    const brandBtn = document.getElementById('brand-home-btn');
    if (brandBtn) {
      brandBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!STATE.currentUser) {
          switchView('auth');
        } else if (STATE.currentUser.role === 'farmer') {
          switchView('farmer');
        } else if (STATE.currentUser.role === 'transporter') {
          switchView('transporter');
        } else {
          switchView('marketplace');
        }
      });
    }

    // Navigation links
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        switchView(view);
      });
    });

    // Logout button in header
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logoutUser);
    }

    // Role selection segmented control on login page
    document.querySelectorAll('.role-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-role');
        setAuthRole(role);
      });
    });

    // Auth tab buttons
    const tabLogin = document.getElementById('tab-login-btn');
    const tabSignup = document.getElementById('tab-signup-btn');
    if (tabLogin) tabLogin.addEventListener('click', () => setAuthTab('login'));
    if (tabSignup) tabSignup.addEventListener('click', () => setAuthTab('signup'));

    // In-form switch links
    const linkSignup = document.getElementById('link-goto-signup');
    const linkLogin = document.getElementById('link-goto-login');
    if (linkSignup) {
      linkSignup.addEventListener('click', (e) => {
        e.preventDefault();
        setAuthTab('signup');
      });
    }
    if (linkLogin) {
      linkLogin.addEventListener('click', (e) => {
        e.preventDefault();
        setAuthTab('login');
      });
    }

    // Login form submission
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('login-phone').value.trim();
        const password = document.getElementById('login-password').value.trim();

        // Match registered user by phone & role
        const user = STATE.users.find(u => u.phone === phone && u.role === STATE.authRole);

        if (!user) {
          showToast(`No registered ${STATE.authRole} found with phone ${phone}. Please switch to Sign Up to create an account.`);
          return;
        }

        if (user.password && user.password !== password) {
          showToast("Incorrect password. Please enter the correct password.");
          return;
        }

        loginUser(user);
      });
    }

    // Sign up form submission
    const formSignup = document.getElementById('form-signup');
    if (formSignup) {
      formSignup.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value.trim();
        const phone = document.getElementById('signup-phone').value.trim();
        const location = document.getElementById('signup-location').value.trim();
        const extra = document.getElementById('signup-extra-field').value.trim();
        const password = document.getElementById('signup-password').value.trim();

        // Check if an account already exists for this phone and role
        const existing = STATE.users.find(u => u.phone === phone && u.role === STATE.authRole);
        if (existing) {
          showToast(`An account with phone ${phone} is already registered as ${STATE.authRole}. Please sign in.`);
          setAuthTab('login');
          document.getElementById('login-phone').value = phone;
          return;
        }

        const newUser = {
          id: `user-${Date.now()}`,
          name: name,
          role: STATE.authRole,
          phone: phone,
          location: location,
          extraField: extra,
          password: password
        };

        STATE.users.push(newUser);
        persist();
        loginUser(newUser);
      });
    }

    // Quick add crop buttons (Farmer only)
    const btnMarketAdd = document.getElementById('btn-market-add-crop');
    const btnFarmerNew = document.getElementById('btn-farmer-new-listing');
    if (btnMarketAdd) btnMarketAdd.addEventListener('click', () => switchView('add-crop'));
    if (btnFarmerNew) btnFarmerNew.addEventListener('click', () => switchView('add-crop'));

    // Consumer browse button
    const btnConsumerBrowse = document.getElementById('btn-consumer-browse');
    if (btnConsumerBrowse) btnConsumerBrowse.addEventListener('click', () => switchView('marketplace'));

    // Marketplace Search & Filters
    const searchInput = document.getElementById('market-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        STATE.searchQuery = e.target.value;
        renderMarketplace();
      });
    }

    const demandFilterEl = document.getElementById('market-demand-filter');
    if (demandFilterEl) {
      demandFilterEl.addEventListener('change', (e) => {
        STATE.demandFilter = e.target.value;
        renderMarketplace();
      });
    }

    // Add Crop Form
    const formAddCrop = document.getElementById('form-add-crop');
    if (formAddCrop) formAddCrop.addEventListener('submit', handleAddCropSubmit);

    const btnCancelAddCrop = document.getElementById('btn-cancel-add-crop');
    if (btnCancelAddCrop) btnCancelAddCrop.addEventListener('click', () => {
      if (STATE.currentUser && STATE.currentUser.role === 'farmer') switchView('farmer');
      else switchView('marketplace');
    });

    // AI Pricing auto-trigger on crop name change
    const cropNameInput = document.getElementById('add-crop-name');
    if (cropNameInput) {
      cropNameInput.addEventListener('input', (e) => {
        evaluateAiPrice(e.target.value);
      });
    }

    // Apply AI suggested price
    const btnApplyAiPrice = document.getElementById('btn-apply-ai-price');
    if (btnApplyAiPrice) {
      btnApplyAiPrice.addEventListener('click', () => {
        const price = btnApplyAiPrice.dataset.price;
        const priceInput = document.getElementById('add-crop-price');
        if (priceInput && price) {
          priceInput.value = price;
          showToast(`Applied suggested price: ₹${price}/kg`);
        }
      });
    }

    // Order modal events
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelOrder = document.getElementById('btn-cancel-order');
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeOrderModal);
    if (btnCancelOrder) btnCancelOrder.addEventListener('click', closeOrderModal);

    const orderQtyInput = document.getElementById('order-quantity');
    if (orderQtyInput) orderQtyInput.addEventListener('input', recalcTotal);

    const formOrder = document.getElementById('form-order');
    if (formOrder) formOrder.addEventListener('submit', handleOrderSubmit);

    // Offline mode toggles
    const btnToggleOffline = document.getElementById('btn-toggle-offline');
    const btnSyncOnline = document.getElementById('btn-sync-online');
    if (btnToggleOffline) btnToggleOffline.addEventListener('click', toggleOffline);
    if (btnSyncOnline) btnSyncOnline.addEventListener('click', toggleOffline);
  }

  // ---------------------------------------------------------------------------
  // Global API
  // ---------------------------------------------------------------------------
  window.farmSetu = {
    openOrderModal: openOrderModal,
    acceptTransportTrip: acceptTransportTrip,
    updateOrderStatus: updateOrderStatus,
    switchView: switchView,
    logoutUser: logoutUser,
    notifyRoleRestriction: notifyRoleRestriction
  };

  // Launch on ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
