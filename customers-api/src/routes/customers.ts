import { Router } from 'express';
import { Database } from '../database';

const router = Router();
const db = new Database();

router.post('/', async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const result = await db.query('INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)', [name, email, phone]);
    res.status(201).json({ id: (result as any).insertId });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await db.query('SELECT * FROM customers WHERE id = ?', [id]);
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json((rows as any[])[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  const { search, cursor, limit } = req.query;
  try {
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];
    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (cursor && !isNaN(parseInt(cursor as string))) {
      sql += ' AND id > ?';
      params.push(parseInt(cursor as string));
    }
    sql += ' ORDER BY id LIMIT ?';
    const limitNum = parseInt(limit as string) || 10;
    params.push(`${Math.min(limitNum, 100)}`);
    
    const rows = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  try {
    await db.query('UPDATE customers SET name = ?, email = ?, phone = ? WHERE id = ?', [name, email, phone, id]);
    res.json({ message: 'Customer updated' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.substring(7);
  if (token !== process.env.SERVICE_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.get('/internal/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await db.query('SELECT * FROM customers WHERE id = ?', [id]);
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json((rows as any[])[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
