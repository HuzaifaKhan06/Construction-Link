const express    = require('express');
const connection = require('../db');
const router     = express.Router();

router.use(express.json());

// POST /api/projects — create new project
router.post('/', (req, res) => {
  const { name, user_id } = req.body;
  if (!name || !user_id) {
    return res.status(400).json({ error: 'Project name and user_id required' });
  }
  connection.query(
    'INSERT INTO projects (name, json_data, user_id) VALUES (?, ?, ?)',
    [ name, '{}', user_id ],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: result.insertId, name });
    }
  );
});

// GET /api/projects?user_id=… — list projects for this user
router.get('/', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id query parameter required' });
  }
  connection.query(
    'SELECT id, name, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
    [ user_id ],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// GET /api/projects/:id?user_id=… — fetch one project, only if owned
router.get('/:id', (req, res) => {
  const { id }      = req.params;
  const user_id     = req.query.user_id;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id query parameter required' });
  }
  connection.query(
    'SELECT id, name, json_data FROM projects WHERE id = ? AND user_id = ?',
    [ id, user_id ],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!rows.length) {
        return res.status(404).json({ error: 'Project not found or not yours' });
      }
      res.json(rows[0]);
    }
  );
});

// PUT /api/projects/:id — update project JSON, only if owned
router.put('/:id', (req, res) => {
  const { id }        = req.params;
  const { json_data, user_id } = req.body;
  if (json_data === undefined || !user_id) {
    return res.status(400).json({ error: 'json_data and user_id required' });
  }
  let jsonString;
  try {
    jsonString = JSON.stringify(json_data);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON data' });
  }
  connection.query(
    'UPDATE projects SET json_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [ jsonString, id, user_id ],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Project not found or not yours' });
      }
      res.json({ message: 'Project updated' });
    }
  );
});

module.exports = router;
