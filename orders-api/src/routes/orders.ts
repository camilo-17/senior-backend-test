import { Router } from 'express';
import { Database } from '../database';

const router = Router();
const db = new Database();

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const orderRows = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
    if ((orderRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = (orderRows as any[])[0];
    const itemRows = await db.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    order.items = itemRows;
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  const { status, from, to, cursor, limit } = req.query;
  try {
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params: any[] = [];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (from) {
      sql += ' AND created_at >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND created_at <= ?';
      params.push(to);
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
