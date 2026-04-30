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

  // Parse the description to find instructions
  if (/create a file named ([^\s]+) with content:(.*)/is.test(description)) {
    const match = description.match(/create a file named ([^\s]+) with content:(.*)/is);
    const filename = match[1].trim();
    const content = match[2].trim();
    const filepath = path.resolve(__dirname, filename);
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, content);
    summary = `Created file ${filename}`;
    outputFiles.push({ path: filepath, content });
  } else if (/write node\.js script named ([^\s]+) with content:(.*)/is.test(description)) {
    const match = description.match(/write node\.js script named ([^\s]+) with content:(.*)/is);
    const filename = match[1].trim();
    const content = match[2].trim();
    const filepath = path.resolve(__dirname, filename);
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, content);
    summary = `Wrote Node.js script ${filename}`;
    outputFiles.push({ path: filepath, content });
  } else if (/scan folder ([^\s]+) for files named ([^\s]+)/is.test(description)) {
    const match = description.match(/scan folder ([^\s]+) for files named ([^\s]+)/is);
    const folder = path.resolve(__dirname, match[1].trim());
    const pattern = match[2].trim();
    const files = fs.readdirSync(folder).filter(f => f.includes(pattern));
    const outputPath = path.resolve(__dirname, 'scan_results.txt');
    fs.writeFileSync(outputPath, files.join('\n'));
    summary = `Scanned folder and listed files matching '${pattern}'`;
    outputFiles.push({ path: outputPath, content: files.join('\n') });
  } else {
    const outputPath = path.resolve(__dirname, 'task_description.txt');
    fs.writeFileSync(outputPath, description);
    summary = 'Saved task description as fallback';
    outputFiles.push({ path: outputPath, content: description });
  }

  // Update ClickUp task description
  await appendToDescription(task.id, `Task completed: ${summary}`);

  // Find the French "Achevé" status
  const statuses = await getStatuses(task.list.id);
  console.log('Available statuses:', statuses);
  const doneStatus = statuses.find(s => s.status.toLowerCase() === 'achevé');
  if (doneStatus) {
    await setTaskStatusDone(task.id, doneStatus.id);
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

  console.log(`Task ${task.id} completed and notified.`);
}

module.exports = { handleTask };
