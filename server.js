// server.js - Entry point + scheduler

require('dotenv').config();
const cron = require('node-cron');
const fastify = require('fastify')({ logger: true });
const taskHandler = require('./taskHandler');
const fs = require('fs');
const path = require('path');

const processedFilePath = path.join(__dirname, 'processed.json');

// Load processed task IDs or initialize
let processedTasks = [];
if (fs.existsSync(processedFilePath)) {
  processedTasks = JSON.parse(fs.readFileSync(processedFilePath, 'utf8'));
} else {
  fs.writeFileSync(processedFilePath, JSON.stringify([]));
}

// Function to save processed tasks to disk
function saveProcessedTasks() {
  fs.writeFileSync(processedFilePath, JSON.stringify(processedTasks, null, 2));
}

async function pollTasks() {
  const ClickUp = require('./clickup'); // We'll implement clickup.js wrapper with built-in skill
  const clickup = new ClickUp(process.env.CLICKUP_API_TOKEN, process.env.CLICKUP_LIST_ID);

  try {
    const allTasks = await clickup.getTasks();
    const newAITasks = allTasks.filter(task => 
      task.name.toLowerCase().includes('ai') && !processedTasks.includes(task.id)
    );

    for (const task of newAITasks) {
      await taskHandler.handleTask(task);
      processedTasks.push(task.id);
      saveProcessedTasks();
    }
  } catch (err) {
    console.error('Error polling tasks:', err);
  }
}

// Schedule polling every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Polling ClickUp for AI tasks...');
  pollTasks();
});

// Fastify status route
fastify.get('/status', async (request, reply) => {
  const status = {
    lastPollTime: new Date().toISOString(),
    totalTasksProcessed: processedTasks.length,
    processedTasks
  };
  reply.send(status);
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Server listening on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
