const request = require('supertest');
const app = require('../app');

describe('CORS', () => {
  it('allows configured origins and reflects them in Access-Control-Allow-Origin', async () => {
    const origin = 'http://209.38.106.28:3000';
    const res = await request(app).get('/health').set('Origin', origin);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects unknown origins with 403', async () => {
    const origin = 'http://evil.example';
    const res = await request(app).get('/health').set('Origin', origin);
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.message).toMatch(/Not allowed by CORS/i);
  });
});

