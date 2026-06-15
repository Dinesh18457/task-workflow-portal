const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: String,
    description: String,
    status: String,
    priority: String,
    // REMOVE the id field entirely so MongoDB manages it automatically
    assignee: String,
    codingFilePath: String,
    createdBy: String,
    dueDate: String,
    updatedAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Task', TaskSchema);