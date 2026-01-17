const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database('./data.sqlite');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY, userId INTEGER, date TEXT, name TEXT, cal INTEGER)`);
});

function runAsync(sql, params=[]) {
  return new Promise((res, rej) => db.run(sql, params, function(err){ if(err) rej(err); else res(this); }));
}
function getAsync(sql, params=[]) {
  return new Promise((res, rej) => db.get(sql, params, (err,row)=> err ? rej(err) : res(row)));
}
function allAsync(sql, params=[]) {
  return new Promise((res, rej) => db.all(sql, params, (err,rows)=> err ? rej(err) : res(rows)));
}

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await runAsync('INSERT INTO users (username, password) VALUES (?,?)', [username, hash]);
    res.json({ ok: true });
  } catch(e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/login', async (req,res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const user = await getAsync('SELECT * FROM users WHERE username = ?', [username]);
    if(!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

function authMiddleware(req,res,next){
  const h = req.headers.authorization;
  if(!h) return res.status(401).json({ error: 'missing token' });
  const parts = h.split(' ');
  if(parts.length !==2) return res.status(401).json({ error: 'invalid auth header' });
  const token = parts[1];
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch(e){ return res.status(401).json({ error: 'invalid token' }); }
}

app.get('/api/entries', authMiddleware, async (req,res) => {
  try{
    const rows = await allAsync('SELECT id, date, name, cal FROM entries WHERE userId = ? ORDER BY date DESC, id DESC', [req.user.userId]);
    res.json(rows);
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.post('/api/entries', authMiddleware, async (req,res) => {
  const { date, name, cal } = req.body;
  if(!date || !name || typeof cal !== 'number') return res.status(400).json({ error: 'invalid payload' });
  try{
    const info = await runAsync('INSERT INTO entries (userId, date, name, cal) VALUES (?,?,?,?)', [req.user.userId, date, name, cal]);
    res.json({ id: info.lastID });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.put('/api/entries/:id', authMiddleware, async (req,res) => {
  const id = Number(req.params.id);
  const { date, name, cal } = req.body;
  try{
    await runAsync('UPDATE entries SET date=?, name=?, cal=? WHERE id=? AND userId=?', [date, name, cal, id, req.user.userId]);
    res.json({ ok:true });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.delete('/api/entries/:id', authMiddleware, async (req,res) => {
  const id = Number(req.params.id);
  try{
    await runAsync('DELETE FROM entries WHERE id=? AND userId=?', [id, req.user.userId]);
    res.json({ ok:true });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.listen(PORT, ()=> console.log(`Server listening on http://localhost:${PORT}`));
