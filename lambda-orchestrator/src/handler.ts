import { APIGatewayProxyHandler } from 'aws-lambda';
import axios from 'axios';

export const createAndConfirmOrder: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { customer_id, items, idempotency_key, correlation_id } = body;

    if (!customer_id || !items || !idempotency_key) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request' }),
      };
    }

    const customersApi = process.env.CUSTOMERS_API_BASE || 'http://localhost:3001';
    const ordersApi = process.env.ORDERS_API_BASE || 'http://localhost:3002';

    const customerResponse = await axios.get(`${customersApi}/customers/internal/${customer_id}`, {
      headers: { Authorization: `Bearer ${process.env.SERVICE_TOKEN}` }
    });
    const customer = customerResponse.data;

    const orderResponse = await axios.post(`${ordersApi}/orders`, { customer_id, items });
    const orderId = orderResponse.data.id;

    const confirmResponse = await axios.post(`${ordersApi}/orders/${orderId}/confirm`, {}, {
      headers: { 'X-Idempotency-Key': idempotency_key }
    });
    const confirmedOrder = confirmResponse.data.order;

    const response = {
      success: true,
      correlationId: correlation_id,
      data: {
        customer,
        order: confirmedOrder
      }
    };

    return {
      statusCode: 201,
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
