const express = require('express');
const { fetch } = require('cross-fetch');

const app = express();

const todos = [];

app.get('/todos', (req, res) => {
    res.json(todos);
});

app.post('/todo', (req, res) => {
    const todo = {
        id: todos.length,
        ...req.body,
    };
    todos.push(todo);
    fetch('http://localhost:4000/webhooks/todo_added', {
        method: 'POST',
        body: JSON.stringify(todo),
    }).catch(console.error);
    res.json(todo);
});

app.listen(4001);