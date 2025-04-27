// routes/projects.js
const express    = require('express');
const connection = require('../db');   // ← make sure this path is correct
const router     = express.Router();

router.use(express.json());

router.post('/', (req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Project name required' });
    }
    connection.query(
      'INSERT INTO projects (name, json_data) VALUES (?, ?)',
      [ name, '{}' ],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ id: result.insertId, name });
      }
    );
  });
  
  // GET /api/projects — list all projects
  router.get('/', (req, res) => {
    connection.query(
      'SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC',
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
      }
    );
  });
  
  // GET /api/projects/:id — fetch one project
  router.get('/:id', (req, res) => {
    const { id } = req.params;
    connection.query(
      'SELECT id, name, json_data FROM projects WHERE id = ?',
      [ id ],
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }
        if (!rows.length) {
          return res.status(404).json({ error: 'Project not found' });
        }
        res.json(rows[0]);
      }
    );
  });
  
  // PUT /api/projects/:id — update project JSON
  router.put('/:id', (req, res) => {
    const { id }       = req.params;
    const { json_data } = req.body;
  
    if (json_data === undefined) {
      return res.status(400).json({ error: 'json_data required' });
    }
  
    let jsonString;
    try {
      jsonString = JSON.stringify(json_data);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON data' });
    }
  
    connection.query(
      'UPDATE projects SET json_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [ jsonString, id ],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ message: 'Project updated' });
      }
    );
  });
  
  module.exports = router;