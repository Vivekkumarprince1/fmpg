const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['CREATE_PROPERTY', 'UPDATE_PROPERTY', 'DELETE_PROPERTY', 'CONFIRM_OWNER', 'REJECT_OWNER', 'UPDATE_SETTINGS', 'DELETE_USER']
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    targetType: {
        type: String,
        required: true,
        enum: ['Property', 'Owner', 'User', 'Settings']
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
