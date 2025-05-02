const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  paymentTransaction: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PaymentTransaction', 
  },
  customer: { type: String },
  phone: { type: String},
  stripePaymentIntentId: {
    type: String, 
    required: false 
  },
  items: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  deliverylocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    },
  },
  deliveryAddress: { type: String, required: false },
  deliveryTime: { type: Date},
  deliveryType: { type: String, enum: ['pickup', 'delivery'], required: true, default: 'delivery' },
  specialInstructions: { type: String, required: false },
  paymentMethod: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;
