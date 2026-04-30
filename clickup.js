require('dotenv').config({ path: 'C:/startup/.env' });
const fetch = require('node-fetch').default || require('node-fetch');
console.log('fetch type:', typeof fetch);

const API_TOKEN = process.env.CLICKUP_API_TOKEN;
const BASE_URL = 'https://api.clickup.com/api/v2';

async function getListByName(listName) {
  const teamsUrl = `${BASE_URL}/team`;
  const teamsResponse = await fetch(teamsUrl, { headers: { Authorization: API_TOKEN } });
  if (!teamsResponse.ok) throw new Error('Failed to fetch teams/workspaces from ClickUp');
  const teamsData = await teamsResponse.json();

  for (const team of teamsData.teams) {
    const foldersUrl = `${BASE_URL}/team/${team.id}/folder`;
    const foldersResponse = await fetch(foldersUrl, { headers: { Authorization: API_TOKEN } });
    if (!foldersResponse.ok) continue;
    const foldersData = await foldersResponse.json();

    for (const folder of foldersData.folders) {
      const listsUrl = `${BASE_URL}/folder/${folder.id}/list`;
      const listsResponse = await fetch(listsUrl, { headers: { Authorization: API_TOKEN } });
      if (!listsResponse.ok) continue;
      const listsData = await listsResponse.json();
      for (const list of listsData.lists) {
        if (list.name.toLowerCase() === listName.toLowerCase()) {
          return list.id;
        }
      }
    }

    const directListsUrl = `${BASE_URL}/team/${team.id}/list`;
    const directListsResponse = await fetch(directListsUrl, { headers: { Authorization: API_TOKEN } });
    if (!directListsResponse.ok) continue;
    const directListsData = await directListsResponse.json();
    for (const list of directListsData.lists) {
      if (list.name.toLowerCase() === listName.toLowerCase()) {
        return list.id;
      }
    }
  }

  return null;
}

async function getTasks() {
  const listId = await getListByName('AI Tasks');
  if (!listId) {
    console.error("ClickUp list 'AI Tasks' not found");
    return [];
  }
  const url = `${BASE_URL}/list/${listId}/task`;
  const response = await fetch(url, { headers: { Authorization: API_TOKEN } });
  if (!response.ok) {
    throw new Error('Failed to fetch tasks from ClickUp');
  }
  const data = await response.json();
  return data.tasks || [];
}

async function appendToDescription(taskId, newText) {
  const taskResponse = await fetch(`${BASE_URL}/task/${taskId}`, { headers: { Authorization: API_TOKEN } });
  if (!taskResponse.ok) {
    throw new Error('Failed to fetch task data for description append');
  }
  const task = await taskResponse.json();
  const existingDescription = task.description || '';

  const updatedDescription = `${existingDescription}\n\n--- AI EXECUTION RESULT ---\n${newText}`;

  const updateResponse = await fetch(`${BASE_URL}/task/${taskId}`, {
    method: 'PUT',
    headers: {
      Authorization: API_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ description: updatedDescription })
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    throw new Error(`Failed to update description: ${JSON.stringify(error)}`);
  }

  return await updateResponse.json();
}

async function setTaskStatusDone(taskId) {
  const taskUrl = `${BASE_URL}/task/${taskId}`;
  const taskResponse = await fetch(taskUrl, { headers: { Authorization: API_TOKEN } });

  if (!taskResponse.ok) {
    throw new Error('Failed to fetch task details for status update');
  }
  const task = await taskResponse.json();
  const listId = task.list.id;

  const listUrl = `${BASE_URL}/list/${listId}`;
  const listResponse = await fetch(listUrl, { headers: { Authorization: API_TOKEN } });
  if (!listResponse.ok) {
    throw new Error('Failed to fetch list details for status update');
  }
  const list = await listResponse.json();
  const statuses = list.statuses.map(s => s.status.toLowerCase());

  const desiredStatuses = ['done', 'complete', 'completed', 'closed'];
  let matchedStatus = null;
  for (const ds of desiredStatuses) {
    const found = list.statuses.find(s => s.status.toLowerCase() === ds);
    if (found) {
      matchedStatus = found.status;
      break;
    }
  }

  if (!matchedStatus) {
    console.log('No standard done status found in list. Trying each status until success...');
    for (const status of list.statuses) {
      try {
        const updateResponse = await fetch(taskUrl, {
          method: 'PUT',
          headers: {
            Authorization: API_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: status.status })
        });
        if (updateResponse.ok) {
          matchedStatus = status.status;
          break;
        }
      } catch {}
    }
  } else {
    const updateResponse = await fetch(taskUrl, {
      method: 'PUT',
      headers: {
        Authorization: API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: matchedStatus })
    });
    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(`Failed to update task status: ${JSON.stringify(error)}`);
    }
  }

  if (!matchedStatus) {
    throw new Error('Failed to find any working status to set the task as done');
  }

  console.log(`Task status set to '${matchedStatus}'`);
  return { status: matchedStatus };
}

async function getStatuses(listId) {
  const response = await fetch(`${BASE_URL}/list/${listId}`, {
    headers: { Authorization: API_TOKEN }
  });
  if (!response.ok) throw new Error('Failed to fetch list statuses');
  const data = await response.json();
  return data.statuses || [];
}

module.exports = { getListByName, getTasks, appendToDescription, setTaskStatusDone, getStatuses };