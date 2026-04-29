const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

async function createRepo() {
  const token = process.env.GITHUB_TOKEN;
  const repoName = 'ai-task-executor';

  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: repoName,
      private: false
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create repo: ${error}`);
  }

  const data = await response.json();
  console.log(`Repo created: ${data.html_url}`);
}

createRepo().catch(err => {
  console.error(err);
  process.exit(1);
});
