// FarmSetu - Basic Seed Data & Knowledge Base
// Title: From Farm to You

const INITIAL_USERS = [
  {
    id: "user-1",
    name: "Ramesh Kumar",
    role: "farmer",
    phone: "9876543210",
    password: "123",
    location: "Kolar"
  },
  {
    id: "user-2",
    name: "Priya Sharma",
    role: "consumer",
    phone: "9123456780",
    password: "123",
    location: "Bengaluru"
  },
  {
    id: "user-3",
    name: "Vikram Singh",
    role: "transporter",
    phone: "9988776655",
    password: "123",
    location: "Bengaluru",
    vehicle: "Mini Truck (Bolero Pickup)"
  }
];

// Clean basic seed crops (minimal, essential fields only)
const INITIAL_CROPS = [
  {
    id: "crop-1",
    name: "Tomato",
    quantity: 500, // in kg
    pricePerKg: 22,
    location: "Kolar",
    harvestDate: "2026-09-22",
    farmerId: "user-1",
    farmerName: "Ramesh Kumar",
    farmerPhone: "9876543210",
    demandLevel: "High" // High / Medium / Low
  },
  {
    id: "crop-2",
    name: "Potato",
    quantity: 800,
    pricePerKg: 16,
    location: "Agra",
    harvestDate: "2026-09-20",
    farmerId: "user-1",
    farmerName: "Ramesh Kumar",
    farmerPhone: "9876543210",
    demandLevel: "Medium"
  },
  {
    id: "crop-3",
    name: "Onion",
    quantity: 600,
    pricePerKg: 26,
    location: "Nashik",
    harvestDate: "2026-09-21",
    farmerId: "user-1",
    farmerName: "Ramesh Kumar",
    farmerPhone: "9876543210",
    demandLevel: "High"
  }
];

// Basic seed orders
const INITIAL_ORDERS = [
  {
    id: "ORD-101",
    cropId: "crop-1",
    cropName: "Tomato",
    quantity: 25,
    unitPrice: 22,
    totalAmount: 550,
    farmerId: "user-1",
    farmerName: "Ramesh Kumar",
    farmerLocation: "Kolar",
    consumerId: "user-2",
    consumerName: "Priya Sharma",
    consumerPhone: "9123456780",
    deliveryAddress: "Flat 204, Green Heights, Bengaluru",
    status: "Confirmed", // 'Pending', 'Confirmed', 'In Transit', 'Delivered'
    transporterId: null,
    transporterName: null,
    orderDate: "2026-09-24",
    deliveryFee: 80
  },
  {
    id: "ORD-102",
    cropId: "crop-3",
    cropName: "Onion",
    quantity: 40,
    unitPrice: 26,
    totalAmount: 1040,
    farmerId: "user-1",
    farmerName: "Ramesh Kumar",
    farmerLocation: "Nashik",
    consumerId: "user-2",
    consumerName: "Priya Sharma",
    consumerPhone: "9123456780",
    deliveryAddress: "Koramangala 4th Block, Bengaluru",
    status: "In Transit",
    transporterId: "user-3",
    transporterName: "Vikram Singh (Mini Truck)",
    orderDate: "2026-09-23",
    deliveryFee: 120
  }
];

// AI Rule-Based Logic (Dual Role: Farmer Mandi Baseline vs Consumer Retail Savings)
const AI_RULES = {
  "tomato": {
    crop: "Tomato",
    demand: "High",
    baseMandiPrice: 19,
    suggestedPrice: 22,
    retailPrice: 33,
    farmerReason: "High Demand (+15.8% above wholesale mandi base)",
    consumerReason: "Direct Farm Fresh (Save ₹11/kg • 33% cheaper than retail supermarket)",
    reason: "High Demand (+15% recommendation)"
  },
  "onion": {
    crop: "Onion",
    demand: "High",
    baseMandiPrice: 23,
    suggestedPrice: 26,
    retailPrice: 40,
    farmerReason: "High Demand (+13.0% above wholesale mandi base)",
    consumerReason: "Direct Farm Fresh (Save ₹14/kg • 35% cheaper than retail supermarket)",
    reason: "High Demand (+15% recommendation)"
  },
  "potato": {
    crop: "Potato",
    demand: "Medium",
    baseMandiPrice: 14,
    suggestedPrice: 16,
    retailPrice: 24,
    farmerReason: "Medium Demand (Stable price +14.3% vs mandi)",
    consumerReason: "Direct Farm Fresh (Save ₹8/kg • 33% cheaper than retail supermarket)",
    reason: "Medium Demand (Stable price)"
  },
  "wheat": {
    crop: "Wheat",
    demand: "High",
    baseMandiPrice: 28,
    suggestedPrice: 32,
    retailPrice: 45,
    farmerReason: "High Demand (+14.3% above wholesale mandi base)",
    consumerReason: "Direct Farm Fresh (Save ₹13/kg • 29% cheaper than retail supermarket)",
    reason: "High Demand (+12% recommendation)"
  },
  "rice": {
    crop: "Rice",
    demand: "Medium",
    baseMandiPrice: 35,
    suggestedPrice: 38,
    retailPrice: 54,
    farmerReason: "Medium Demand (Fair pricing +8.6% vs mandi)",
    consumerReason: "Direct Farm Fresh (Save ₹16/kg • 30% cheaper than retail supermarket)",
    reason: "Medium Demand"
  }
};

