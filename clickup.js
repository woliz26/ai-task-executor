const fetch = require('node-fetch');

class ClickUp {
  constructor(apiToken, listId) {
    this.apiToken = apiToken;
    this.listId = listId;
    this.baseUrl = 'https://api.clickup.com/api/v2';
  }

  async getTasks() {
    const url = `${this.baseUrl}/list/${this.listId}/task`;
    const response = await fetch(url, {
      headers: {
        Authorization: this.apiToken
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch tasks from ClickUp');
    }
    const data = await response.json();
    return data.tasks || [];
  }

  async addComment(taskId, comment) {
    const url = `${this.baseUrl}/task/${taskId}/comment`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comment })
    });
    if (!response.ok) {
      throw new Error('Failed to add comment to task');
    }
    return response.json();
  }

  async setTaskStatusDone(taskId) {
    const url = `${this.baseUrl}/task/${taskId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: this.apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'done' })
    });
    if (!response.ok) {
      throw new Error('Failed to update task status');
    }
    return response.json();
  }
}

module.exports = ClickUp;
