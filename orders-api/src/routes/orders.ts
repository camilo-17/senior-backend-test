import { Router } from 'express';
import 'dotenv/config';
import { Database } from '../database';

const router = Router();
const db = new Database();

router.post('/', async (req, res, next) => {
  const { customer_id, items } = req.body;
  if (!customer_id || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const conn = await db.connect();
  await conn.beginTransaction();
  try {
    const customerResponse = await fetch(`${process.env.CUSTOMERS_API_BASE}/customers/internal/${customer_id}`, {
      headers: { Authorization: `Bearer ${process.env.SERVICE_TOKEN}` }
    });
    if (!customerResponse.ok) {
      await conn.rollback();
      return res.status(400).json({ error: 'Invalid customer' });
    }


    for (const item of items) {
      if (typeof item.product_id !== 'number' || item.product_id <= 0 || typeof item.qty !== 'number' || item.qty <= 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Invalid item' });
      }
    }

    let total_cents = 0;
    for (const item of items) {
      const productRows = await conn.execute('SELECT * FROM products WHERE id = ?', [item.product_id]);
      let product = (productRows as any[])[0];
      if (!product || product.stock < item.qty) {
        await conn.rollback();
        return res.status(400).json({ error: 'Insufficient stock' });
      }

      if(Array.isArray(product) && product.length > 0) {
        product = product[0];
      }
      total_cents += product.price_cents * item.qty;
    }

    const orderResult = await conn.execute('INSERT INTO orders (customer_id, status, total_cents) VALUES (?, ?, ?)', [customer_id, 'CREATED', total_cents]);
    const orderId = (orderResult as any)[0].insertId;

    for (const item of items) {
      let productRows = await conn.execute('SELECT price_cents FROM products WHERE id = ?', [item.product_id]);
      const price_cents = (productRows as any[])[0][0].price_cents;
      
      await conn.execute('INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES (?, ?, ?, ?, ?)', [orderId, item.product_id, item.qty, price_cents, price_cents * item.qty]);
      await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.qty, item.product_id]);
    }

    await conn.commit();
    res.status(201).json({ id: orderId });
  } catch (error) {
    await conn.rollback();
    console.error('Error in POST /orders:', error);
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
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
    next(error);
  }
});

router.get('/', async (req, res, next) => {
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
    params.push(`${Math.min(limitNum, 100)}`);
    const rows = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/confirm', async (req, res, next) => {
  const { id } = req.params;
  const idempotencyKey = req.headers['x-idempotency-key'] as string;
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'X-Idempotency-Key header required' });
  }

  try {
    const conn = await db.connect();
    await conn.beginTransaction();

    const existingOrder = await conn.execute('SELECT * FROM orders WHERE idempotency_key = ?', [idempotencyKey]);
    if ((existingOrder as any[])[0].length > 0) {
      const order = (existingOrder as any[])[0][0];
      const response = JSON.parse(order.confirmation_response);
      await conn.commit();
      return res.status(200).json(response);
    }

    const orderRows = await conn.execute('SELECT * FROM orders WHERE id = ?', [id]);
    if ((orderRows as any[])[0].length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = (orderRows as any[])[0][0];
    if (order.status !== 'CREATED') {
      await conn.rollback();
      return res.status(400).json({ error: 'Order cannot be confirmed' });
    }

    await conn.execute('UPDATE orders SET status = ?, idempotency_key = ? WHERE id = ?', ['CONFIRMED', idempotencyKey, id]);

    const itemRows = await conn.execute('SELECT * FROM order_items WHERE order_id = ?', [id]);
    const items = (itemRows as any[])[0];

    const response = {
      success: true,
      order: {
        id: order.id,
        status: 'CONFIRMED',
        total_cents: order.total_cents,
        items: items
      }
    };

    await conn.execute('UPDATE orders SET confirmation_response = ? WHERE id = ?', [JSON.stringify(response), id]);

    await conn.commit();
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancel', async (req, res, next) => {
  const { id } = req.params;

  try {
    const conn = await db.connect();
    await conn.beginTransaction();

    const orderRows = await conn.execute('SELECT * FROM orders WHERE id = ?', [id]);
    if ((orderRows as any[])[0].length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = (orderRows as any[])[0][0];

    if (order.status === 'CANCELED') {
      await conn.rollback();
      return res.status(400).json({ error: 'Order already canceled' });
    }

    if (order.status === 'CREATED') {
      await conn.execute('UPDATE orders SET status = ? WHERE id = ?', ['CANCELED', id]);
      const itemRows = await conn.execute('SELECT * FROM order_items WHERE order_id = ?', [id]);
      const items = (itemRows as any[])[0];
      for (const item of items) {
        await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.qty, item.product_id]);
      }
    } else if (order.status === 'CONFIRMED') {
      const timeDiff = await conn.execute('SELECT TIMESTAMPDIFF(MINUTE, created_at, NOW()) as diff FROM orders WHERE id = ?', [id]);
      const diff = (timeDiff as any[])[0][0].diff;
      if (diff > 10) {
        await conn.rollback();
        return res.status(400).json({ error: 'Order cannot be canceled after 10 minutes' });
      }
      await conn.execute('UPDATE orders SET status = ? WHERE id = ?', ['CANCELED', id]);
    } else {
      await conn.rollback();
      return res.status(400).json({ error: 'Order status invalid for cancel' });
    }

    await conn.commit();
    res.status(200).json({ message: 'Order canceled' });
  } catch (error) {
    next(error);
  }
});

export default router;
