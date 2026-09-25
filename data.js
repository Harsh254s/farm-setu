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

// AI Rule-Based Logic
const AI_RULES = {
  "tomato": {
    crop: "Tomato",
    demand: "High",
    baseMandiPrice: 19,
    suggestedPrice: 22,
    reason: "High Demand (+15% recommendation)"
  },
  "onion": {
    crop: "Onion",
    demand: "High",
    baseMandiPrice: 23,
    suggestedPrice: 26,
    reason: "High Demand (+15% recommendation)"
  },
  "potato": {
    crop: "Potato",
    demand: "Medium",
    baseMandiPrice: 14,
    suggestedPrice: 16,
    reason: "Medium Demand (Stable price)"
  },
  "wheat": {
    crop: "Wheat",
    demand: "High",
    baseMandiPrice: 28,
    suggestedPrice: 32,
    reason: "High Demand (+12% recommendation)"
  },
  "rice": {
    crop: "Rice",
    demand: "Medium",
    baseMandiPrice: 35,
    suggestedPrice: 38,
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
