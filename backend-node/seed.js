const mongoose = require('mongoose');
require('dotenv').config();

// REMOVED 'id: Number' to prevent unique index collisions
const TaskSchema = new mongoose.Schema({
    title: String,
    description: String,
    status: String,
    priority: String,
    assignee: String,
    codingFilePath: String,
    createdBy: String,
    dueDate: String,
    updatedAt: { type: Date, default: Date.now }
});

const Task = mongoose.model('Task', TaskSchema);

const tasks = [
  { title: "Setup project repository", status: "DONE", priority: "HIGH", description: "Initialize monorepo" },
  { title: "Design database schema", status: "DONE", priority: "HIGH", description: "PostgreSQL schema" },
  { title: "Implement JWT auth", status: "IN_PROGRESS", priority: "URGENT", description: "Spring Security" },
  { title: "API Gateway Routing", status: "TODO", priority: "URGENT", description: "FastAPI setup" },
  { title: "User Authentication", status: "TODO", priority: "HIGH", description: "React login flow" },
  { title: "Database Migration", status: "REVIEW", priority: "MEDIUM", description: "Sync SQL and NoSQL" },
  { title: "Frontend UI/UX", status: "IN_PROGRESS", priority: "LOW", description: "Tailwind styling" },
  { title: "Unit Testing", status: "TODO", priority: "MEDIUM", description: "Jest coverage" }
];

async function runSeeder() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("🌱 Connected to MongoDB Atlas Cloud!");
        
        await Task.deleteMany({});
        console.log("Cleaning old tasks...");
        
        await Task.insertMany(tasks);
        console.log("🚀 All 8 tasks seeded successfully!");
        
    } catch (err) {
        console.error("Seeding error:", err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

runSeeder();