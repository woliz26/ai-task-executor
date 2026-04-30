const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { appendToDescription, setTaskStatusDone, getStatuses } = require('./clickup');
const sendTelegramNotification = require('./telegramNotify');

const execGitCommand = (cmd, cwd) => {
  return execSync(cmd, { cwd, stdio: 'pipe' }).toString().trim();
};

async function handleTask(task) {
  console.log(`Handling task ${task.id} - ${task.name}`);

  const title = task.name;
  const description = task.description || '';

  let summary = '';
let outputFiles = [];

const outputDir = path.join(__dirname, 'outputs', task.id);
fs.mkdirSync(outputDir, { recursive: true });

function extractFilename(text) {
  const match = text.match(/([a-zA-Z0-9-_]+\.(js|json|txt|md|html|css))/i);
  return match ? match[1] : null;
}

function generateContent(title, description) {

  const text = (title + ' ' + description).toLowerCase();

  // Node.js API
  if (text.includes('api')) {
    return {
      filename: 'generated-api.js',
      content: `
        const express = require('express');

        const app = express();

        app.get('/', (req, res) => {
          res.json({
            status: 'ok',
            generated: true
          });
        });

        app.listen(3000, () => {
          console.log('Generated API running');
        });
      `
    };
  }

  // Utility module
  if (text.includes('utility') || text.includes('helper')) {
    return {
      filename: 'utility.js',
      content: `
        function helper() {
          return 'Utility function';
        }

        module.exports = {
          helper
        };
      `
    };
  }

  // JSON config
  if (text.includes('config')) {
    return {
      filename: 'config.json',
      content: JSON.stringify({
        generated: true,
        createdAt: new Date().toISOString(),
        project: title
      }, null, 2)
    };
  }

  // HTML page
  if (text.includes('landing page') || text.includes('html')) {
    return {
      filename: 'index.html',
      content: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Generated Page</title>
          </head>
          <body>
            <h1>${title}</h1>
            <p>${description}</p>
          </body>
          </html>
        `
    };
  }

  // Default fallback
  return {
    filename: 'task-output.txt',
    content: `
      Task Title:
      ${title}

      Task Description:
      ${description}
    `
  };
}

const generated = generateContent(title, description);

const filename =
  extractFilename(description) ||
  extractFilename(title) ||
  generated.filename;

const outputPath = path.join(outputDir, filename);

fs.writeFileSync(outputPath, generated.content);

summary = `Generated ${filename} from task instructions`;

outputFiles.push({
  path: outputPath
});

  // Update ClickUp task description
  await appendToDescription(task.id, `Task completed: ${summary}`);

  // Find the French "Achevé" status
  const statuses = await getStatuses(task.list.id);
  console.log('Available statuses:', statuses);
  const doneStatus = statuses.find(s => s.status.toLowerCase() === 'achevé');
  if (doneStatus) {
    await setTaskStatusDone(task.id);
  } else {
    console.log('Achevé status not found, using default');
    await setTaskStatusDone(task.id);
  }

  // Git commit and push with real commit URL
  const projectPath = path.resolve(__dirname);
  execGitCommand('git add .', projectPath);
  execGitCommand(`git commit -m \"AI Task: ${title.replace(/\"/g, '\\"')}\"`, projectPath);
  const pushOutput = execGitCommand('git push origin main', projectPath);
  const commitUrlMatch = pushOutput.match(/https:\/\/github.com\/[^\s]+\/commit\/\w+/);
  const commitUrl = commitUrlMatch ? commitUrlMatch[0] : 'commit URL placeholder';

  const message = `🤖 *AI Task Completed!*\n📋 *Task:* ${title}\n✅ *What I did:* ${summary}\n📁 *Output saved to:* ${outputFiles.map(f => f.path).join(', ')}\n🔗 *GitHub commit:* ${commitUrl}`;
  await sendTelegramNotification(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID, message);

}

module.exports = { handleTask };
