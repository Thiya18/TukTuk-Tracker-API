import request from 'supertest';
import app from '../../app.js';

let token;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ username: 'hq_admin', password: 'Admin@1234' });
  token = res.body.token;
});

// ─── Provinces ───────────────────────────────────────────────────────────────
describe('GET /api/v1/provinces', () => {
  test('should return all 9 provinces with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/provinces')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(9);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/provinces');
    expect(res.statusCode).toBe(401);
  });

  test('each province should have a name and code', async () => {
    const res = await request(app)
      .get('/api/v1/provinces')
      .set('Authorization', `Bearer ${token}`);
    res.body.data.forEach((p) => {
      expect(p.name).toBeDefined();
      expect(p.code).toBeDefined();
    });
  });
});

// ─── Districts ────────────────────────────────────────────────────────────────
describe('GET /api/v1/districts', () => {
  test('should return list of districts with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/districts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
  });

  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/districts');
    expect(res.statusCode).toBe(401);
  });

  test('each district should have a name and province reference', async () => {
    const res = await request(app)
      .get('/api/v1/districts')
      .set('Authorization', `Bearer ${token}`);
    res.body.data.forEach((d) => {
      expect(d.name).toBeDefined();
      expect(d.province).toBeDefined();
    });
  });
});

// ─── Stations ─────────────────────────────────────────────────────────────────
describe('GET /api/v1/stations', () => {
  test('should return list of stations with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/stations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/stations');
    expect(res.statusCode).toBe(401);
  });
});
