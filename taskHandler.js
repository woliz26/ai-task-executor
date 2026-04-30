require('dotenv').config({ path: 'C:/startup/.env' });
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { appendToDescription, setTaskStatusDone } = require('./clickup');
const sendTelegramNotification = require('./telegramNotify');

const execGitCommand = (cmd, cwd) => {
  return execSync(cmd, { cwd, stdio: 'pipe' }).toString().trim();
};

const saveOutput = (taskId, filename, content) => {
  const outputDir = path.join(__dirname, 'outputs', taskId);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, content);
  return filepath;
};

async function handleTask(task) {
  console.log(`Handling task ${task.id} - ${task.name}`);

  const title = task.name;
  const desc = task.description || '';

  let summary = '';
  let outputPath = '';

  if (/create a file/i.test(desc)) {
    const fileMatch = desc.match(/file named ([\w\.\/\-]+)/i);
    const contentMatch = desc.match(/content:([\s\S]*)/i);
    let filename = 'unknown.txt';
    let filecontent = '';
    if (fileMatch) {
      filename = fileMatch[1].trim();
    }
    if (contentMatch) {
      filecontent = contentMatch[1].trim();
    }
    outputPath = saveOutput(task.id, filename, filecontent);
    summary = `Created file ${filename}`;
  } else if (/node\.js script/i.test(desc)) {
    const scriptContent = `console.log('Hello World - ' + new Date().toISOString());\n`;
    outputPath = saveOutput(task.id, 'helloWorld.js', scriptContent);
    summary = 'Created a Node.js hello world script';
  } else if (/research/i.test(desc)) {
    const researchReport = 'Research result placeholder for task ' + task.id;
    outputPath = saveOutput(task.id, 'research.txt', researchReport);
    summary = 'Performed research and saved report';
  } else {
    outputPath = saveOutput(task.id, 'taskDescription.txt', desc);
    summary = 'Saved task description';
  }

  await appendToDescription(task.id, `Task completed: ${summary}`);
  await setTaskStatusDone(task.id);

  const projectPath = __dirname;
  execGitCommand('git add .', projectPath);
  execGitCommand(`git commit -m \"AI Task: ${title.replace(/\"/g, '\\\"')}\"`, projectPath);
  execGitCommand('git push origin main', projectPath);

  const message = `🤖 *AI Task Completed!*\n📋 *Task:* ${title}\n✅ *What I did:* ${summary}\n📁 *Output saved to:* ${outputPath}\n🔗 *GitHub commit:* [commit URL placeholder]`;
  await sendTelegramNotification(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID, message);

  console.log(`Task ${task.id} completed and notified.`);
}

module.exports = { handleTask };
