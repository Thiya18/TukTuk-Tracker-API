import request from 'supertest';
import app from '../../app.js';

// ─── Shared token storage ────────────────────────────────────────────────────
let adminToken;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ username: 'hq_admin', password: 'Admin@1234' });
  adminToken = res.body.token;
});

// ─── Health Check ────────────────────────────────────────────────────────────
describe('Health Check', () => {
  test('GET /health - should return 200 with system info', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeDefined();
    expect(res.body.uptime).toBeDefined();
  });
});

// ─── Auth - Login ────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/login', () => {
  test('should login with valid credentials and return a JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'hq_admin', password: 'Admin@1234' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.data.username).toBe('hq_admin');
  });

  test('should return 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'hq_admin', password: 'wrongpassword' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('should return 400 when username is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'Admin@1234' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should return 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'hq_admin' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should return 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'ghost_user_xyz', password: 'Admin@1234' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── Auth - /me ──────────────────────────────────────────────────────────────
describe('GET /api/v1/auth/me', () => {
  test('should return current user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('should return 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalidtoken.xyz');
    expect(res.statusCode).toBe(401);
  });
});

// ─── Auth - /users ───────────────────────────────────────────────────────────
describe('GET /api/v1/auth/users', () => {
  test('should return list of users for hq_admin', async () => {
    const res = await request(app)
      .get('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
  });

  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/users');
    expect(res.statusCode).toBe(401);
  });
});

// ─── 404 catch-all ───────────────────────────────────────────────────────────
describe('Unknown Routes', () => {
  test('should return 404 for unrecognized route', async () => {
    const res = await request(app).get('/api/v1/doesnotexist');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});