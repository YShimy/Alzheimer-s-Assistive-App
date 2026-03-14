import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app/app.js';

const app = createApp();

describe('Health endpoint', () => {
  it('GET /api/health should return status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('Auth routes shape', () => {
  it('POST /api/auth/google/mobile should require idToken', async () => {
    const res = await request(app)
      .post('/api/auth/google/mobile')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('POST /api/auth/google/mobile should reject empty idToken', async () => {
    const res = await request(app)
      .post('/api/auth/google/mobile')
      .send({ idToken: '' });

    expect(res.status).toBe(400);
  });

  it('GET /api/auth/me should require authorization', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('POST /api/auth/logout should require authorization', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(401);
  });
});

describe('Protected routes require auth', () => {
  it('GET /api/users/me should return 401 without token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/carelinks/me should return 401 without token', async () => {
    const res = await request(app).get('/api/carelinks/me');
    expect(res.status).toBe(401);
  });
});