const BASIC_INSIGHTS = {
  topCrop: "Tomato",
  averagePrice: "₹22/kg",
  highDemandAreas: "Delhi, Lucknow, Bengaluru",
  totalVolume: "1,900 kg",
  demandSummary: [
    { crop: "Tomato", demand: "High", icon: "📈", trend: "High Demand (+15%)", price: "₹22/kg" },
    { crop: "Onion", demand: "High", icon: "📈", trend: "High Demand (+15%)", price: "₹26/kg" },
    { crop: "Potato", demand: "Medium", icon: "⚡", trend: "Medium Demand (Stable)", price: "₹16/kg" }
  ]
};

// 7-day, 14-day, and 30-day Price Trend & Mandi Comparison Dataset
const CROP_HISTORICAL_DATA = {
  "tomato": {
    crop: "Tomato",
    emoji: "🍅",
    unit: "₹/kg",
    days7: {
      labels: ["Sep 19", "Sep 20", "Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25"],
      mandi: [17, 18, 17.5, 18.5, 19, 18.8, 19],
      direct: [20, 21, 21, 22, 22, 22, 22],
      retail: [28, 29, 30, 31, 32, 33, 33]
    },
    days14: {
      labels: ["Sep 12", "Sep 14", "Sep 16", "Sep 18", "Sep 20", "Sep 22", "Sep 25"],
      mandi: [16, 16.5, 17, 18, 18.5, 19, 19],
      direct: [19, 19.5, 20, 21, 22, 22, 22],
      retail: [26, 27, 28, 30, 31, 32, 33]
    },
    days30: {
      labels: ["Aug 26", "Sep 01", "Sep 06", "Sep 11", "Sep 16", "Sep 21", "Sep 25"],
      mandi: [15, 15.5, 16, 17, 18, 18.5, 19],
      direct: [18, 18.5, 19, 20, 21, 22, 22],
      retail: [24, 25, 27, 29, 30, 32, 33]
    },
    farmerPremium: "+15.8%",
    consumerSavings: "₹11 / kg (33% Saved)",
    demandIndex: 94,
    arrivalVolume: "420 Quintals",
    status: "Shortage Deficit (High Demand 🔥)"
  },
  "onion": {
    crop: "Onion",
    emoji: "🧅",
    unit: "₹/kg",
    days7: {
      labels: ["Sep 19", "Sep 20", "Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25"],
      mandi: [21, 21.5, 22, 22.5, 23, 23.2, 23],
      direct: [24, 24.5, 25, 25.5, 26, 26, 26],
      retail: [35, 36, 37, 38, 39, 40, 40]
    },
    days14: {
      labels: ["Sep 12", "Sep 14", "Sep 16", "Sep 18", "Sep 20", "Sep 22", "Sep 25"],
      mandi: [20, 20.5, 21, 22, 22.5, 23, 23],
      direct: [23, 23.5, 24, 25, 25.5, 26, 26],
      retail: [32, 34, 35, 37, 38, 39, 40]
    },
    days30: {
      labels: ["Aug 26", "Sep 01", "Sep 06", "Sep 11", "Sep 16", "Sep 21", "Sep 25"],
      mandi: [19, 19.5, 20, 21, 22, 22.5, 23],
      direct: [22, 22.5, 23, 24, 25, 25.8, 26],
      retail: [30, 31, 33, 35, 37, 39, 40]
    },
    farmerPremium: "+13.0%",
    consumerSavings: "₹14 / kg (35% Saved)",
    demandIndex: 89,
    arrivalVolume: "580 Quintals",
    status: "Festival Surge Demand 📈"
  },
  "potato": {
    crop: "Potato",
    emoji: "🥔",
    unit: "₹/kg",
    days7: {
      labels: ["Sep 19", "Sep 20", "Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25"],
      mandi: [13.5, 14, 13.8, 14, 14.2, 14, 14],
      direct: [15.5, 16, 16, 16, 16, 16, 16],
      retail: [22, 22, 23, 23, 24, 24, 24]
    },
    days14: {
      labels: ["Sep 12", "Sep 14", "Sep 16", "Sep 18", "Sep 20", "Sep 22", "Sep 25"],
      mandi: [13, 13.2, 13.5, 13.8, 14, 14, 14],
      direct: [15, 15.2, 15.5, 15.8, 16, 16, 16],
      retail: [20, 21, 22, 22, 23, 24, 24]
    },
    days30: {
      labels: ["Aug 26", "Sep 01", "Sep 06", "Sep 11", "Sep 16", "Sep 21", "Sep 25"],
      mandi: [12.5, 12.8, 13, 13.5, 13.8, 14, 14],
      direct: [14.5, 14.8, 15, 15.5, 15.8, 16, 16],
      retail: [19, 20, 21, 22, 23, 23.5, 24]
    },
    farmerPremium: "+14.3%",
    consumerSavings: "₹8 / kg (33% Saved)",
    demandIndex: 68,
    arrivalVolume: "920 Quintals",
    status: "Steady Cold-Storage Supply ⚡"
  },
  "wheat": {
    crop: "Wheat",
    emoji: "🌾",
    unit: "₹/kg",
    days7: {
      labels: ["Sep 19", "Sep 20", "Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25"],
      mandi: [27, 27.2, 27.5, 28, 28, 28.2, 28],
      direct: [30.5, 31, 31.5, 32, 32, 32, 32],
      retail: [42, 42, 43, 44, 44, 45, 45]
    },
    days14: {
      labels: ["Sep 12", "Sep 14", "Sep 16", "Sep 18", "Sep 20", "Sep 22", "Sep 25"],
      mandi: [26, 26.5, 27, 27.2, 27.8, 28, 28],
      direct: [29.5, 30, 30.5, 31, 31.8, 32, 32],
      retail: [39, 40, 41, 42, 43, 44, 45]
    },
    days30: {
      labels: ["Aug 26", "Sep 01", "Sep 06", "Sep 11", "Sep 16", "Sep 21", "Sep 25"],
      mandi: [25, 25.5, 26, 26.8, 27.4, 27.9, 28],
      direct: [28.5, 29, 29.5, 30.5, 31.2, 31.8, 32],
      retail: [37, 38, 39, 41, 42, 44, 45]
    },
    farmerPremium: "+14.3%",
    consumerSavings: "₹13 / kg (29% Saved)",
    demandIndex: 82,
    arrivalVolume: "640 Quintals",
    status: "Steady Mill Demand 📈"
  },
  "rice": {
    crop: "Rice",
    emoji: "🍚",
    unit: "₹/kg",
    days7: {
      labels: ["Sep 19", "Sep 20", "Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25"],
      mandi: [34, 34.5, 34.2, 35, 35, 35.2, 35],
      direct: [37, 37.5, 37.5, 38, 38, 38, 38],
      retail: [50, 51, 51, 52, 53, 53, 54]
    },
    days14: {
      labels: ["Sep 12", "Sep 14", "Sep 16", "Sep 18", "Sep 20", "Sep 22", "Sep 25"],
      mandi: [33, 33.5, 34, 34.2, 34.8, 35, 35],
      direct: [36, 36.5, 37, 37.2, 37.8, 38, 38],
      retail: [48, 49, 50, 51, 52, 53, 54]
    },
    days30: {
      labels: ["Aug 26", "Sep 01", "Sep 06", "Sep 11", "Sep 16", "Sep 21", "Sep 25"],
      mandi: [32, 32.5, 33, 33.8, 34.2, 34.8, 35],
      direct: [35, 35.5, 36, 36.8, 37.2, 37.8, 38],
      retail: [46, 47, 48, 50, 51, 53, 54]
    },
    farmerPremium: "+8.6%",
    consumerSavings: "₹16 / kg (30% Saved)",
    demandIndex: 74,
    arrivalVolume: "780 Quintals",
    status: "Balanced Harvest Supply ⚡"
  }
};

