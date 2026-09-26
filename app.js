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
    demandFilter: 'all',
    quickFilter: 'all',
    chartCrop: 'tomato',
    chartDays: 7,
    chartVisibleSeries: {
      direct: true,
      mandi: true,
      retail: true
    },
    insightsPerspective: 'consumer' // 'consumer' or 'farmer'
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

    // Auto-set Market Insights perspective based on active session
    if (STATE.currentUser && STATE.currentUser.role === 'farmer') {
      STATE.insightsPerspective = 'farmer';
    } else {
      STATE.insightsPerspective = 'consumer';
    }

    renderMarketplace();
    renderFarmerHub();
    renderConsumerHub();
    renderTransporterHub();
    renderInsights();

    // Trigger initial AI suggestion for Tomato
    evaluateAiPrice("Tomato");
    evaluateSimulator();
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
    if (user && user.role === 'farmer') {
      STATE.insightsPerspective = 'farmer';
    } else {
      STATE.insightsPerspective = 'consumer';
    }
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

    // Filter by demand dropdown
    if (STATE.demandFilter !== 'all') {
      list = list.filter(c => c.demandLevel === STATE.demandFilter);
    }

    // Filter by quick filter pills
    if (STATE.quickFilter && STATE.quickFilter !== 'all') {
      if (STATE.quickFilter === 'under20') {
        list = list.filter(c => c.pricePerKg <= 20);
      } else {
        list = list.filter(c => c.demandLevel === STATE.quickFilter);
      }
    }

    // Dynamic result count indicator
    const resultsCountEl = document.getElementById('market-results-count');
    if (resultsCountEl) {
      resultsCountEl.textContent = `Showing ${list.length} verified produce ${list.length === 1 ? 'listing' : 'listings'} direct from farm`;
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; background:#fff; border:1px solid var(--gray-200); border-radius:var(--border-radius);">
          <p style="color:var(--gray-600); font-weight:600;">No crops match your filter criteria.</p>
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

    // Update Farmer Live Statistics
    const farmerCrops = STATE.crops.filter(c => !STATE.currentUser || c.farmerId === STATE.currentUser.id || true);
    const totalStock = farmerCrops.reduce((acc, c) => acc + (c.quantity || 0), 0);
    const incomingOrders = STATE.orders.length;
    const totalRevenue = STATE.orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    const fStatCrops = document.getElementById('farmer-stat-crops');
    const fStatStock = document.getElementById('farmer-stat-stock');
    const fStatOrders = document.getElementById('farmer-stat-orders');
    const fStatRev = document.getElementById('farmer-stat-revenue');

    if (fStatCrops) fStatCrops.textContent = farmerCrops.length;
    if (fStatStock) fStatStock.textContent = `${totalStock.toLocaleString()} kg`;
    if (fStatOrders) fStatOrders.textContent = incomingOrders;
    if (fStatRev) fStatRev.textContent = `₹${totalRevenue.toLocaleString()}`;

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

    // Render Farmer Dedicated AI Mandi Benchmark & Pricing Guidance Table
    const fRulesTbody = document.getElementById('farmer-mandi-rules-tbody');
    if (fRulesTbody && typeof AI_RULES !== 'undefined') {
      fRulesTbody.innerHTML = Object.keys(AI_RULES).map(k => {
        const r = AI_RULES[k];
        const icon = r.demand === 'High' ? '📈' : (r.demand === 'Medium' ? '⚡' : '📉');
        const premium = Math.round(((r.suggestedPrice - r.baseMandiPrice) / r.baseMandiPrice) * 1000) / 10;
        return `
          <tr>
            <td><strong>${r.crop}</strong></td>
            <td><span class="demand-pill demand-${r.demand.toLowerCase()}">${icon} ${r.demand}</span></td>
            <td style="color:#6366f1; font-weight:600;">₹${r.baseMandiPrice} / kg</td>
            <td><strong style="color:var(--primary); font-size:0.95rem;">₹${r.suggestedPrice} / kg</strong></td>
            <td><span class="status-badge status-delivered" style="font-weight:700;">+${premium}% vs Mandi</span></td>
            <td style="font-size:0.83rem; color:var(--gray-600);">${r.farmerReason || r.reason}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // ---------------------------------------------------------------------------
  // Consumer Hub Render (With Interactive Delivery Timeline)
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

      // Status progress steps (1: Placed, 2: Farm Confirmed, 3: In Transit, 4: Delivered)
      const isConfirmed = o.status === 'Confirmed' || o.status === 'In Transit' || o.status === 'Delivered';
      const isInTransit = o.status === 'In Transit' || o.status === 'Delivered';
      const isDelivered = o.status === 'Delivered';

      const step1Class = 'completed';
      const step2Class = isConfirmed ? (o.status === 'Confirmed' ? 'active' : 'completed') : '';
      const step3Class = isInTransit ? (o.status === 'In Transit' ? 'active' : 'completed') : '';
      const step4Class = isDelivered ? 'completed active' : '';

      return `
        <tr>
          <td><strong>#${o.id}</strong></td>
          <td>${o.cropName}</td>
          <td>${o.farmerName} (${o.farmerLocation})</td>
          <td>${o.quantity} kg</td>
          <td><strong>₹${o.totalAmount}</strong></td>
          <td>${o.deliveryAddress}</td>
          <td>${transporterText}</td>
          <td>
            <span class="status-badge status-${statusClass}">${o.status}</span>
            <div class="order-tracking-strip">
              <div class="tracker-timeline">
                <div class="tracker-node ${step1Class}">
                  <div class="tracker-circle">✓</div>
                  <div class="tracker-label">Placed</div>
                </div>
                <div class="tracker-node ${step2Class}">
                  <div class="tracker-circle">${isConfirmed ? '✓' : '2'}</div>
                  <div class="tracker-label">Farm Packed</div>
                </div>
                <div class="tracker-node ${step3Class}">
                  <div class="tracker-circle">${isInTransit ? '🚚' : '3'}</div>
                  <div class="tracker-label">In Transit</div>
                </div>
                <div class="tracker-node ${step4Class}">
                  <div class="tracker-circle">${isDelivered ? '★' : '4'}</div>
                  <div class="tracker-label">Delivered</div>
                </div>
              </div>
            </div>
          </td>
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

    // Update Transporter Statistics
    const availableGigs = STATE.orders.filter(o => o.status === 'Confirmed' && !o.transporterId).length;
    const inTransit = STATE.orders.filter(o => o.status === 'In Transit').length;
    const completed = STATE.orders.filter(o => o.status === 'Delivered').length;
    const potentialEarnings = STATE.orders.reduce((acc, o) => acc + (o.deliveryFee || 80), 0);

    const tStatEarn = document.getElementById('trans-stat-earnings');
    const tStatAvail = document.getElementById('trans-stat-available');
    const tStatTransit = document.getElementById('trans-stat-transit');
    const tStatComp = document.getElementById('trans-stat-completed');

    if (tStatEarn) tStatEarn.textContent = `₹${potentialEarnings}`;
    if (tStatAvail) tStatAvail.textContent = availableGigs;
    if (tStatTransit) tStatTransit.textContent = inTransit;
    if (tStatComp) tStatComp.textContent = completed;

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
  // Market Insights & Interactive AI Simulator
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Market Insights, Interactive Charts & Real-Time Analytics (Role-Adaptive)
  // ---------------------------------------------------------------------------
  function setInsightsPerspective(persp) {
    STATE.insightsPerspective = persp;
    renderInsights();
    evaluateSimulator();
  }

  function renderInsights() {
    const isFarmer = STATE.insightsPerspective === 'farmer';

    // 1. Perspective Pill States
    const pillConsumer = document.getElementById('pill-persp-consumer');
    const pillFarmer = document.getElementById('pill-persp-farmer');
    const badge = document.getElementById('persp-active-badge');
    if (pillConsumer) pillConsumer.classList.toggle('active', !isFarmer);
    if (pillFarmer) pillFarmer.classList.toggle('active', isFarmer);
    if (badge) {
      badge.textContent = isFarmer ? '🧑🌾 Farmer Mode' : '🛒 Consumer Mode';
    }

    // 2. Dynamic 4th Metric Card
    const dynTitle = document.getElementById('insight-dynamic-title');
    const dynVal = document.getElementById('insight-dynamic-val');
    const dynSub = document.getElementById('insight-dynamic-sub');
    if (isFarmer) {
      if (dynTitle) dynTitle.textContent = 'Farmer Profit Premium';
      if (dynVal) dynVal.textContent = '+15.8%';
      if (dynSub) {
        dynSub.textContent = 'Higher earnings vs Mandi';
        dynSub.style.color = '#15803d';
      }
    } else {
      if (dynTitle) dynTitle.textContent = 'Direct Buyer Savings';
      if (dynVal) dynVal.textContent = 'Save ₹11 / kg (33%)';
      if (dynSub) {
        dynSub.textContent = 'Cheaper than supermarket retail';
        dynSub.style.color = '#15803d';
      }
    }

    renderPriceTrendChart();
    renderDemandDistributionBars();
    renderRegionalArbitrageCards();

    // 3. Render Role-Adaptive Demand Prediction & Price Comparison Table
    const tableTitle = document.getElementById('insights-table-title');
    const tableSubtitle = document.getElementById('insights-table-subtitle');
    const tableBadge = document.getElementById('insights-table-badge');
    const thead = document.getElementById('insights-rules-thead');
    const tbody = document.getElementById('insights-rules-tbody');

    if (isFarmer) {
      // FARMER PERSPECTIVE: Wholesale Mandi Base Rate vs Recommended Direct Price
      if (tableTitle) tableTitle.textContent = 'Farmer Demand Rules & Wholesale Mandi Arbitrage';
      if (tableSubtitle) tableSubtitle.textContent = 'Guidance for agricultural producers: list above wholesale mandi base rates without losing buyer demand.';
      if (tableBadge) {
        tableBadge.textContent = '🧑🌾 Farmer Selling Lens';
        tableBadge.style.background = '#eff6ff';
        tableBadge.style.color = '#1d4ed8';
        tableBadge.style.borderColor = '#bfdbfe';
      }
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th>Crop Name</th>
            <th>Demand Indicator</th>
            <th>Wholesale Mandi Base Rate</th>
            <th>Recommended Direct Price</th>
            <th>Farmer Profit Premium</th>
            <th>AI Selling Guidance</th>
          </tr>
        `;
      }
      if (tbody && typeof AI_RULES !== 'undefined') {
        tbody.innerHTML = Object.keys(AI_RULES).map(k => {
          const r = AI_RULES[k];
          const icon = r.demand === 'High' ? '📈' : (r.demand === 'Medium' ? '⚡' : '📉');
          const premium = Math.round(((r.suggestedPrice - r.baseMandiPrice) / r.baseMandiPrice) * 1000) / 10;
          return `
            <tr>
              <td><strong>${r.crop}</strong></td>
              <td><span class="demand-pill demand-${r.demand.toLowerCase()}">${icon} ${r.demand} Demand</span></td>
              <td style="color:#6366f1; font-weight:600;">₹${r.baseMandiPrice} / kg</td>
              <td><strong style="color:var(--primary); font-size:1.02rem;">₹${r.suggestedPrice} / kg</strong></td>
              <td><span class="status-badge status-delivered" style="font-weight:700;">+${premium}% vs Mandi</span></td>
              <td style="font-size:0.83rem; color:var(--gray-600);">${r.farmerReason || r.reason}</td>
            </tr>
          `;
        }).join('');
      }
    } else {
      // CONSUMER PERSPECTIVE: Supermarket Retail Rate vs FarmSetu Direct Price (Direct is LOWER!)
      if (tableTitle) tableTitle.textContent = 'Direct Farm Savings vs Retail Supermarket Rates';
      if (tableSubtitle) tableSubtitle.textContent = 'Why buy direct on FarmSetu: see how much you save per kilo compared to local retail grocery prices.';
      if (tableBadge) {
        tableBadge.textContent = '🛒 Consumer Savings Lens';
        tableBadge.style.background = 'var(--primary-light)';
        tableBadge.style.color = 'var(--primary)';
        tableBadge.style.borderColor = 'var(--primary-border)';
      }
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th>Crop Name</th>
            <th>Demand Status</th>
            <th>Supermarket / Retail Price</th>
            <th>FarmSetu Direct Price</th>
            <th>Your Direct Savings</th>
            <th>Consumer Benefit</th>
          </tr>
        `;
      }
      if (tbody && typeof AI_RULES !== 'undefined') {
        tbody.innerHTML = Object.keys(AI_RULES).map(k => {
          const r = AI_RULES[k];
          const icon = r.demand === 'High' ? '🔥' : (r.demand === 'Medium' ? '⚡' : '📉');
          const retail = r.retailPrice || (r.suggestedPrice + 12);
          const saved = retail - r.suggestedPrice;
          const savedPct = Math.round((saved / retail) * 100);
          return `
            <tr>
              <td><strong>${r.crop}</strong></td>
              <td><span class="demand-pill demand-${r.demand.toLowerCase()}">${icon} ${r.demand}</span></td>
              <td style="color:#ea580c; text-decoration:line-through; font-weight:600;">₹${retail} / kg</td>
              <td><strong style="color:var(--primary); font-size:1.05rem;">₹${r.suggestedPrice} / kg</strong></td>
              <td><span class="status-badge status-delivered" style="font-size:0.82rem; font-weight:700;">Save ₹${saved} / kg (${savedPct}% Off)</span></td>
              <td style="font-size:0.84rem; color:var(--gray-700);">${r.consumerReason || `Direct Farm Fresh (Save ₹${saved}/kg)`}</td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  // Interactive SVG Price Trend & Mandi Arbitrage Chart
  function renderPriceTrendChart() {
    const svg = document.getElementById('price-trend-svg');
    if (!svg) return;

    const cropKey = STATE.chartCrop || 'tomato';
    const cropData = (typeof CROP_HISTORICAL_DATA !== 'undefined' && CROP_HISTORICAL_DATA[cropKey])
      ? CROP_HISTORICAL_DATA[cropKey]
      : (typeof CROP_HISTORICAL_DATA !== 'undefined' ? CROP_HISTORICAL_DATA['tomato'] : null);

    if (!cropData) return;

    const daysKey = `days${STATE.chartDays || 7}`;
    const seriesData = cropData[daysKey] || cropData.days7;
    const labels = seriesData.labels;
    const directVals = seriesData.direct;
    const mandiVals = seriesData.mandi;
    const retailVals = seriesData.retail;

    // Update Live Stats Ribbon
    const currentDirect = directVals[directVals.length - 1];
    const currentMandi = mandiVals[mandiVals.length - 1];
    const currentRetail = retailVals[retailVals.length - 1];
    const premiumPct = Math.round(((currentDirect - currentMandi) / currentMandi) * 1000) / 10;
    const savingsAmount = currentRetail - currentDirect;
    const savingsPct = Math.round((savingsAmount / currentRetail) * 100);

    const statDirect = document.getElementById('trend-stat-direct');
    const statPremium = document.getElementById('trend-stat-premium');
    const statMandi = document.getElementById('trend-stat-mandi');
    const statRetail = document.getElementById('trend-stat-retail');
    const statSavings = document.getElementById('trend-stat-savings');
    const statStatus = document.getElementById('trend-stat-status');
    const insightGain = document.getElementById('insight-farmer-gain');

    if (statDirect) statDirect.textContent = `₹${currentDirect} / kg`;
    if (statPremium) statPremium.textContent = `+${premiumPct}% vs Mandi Base`;
    if (statMandi) statMandi.textContent = `₹${currentMandi} / kg`;
    if (statRetail) statRetail.textContent = `₹${currentRetail} / kg`;
    if (statSavings) statSavings.textContent = `₹${savingsAmount} / kg (${savingsPct}% Saved)`;
    if (statStatus) statStatus.textContent = cropData.status;
    if (insightGain) insightGain.textContent = `+${premiumPct}%`;

    // Responsive SVG Geometry
    const width = 760;
    const height = 280;
    const padLeft = 52;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 40;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const visibleSeries = STATE.chartVisibleSeries || { direct: true, mandi: true, retail: true };
    let allVals = [];
    if (visibleSeries.direct) allVals.push(...directVals);
    if (visibleSeries.mandi) allVals.push(...mandiVals);
    if (visibleSeries.retail) allVals.push(...retailVals);
    if (allVals.length === 0) allVals = [10, 20, 30];

    const minV = Math.max(0, Math.floor(Math.min(...allVals) * 0.85));
    const maxV = Math.ceil(Math.max(...allVals) * 1.15);

    const getX = (i) => padLeft + (i / (labels.length - 1)) * chartW;
    const getY = (val) => padTop + chartH - ((val - minV) / (maxV - minV)) * chartH;

    function buildSmoothPath(points) {
      if (points.length < 2) return "";
      let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    }

    const directPoints = directVals.map((v, i) => ({ x: getX(i), y: getY(v), val: v, label: labels[i] }));
    const mandiPoints = mandiVals.map((v, i) => ({ x: getX(i), y: getY(v), val: v, label: labels[i] }));
    const retailPoints = retailVals.map((v, i) => ({ x: getX(i), y: getY(v), val: v, label: labels[i] }));

    // Horizontal Grid Lines
    let gridLinesHtml = "";
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const val = Math.round(minV + (s / steps) * (maxV - minV));
      const y = getY(val);
      gridLinesHtml += `
        <line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${(width - padRight).toFixed(1)}" y2="${y.toFixed(1)}" class="chart-grid-line" />
        <text x="${(padLeft - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" class="chart-axis-label" text-anchor="end">₹${val}</text>
      `;
    }

    // X-Axis Date Labels
    let xLabelsHtml = "";
    labels.forEach((lbl, i) => {
      const x = getX(i);
      xLabelsHtml += `
        <text x="${x.toFixed(1)}" y="${(height - 12).toFixed(1)}" class="chart-axis-label" text-anchor="middle">${lbl}</text>
      `;
    });

    const directPath = buildSmoothPath(directPoints);
    const mandiPath = buildSmoothPath(mandiPoints);
    const retailPath = buildSmoothPath(retailPoints);

    const areaPath = (directPath && directPoints.length > 0)
      ? `${directPath} L ${directPoints[directPoints.length - 1].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${directPoints[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`
      : "";

    const defsHtml = `
      <defs>
        <linearGradient id="directPriceGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#15803d" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#15803d" stop-opacity="0.01" />
        </linearGradient>
      </defs>
    `;

    let dotsHtml = "";
    if (visibleSeries.retail) {
      retailPoints.forEach((p, i) => {
        dotsHtml += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#ea580c" stroke="#ffffff" stroke-width="1.8" class="chart-dot" data-idx="${i}" />`;
      });
    }
    if (visibleSeries.mandi) {
      mandiPoints.forEach((p, i) => {
        dotsHtml += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#6366f1" stroke="#ffffff" stroke-width="1.8" class="chart-dot" data-idx="${i}" />`;
      });
    }
    if (visibleSeries.direct) {
      directPoints.forEach((p, i) => {
        dotsHtml += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#15803d" stroke="#ffffff" stroke-width="2" class="chart-dot" data-idx="${i}" />`;
      });
    }

    const crosshairHtml = `<line id="chart-crosshair" x1="0" y1="${padTop}" x2="0" y2="${padTop + chartH}" class="chart-crosshair-line" style="display:none;" />`;

    svg.innerHTML = `
      ${defsHtml}
      ${gridLinesHtml}
      ${xLabelsHtml}
      ${visibleSeries.direct && areaPath ? `<path d="${areaPath}" fill="url(#directPriceGrad)" class="chart-area-fill" />` : ''}
      ${visibleSeries.retail ? `<path d="${retailPath}" class="chart-curve-retail" />` : ''}
      ${visibleSeries.mandi ? `<path d="${mandiPath}" class="chart-curve-mandi" />` : ''}
      ${visibleSeries.direct ? `<path d="${directPath}" class="chart-curve-direct" />` : ''}
      ${crosshairHtml}
      ${dotsHtml}
    `;

    attachChartInteractions(directPoints, mandiPoints, retailPoints, labels);
  }

  function attachChartInteractions(directPoints, mandiPoints, retailPoints, labels) {
    const svg = document.getElementById('price-trend-svg');
    const tooltip = document.getElementById('chart-tooltip');
    const crosshair = document.getElementById('chart-crosshair');
    if (!svg || !tooltip) return;

    svg.onmousemove = function (e) {
      const rect = svg.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const svgX = (clientX / rect.width) * 760;

      let nearestIdx = 0;
      let minDist = Infinity;
      directPoints.forEach((p, idx) => {
        const dist = Math.abs(p.x - svgX);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = idx;
        }
      });

      const targetPoint = directPoints[nearestIdx];
      if (!targetPoint) return;

      if (crosshair) {
        crosshair.setAttribute('x1', targetPoint.x);
        crosshair.setAttribute('x2', targetPoint.x);
        crosshair.style.display = 'block';
      }

      const dVal = directPoints[nearestIdx] ? directPoints[nearestIdx].val : 0;
      const mVal = mandiPoints[nearestIdx] ? mandiPoints[nearestIdx].val : 0;
      const rVal = retailPoints[nearestIdx] ? retailPoints[nearestIdx].val : 0;
      const gainPct = mVal ? Math.round(((dVal - mVal) / mVal) * 1000) / 10 : 0;
      const saveAmt = rVal - dVal;
      const savePct = rVal ? Math.round((saveAmt / rVal) * 100) : 0;

      tooltip.innerHTML = `
        <div class="tt-date">📅 ${labels[nearestIdx]}, 2026</div>
        <div class="tt-row direct">
          <span>🌱 Direct Payout:</span>
          <span>₹${dVal} / kg</span>
        </div>
        <div class="tt-row mandi">
          <span>🟣 Wholesale Mandi:</span>
          <span>₹${mVal} / kg</span>
        </div>
        <div class="tt-row retail">
          <span>🟠 Supermarket:</span>
          <span>₹${rVal} / kg</span>
        </div>
        <div class="tt-gain">
          ▲ Farmer Profit: +${gainPct}% (+₹${dVal - mVal}/kg)<br>
          ▼ Consumer Saved: ₹${saveAmt}/kg (${savePct}%)
        </div>
      `;

      tooltip.style.display = 'block';

      const normX = (targetPoint.x / 760) * rect.width;
      const normY = (targetPoint.y / 280) * rect.height;

      let ttLeft = normX + 16;
      if (ttLeft + 195 > rect.width) {
        ttLeft = normX - 205;
      }
      let ttTop = Math.max(10, normY - 45);

      tooltip.style.left = `${ttLeft}px`;
      tooltip.style.top = `${ttTop}px`;
    };

    svg.onmouseleave = function () {
      if (tooltip) tooltip.style.display = 'none';
      if (crosshair) crosshair.style.display = 'none';
    };
  }

  // Cross-Crop Demand Index & Mandi Arrival Distribution Visualizer
  function renderDemandDistributionBars() {
    const container = document.getElementById('demand-bars-container');
    if (!container || typeof CROP_HISTORICAL_DATA === 'undefined') return;

    const crops = Object.keys(CROP_HISTORICAL_DATA).map(k => CROP_HISTORICAL_DATA[k]);

    container.innerHTML = crops.map(c => {
      const isSelected = (STATE.chartCrop || 'tomato').toLowerCase() === c.crop.toLowerCase();
      const fillClass = c.demandIndex >= 85 ? 'fill-high' : (c.demandIndex >= 70 ? 'fill-medium' : 'fill-low');
      const badgeText = c.demandIndex >= 85 ? '🔥 High Demand' : (c.demandIndex >= 70 ? '⚡ Balanced' : '📉 Surplus');
      const badgeClass = c.demandIndex >= 85 ? 'demand-high' : (c.demandIndex >= 70 ? 'demand-medium' : 'demand-low');

      return `
        <div class="demand-bar-item ${isSelected ? 'selected' : ''}" data-crop="${c.crop.toLowerCase()}" title="Click to view ${c.crop} price trends">
          <div class="demand-bar-head">
            <span>${c.emoji} ${c.crop}</span>
            <span class="demand-pill ${badgeClass}">${badgeText} (${c.demandIndex}%)</span>
          </div>
          <div class="demand-bar-track">
            <div class="demand-bar-fill ${fillClass}" style="width: ${c.demandIndex}%;"></div>
          </div>
          <div class="demand-bar-footer">
            <span>Arrivals: <strong>${c.arrivalVolume}</strong></span>
            <span style="color:#15803d; font-weight:700;">Farmer Gain: ${c.farmerPremium}</span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.demand-bar-item').forEach(item => {
      item.addEventListener('click', () => {
        const cropKey = item.getAttribute('data-crop');
        if (cropKey) {
          selectChartCrop(cropKey);
        }
      });
    });
  }

  // Regional Market Disparity & Arbitrage Cards
  function renderRegionalArbitrageCards() {
    const container = document.getElementById('regional-cards-list');
    if (!container || typeof REGIONAL_MARKET_DATA === 'undefined') return;

    container.innerHTML = REGIONAL_MARKET_DATA.map(r => {
      const isHigh = r.demandLevel === 'High';
      const pillClass = isHigh ? 'demand-high' : 'demand-medium';
      const pillIcon = isHigh ? '🔥' : '⚡';

      return `
        <div class="regional-card-item">
          <div class="reg-head">
            <span>📍 ${r.region}</span>
            <span class="demand-pill ${pillClass}">${pillIcon} ${r.demandLevel} Demand</span>
          </div>
          <div class="reg-mandi-sub">Mandi APMC: ${r.mandis} &bull; Top: <strong>${r.topCrop}</strong></div>
          <div class="reg-metrics-grid">
            <div>
              <span class="reg-metric-label">Wholesale Mandi</span>
              <span class="reg-metric-val" style="color:#6366f1;">${r.mandiPrice}</span>
            </div>
            <div>
              <span class="reg-metric-label">FarmSetu Direct</span>
              <span class="reg-metric-val" style="color:#15803d;">${r.directPrice}</span>
            </div>
            <div>
              <span class="reg-metric-label">Farmer Premium</span>
              <span class="reg-metric-val" style="color:#15803d;">${r.farmerGain}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function selectChartCrop(cropKey) {
    STATE.chartCrop = cropKey.toLowerCase();

    const selectEl = document.getElementById('trend-crop-select');
    if (selectEl) selectEl.value = STATE.chartCrop;

    const simSelectEl = document.getElementById('sim-crop-select');
    if (simSelectEl && simSelectEl.value !== STATE.chartCrop) {
      simSelectEl.value = STATE.chartCrop;
      evaluateSimulator();
    }

    renderPriceTrendChart();
    renderDemandDistributionBars();
  }

  function evaluateSimulator() {
    const cropSelect = document.getElementById('sim-crop-select');
    const supplySlider = document.getElementById('sim-supply-slider');
    const supplyValText = document.getElementById('sim-supply-val');
    const resDemand = document.getElementById('sim-res-demand');
    const resPrice = document.getElementById('sim-res-price');
    const resAdvantage = document.getElementById('sim-res-advantage');

    if (!cropSelect || !supplySlider) return;

    const cropKey = cropSelect.value;
    const sliderVal = parseInt(supplySlider.value, 10);
    const baseRule = AI_RULES[cropKey] || { crop: cropKey, baseMandiPrice: 20 };

    const supplyLabels = {
      1: "Severe Shortage (High Demand 🔥)",
      2: "Low Arrivals (Deficit)",
      3: "Normal / Balanced Arrivals",
      4: "High Arrivals (Surplus)",
      5: "Heavy Glut / Oversupply"
    };

    if (supplyValText) supplyValText.textContent = supplyLabels[sliderVal] || "Normal";

    let demandLevel = "Medium";
    let multiplier = 1.0;
    let advantagePercent = 10;

    if (sliderVal === 1) {
      demandLevel = "High";
      multiplier = 1.25;
      advantagePercent = 22;
    } else if (sliderVal === 2) {
      demandLevel = "High";
      multiplier = 1.15;
      advantagePercent = 15;
    } else if (sliderVal === 3) {
      demandLevel = "Medium";
      multiplier = 1.05;
      advantagePercent = 10;
    } else if (sliderVal === 4) {
      demandLevel = "Low";
      multiplier = 0.95;
      advantagePercent = 6;
    } else {
      demandLevel = "Low";
      multiplier = 0.90;
      advantagePercent = 4;
    }

    const isFarmer = STATE.insightsPerspective === 'farmer';
    const suggestedPrice = Math.round(baseRule.baseMandiPrice * multiplier);
    const retail = baseRule.retailPrice || (suggestedPrice + 12);
    const icon = demandLevel === 'High' ? (isFarmer ? '📈' : '🔥') : (demandLevel === 'Medium' ? '⚡' : '📉');

    if (resDemand) resDemand.innerHTML = `${icon} ${demandLevel} Demand`;
    if (resPrice) resPrice.textContent = `₹${suggestedPrice} / kg`;

    const advLbl = document.getElementById('sim-advantage-lbl');
    if (advLbl) {
      advLbl.textContent = isFarmer ? 'Farmer Profit Premium' : 'Consumer Direct Savings';
    }

    if (resAdvantage) {
      if (isFarmer) {
        resAdvantage.textContent = `+${advantagePercent}% vs Mandi`;
      } else {
        const saved = retail - suggestedPrice;
        const savedPct = Math.round((saved / retail) * 100);
        resAdvantage.textContent = `Save ${savedPct}% (Save ₹${saved}/kg)`;
      }
    }
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

    let qty = parseInt(document.getElementById('order-quantity').value, 10) || 0;
    if (qty < 1) qty = 1;
    if (crop.quantity && qty > crop.quantity) qty = crop.quantity;

    const subtotal = qty * crop.pricePerKg;
    const deliveryFee = Math.round(40 + (qty * 1.5));
    const savings = Math.round(subtotal * 0.25);
    const total = subtotal + deliveryFee;

    const elQty = document.getElementById('calc-qty-display');
    const elRate = document.getElementById('calc-rate-display');
    const elSub = document.getElementById('calc-subtotal-display');
    const elFee = document.getElementById('calc-trans-fee-display');
    const elSav = document.getElementById('calc-savings-display');
    const elTot = document.getElementById('order-total-calc');

    if (elQty) elQty.textContent = `${qty} kg`;
    if (elRate) elRate.textContent = `₹${crop.pricePerKg}`;
    if (elSub) elSub.textContent = `₹${subtotal}`;
    if (elFee) elFee.textContent = `₹${deliveryFee}`;
    if (elSav) elSav.textContent = `−₹${savings}`;
    if (elTot) elTot.textContent = `₹${total}`;
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

    const subtotal = qty * crop.pricePerKg;
    const deliveryFee = Math.round(40 + (qty * 1.5));
    const totalAmount = subtotal + deliveryFee;

    const orderId = `ORD-${Math.floor(100 + Math.random() * 900)}`;

    const newOrder = {
      id: orderId,
      cropId: crop.id,
      cropName: crop.name,
      quantity: qty,
      unitPrice: crop.pricePerKg,
      subtotalAmount: subtotal,
      deliveryFee: deliveryFee,
      totalAmount: totalAmount,
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
      orderDate: new Date().toISOString().split('T')[0]
    };

    // Deduct available crop stock
    crop.quantity = Math.max(0, crop.quantity - qty);

    if (STATE.isOffline) {
      STATE.offlineQueue.push({ type: 'ORDER', data: newOrder });
      showToast(`Saved offline: Order #${orderId}`);
    } else {
      showToast(`Order #${orderId} placed successfully! Direct from Farm to You.`);
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

    // Interactive Quick Filter Pills
    document.querySelectorAll('#quick-filter-pills .filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#quick-filter-pills .filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.quickFilter = btn.getAttribute('data-filter');
        renderMarketplace();
      });
    });

    // Order modal events
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelOrder = document.getElementById('btn-cancel-order');
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeOrderModal);
    if (btnCancelOrder) btnCancelOrder.addEventListener('click', closeOrderModal);

    const orderQtyInput = document.getElementById('order-quantity');
    if (orderQtyInput) orderQtyInput.addEventListener('input', recalcTotal);

    // Interactive Quantity Stepper (+ / -)
    const btnQtyMinus = document.getElementById('btn-qty-minus');
    const btnQtyPlus = document.getElementById('btn-qty-plus');
    if (btnQtyMinus && orderQtyInput) {
      btnQtyMinus.addEventListener('click', () => {
        const cur = parseInt(orderQtyInput.value, 10) || 0;
        orderQtyInput.value = Math.max(1, cur - 5);
        recalcTotal();
      });
    }
    if (btnQtyPlus && orderQtyInput) {
      btnQtyPlus.addEventListener('click', () => {
        const max = STATE.selectedCropForOrder ? STATE.selectedCropForOrder.quantity : 9999;
        const cur = parseInt(orderQtyInput.value, 10) || 0;
        orderQtyInput.value = Math.min(max, cur + 5);
        recalcTotal();
      });
    }

    // Interactive Quantity Preset Pills (10kg, 25kg, 50kg, 100kg, Max)
    document.querySelectorAll('.qty-preset-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        if (!STATE.selectedCropForOrder || !orderQtyInput) return;
        const presetVal = pill.getAttribute('data-qty');
        if (presetVal) {
          const val = parseInt(presetVal, 10);
          orderQtyInput.value = Math.min(STATE.selectedCropForOrder.quantity, val);
        } else if (pill.id === 'btn-qty-max') {
          orderQtyInput.value = STATE.selectedCropForOrder.quantity;
        }
        recalcTotal();
      });
    });

    // Interactive AI Demand & Price Simulator
    const simCrop = document.getElementById('sim-crop-select');
    const simSlider = document.getElementById('sim-supply-slider');
    if (simCrop) {
      simCrop.addEventListener('change', () => {
        evaluateSimulator();
        if (STATE.chartCrop !== simCrop.value) {
          selectChartCrop(simCrop.value);
        }
      });
    }
    if (simSlider) simSlider.addEventListener('input', evaluateSimulator);

    // Interactive Price Trend Chart Controls
    const trendCropSelect = document.getElementById('trend-crop-select');
    if (trendCropSelect) {
      trendCropSelect.addEventListener('change', (e) => {
        selectChartCrop(e.target.value);
      });
    }

    document.querySelectorAll('#trend-timeframe-pills .timeframe-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#trend-timeframe-pills .timeframe-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        STATE.chartDays = parseInt(pill.getAttribute('data-days'), 10) || 7;
        renderPriceTrendChart();
      });
    });

    ['direct', 'mandi', 'retail'].forEach(series => {
      const btn = document.getElementById(`legend-btn-${series}`);
      if (btn) {
        btn.addEventListener('click', () => {
          STATE.chartVisibleSeries[series] = !STATE.chartVisibleSeries[series];
          btn.classList.toggle('inactive', !STATE.chartVisibleSeries[series]);
          renderPriceTrendChart();
        });
      }
    });

    window.addEventListener('resize', () => {
      if (STATE.currentView === 'insights') {
        renderPriceTrendChart();
      }
    });

    // Smooth Floating Scroll-to-Top Button
    const scrollTopBtn = document.getElementById('btn-scroll-top');
    if (scrollTopBtn) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 160) {
          scrollTopBtn.classList.add('visible');
        } else {
          scrollTopBtn.classList.remove('visible');
        }
      }, { passive: true });

      scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

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
