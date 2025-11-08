const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company: { type: String, default: "Not specified" },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: "Not specified" },
  zip: { type: String, default: "Not specified" },
  auth0Id: { type: String, unique: true, sparse: true },
  profilePicture: { type: String },
  planType: { type: String },
  selectedPlan: {
    name: { type: String },
    price: { type: String },
    period: { type: String }
  },
  stripeCustomerId: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema); 