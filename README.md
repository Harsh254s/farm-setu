# 🌱 FarmSetu - From Farm to You

> **Direct Marketplace Connecting Farmers, Consumers, and Transport Workers**
> **Tagline: From Farm to You**

FarmSetu connects agricultural producers directly with retail consumers and local transport workers. By eliminating intermediate layers of traditional middlemen, farmers earn better prices, consumers get affordable fresh produce, and local transport workers earn on delivery gigs directly **From Farm to You**.

---

## 🚀 Live Demo & How to Run

The prototype is completely self-contained (HTML5, Clean Vanilla CSS, Modular ES6+ JavaScript, and LocalStorage persistence).

### Option 1: Running via Local Web Server
A lightweight PowerShell HTTP server is running at:
👉 **[http://localhost:8080/](http://localhost:8080/)**

To restart or run the server at any time:
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```

### Option 2: Direct Browser File Access
Simply open `index.html` in Chrome, Edge, Firefox, or Safari:
```text
c:\Users\Surya\OneDrive\Desktop\prototype\index.html
```

---

## 👥 Three User Roles & Dedicated Authentication Page

Click **"🔑 Login / Switch Role"** in the top header to access the dedicated Login & Registration page for all three roles:

1. **🧑🌾 Farmer (e.g. Ramesh Kumar - Kolar)**
   - List harvested crops (Crop Name, Quantity, Price/kg, Location, Harvest Date).
   - Get smart **AI Price & Demand Recommendations** (e.g. Tomato $\rightarrow$ High Demand $\rightarrow$ ₹22/kg).
   - View my crop inventory and incoming consumer orders.
   - Accept incoming orders and prepare them for transporter pickup.

2. **🛒 Consumer (e.g. Priya Sharma - Bengaluru)**
   - Browse the **"Marketplace: From Farm to You"**.
   - Filter by crop name and demand level (`📈 High Demand`, `⚡ Medium Demand`, `📉 Low Demand`).
   - Place orders with quantity and delivery address.
   - Track live delivery status and view assigned transporter.

3. **🚚 Transport Worker (e.g. Vikram Singh - Bolero Mini Truck)**
   - View available delivery gigs from farm pickup to consumer home.
   - **Accept Delivery Gig** (assigns the transport worker to the order).
   - **Mark Picked Up from Farm** (changes status to *In Transit*).
   - **Mark Delivered to Home** (changes status to *Delivered* and credits delivery fee).

### 🔐 Real User Registration & Login Flow
- **New Users**: Select your role (`Farmer`, `Consumer`, or `Transport Worker`), click the **"New User? Sign Up"** tab, enter your Name, Phone Number, Location/Vehicle details, and create a Password. Your account is immediately created and saved.
- **Registered Users**: Select your role, enter your registered Mobile Number and Password, and click **"Log In"**.
- Default registered test accounts available:
  - Farmer: Phone `9876543210` / Password `123`
  - Consumer: Phone `9123456780` / Password `123`
  - Transport Worker: Phone `9988776655` / Password `123`

---

## 🤖 Lightweight AI Features

1. **Demand Forecasting (Rule-Based + Order Count)**:
   - Tomato $\rightarrow$ `📈 High Demand`
   - Onion $\rightarrow$ `📈 High Demand`
   - Potato $\rightarrow$ `⚡ Medium Demand`
   - Dynamically adapts based on order volume.
2. **AI Price Recommendation**:
   - High Demand: Recommends 10–15% above wholesale base.
   - One-click `Apply Suggested Price` button on the Add Crop form.
3. **Market Insights Dashboard**:
   - Displays top demanded crop, average price, and high demand areas (Delhi, Lucknow, Bengaluru).
4. **Offline Mode Simulation**:
   - Toggleable offline mode simulating rural connectivity with `localStorage` queue and cloud sync.