// Regional Consumption & Mandi Arbitrage Intelligence
const REGIONAL_MARKET_DATA = [
  {
    region: "Bengaluru & South",
    mandis: "Yeshwanthpur & Kolar Mandi",
    topCrop: "Tomato",
    mandiPrice: "₹19 / kg",
    directPrice: "₹22 / kg",
    retailPrice: "₹33 / kg",
    farmerGain: "+15.8%",
    savings: "₹11 / kg (33%)",
    demandLevel: "High",
    demandIndex: 94
  },
  {
    region: "Delhi NCR & North",
    mandis: "Azadpur Mandi & Ghazipur",
    topCrop: "Onion",
    mandiPrice: "₹23 / kg",
    directPrice: "₹26 / kg",
    retailPrice: "₹40 / kg",
    farmerGain: "+13.0%",
    savings: "₹14 / kg (35%)",
    demandLevel: "High",
    demandIndex: 91
  },
  {
    region: "Lucknow & Central UP",
    mandis: "Dubagga Mandi & Sitapur",
    topCrop: "Potato",
    mandiPrice: "₹14 / kg",
    directPrice: "₹16 / kg",
    retailPrice: "₹24 / kg",
    farmerGain: "+14.3%",
    savings: "₹8 / kg (33%)",
    demandLevel: "Medium",
    demandIndex: 72
  },
  {
    region: "Nashik & West India",
    mandis: "Lasalgaon & Pimpalgaon",
    topCrop: "Onion",
    mandiPrice: "₹22 / kg",
    directPrice: "₹25 / kg",
    retailPrice: "₹38 / kg",
    farmerGain: "+13.6%",
    savings: "₹13 / kg (34%)",
    demandLevel: "High",
    demandIndex: 88
  }
];
