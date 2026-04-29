# AI Task Executor

This project polls ClickUp every 5 minutes for tasks containing "AI" in their title.

## Features
- Automatic detection of AI-related tasks from ClickUp
- Autonomous task interpretation and execution
- Git commit and push after task completion
- Telegram notification for completed tasks
- Keeps track of processed tasks
- Provides status endpoint on port 3000

## Environment Variables
- CLICKUP_API_TOKEN
- CLICKUP_LIST_ID
- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHAT_ID
- GITHUB_TOKEN

## Usage
```bash
npm install
npm start
```

## TODO
- Implement full task understanding and execution in taskHandler.js
- Improve error handling and logging
- Add tests

Project folder structure:
- server.js
- taskHandler.js
- processed.json
- package.json
- README.md
- outputs/[task-id]/ (created dynamically)
