const express = require('express');
const { fetch } = require('@whatwg-node/fetch');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const todos = [];

app.get('/todos', (req, res) => {
  res.json(todos);
});

app.post('/todo', async (req, res) => {
  const todo = {
    id: todos.length,
    ...req.body,
  };
  todos.push(todo);
  await fetch('http://localhost:4000/webhooks/todo_added', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(todo),
  }).catch(console.log);
  res.json(todo);
});

app.listen(4002);
