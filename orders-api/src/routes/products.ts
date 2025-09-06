import { Router } from 'express';
import { Database } from '../database';

const router = Router();
const db = new Database();

router.post('/', async (req, res) => {
  const { sku, name, price_cents, stock } = req.body;
  try {
    const result = await db.query('INSERT INTO products (sku, name, price_cents, stock) VALUES (?, ?, ?, ?)', [sku, name, price_cents, stock]);
    res.status(201).json({ id: (result as any).insertId });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { price_cents, stock } = req.body;
  try {
    await db.query('UPDATE products SET price_cents = ?, stock = ? WHERE id = ?', [price_cents, stock, id]);
    res.json({ message: 'Product updated' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json((rows as any[])[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  const { search, cursor, limit } = req.query;
  try {
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];
    if (search) {
      sql += ' AND (name LIKE ? OR sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (cursor && !isNaN(parseInt(cursor as string))) {
      sql += ' AND id > ?';
      params.push(parseInt(cursor as string));
    }
    sql += ' ORDER BY id LIMIT ?';
    const limitNum = parseInt(limit as string) || 10;
    params.push(Math.min(limitNum, 100));
    const rows = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
