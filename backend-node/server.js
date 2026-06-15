const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Task = require('./models/Task');

const app = express();
app.use(cors());
app.use(express.json());
mongoose.set('debug', true);

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ Node.js Connected to MongoDB successfully!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// --- REST API CRUD ENDPOINTS ---

// 1. CREATE: Add a new task item
app.post('/api/node/tasks', async (req, res) => {
    try {
        const lastTask = await Task.findOne().sort({ id: -1 });
        const nextId = lastTask ? lastTask.id + 1 : 1;

        const newTask = new Task({ ...req.body, id: nextId });
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 2. READ: Get all tasks for the dashboard grids
app.get('/api/node/tasks', async (req, res) => {
    try {
        const tasks = await Task.find();
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. UPDATE: Change pipeline statuses (e.g., TODO -> DONE) or edit details
app.put('/api/node/tasks/:id', async (req, res) => {
    try {
        const updatedTask = await Task.findOneAndUpdate(
            { id: req.params.id }, 
            { ...req.body, updatedAt: Date.now() }, 
            { new: true }
        );
        if (!updatedTask) return res.status(404).json({ message: "Task not found" });
        res.json(updatedTask);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 4. DELETE: Erase a task item from MongoDB completely
app.delete('/api/node/tasks/:id', async (req, res) => {
    try {
        const deletedTask = await Task.findOneAndDelete({ id: req.params.id });
        if (!deletedTask) return res.status(404).json({ message: "Task not found" });
        res.json({ message: "Task successfully dropped from MongoDB" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Node.js Server humming on port ${PORT}`));