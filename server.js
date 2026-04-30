require('dotenv').config({ path: 'C:/startup/.env' });
global.fetch = require('node-fetch');
const cron = require('node-cron');
const fastify = require('fastify')({ logger: true });
const fs = require('fs');
const path = require('path');
const { getListByName, getTasks, appendToDescription, setTaskStatusDone } = require('./clickup');
const { handleTask } = require('./taskHandler');

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
  try {
    const allTasks = await getTasks();
    const newAITasks = allTasks.filter(task => 
      task.name.toLowerCase().includes('ai') && !processedTasks.includes(task.id)
    );

    for (const task of newAITasks) {
      await handleTask(task);
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
    await fastify.listen({ port: 5000 });
    console.log('Server listening on http://localhost:5000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
