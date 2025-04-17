const mongoose = require('mongoose');

const notificationsSchema = new mongoose.Schema({
    type: {
        type: Number,
    },
    description: {
        type: String,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    investorId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    createdFor: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Notifications', notificationsSchema);
