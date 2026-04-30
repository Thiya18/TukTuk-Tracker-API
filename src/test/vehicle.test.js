import request from 'supertest';
import app from '../../app.js';

let token;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ username: 'hq_admin', password: 'Admin@1234' });
  token = res.body.token;
});

// ─── GET /api/v1/vehicles ────────────────────────────────────────────────────
describe('GET /api/v1/vehicles', () => {
  test('should return list of vehicles with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeDefined();
  });

  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/vehicles');
    expect(res.statusCode).toBe(401);
  });

  test('should support pagination - page and limit', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.page).toBe(1);
  });

  test('should filter vehicles by status=active', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles?status=active')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    res.body.data.forEach((v) => expect(v.status).toBe('active'));
  });

  test('should include ETag header in response', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`);
    expect(res.headers['etag']).toBeDefined();
  });
});

// ─── GET /api/v1/vehicles/:id ────────────────────────────────────────────────
describe('GET /api/v1/vehicles/:id', () => {
  let vehicleId;

  beforeAll(async () => {
    const res = await request(app)
      .get('/api/v1/vehicles?limit=1')
      .set('Authorization', `Bearer ${token}`);
    vehicleId = res.body.data[0]?._id;
  });

  test('should return a single vehicle by valid ID', async () => {
    if (!vehicleId) return;
    const res = await request(app)
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(vehicleId);
  });

  test('should return 404 for a non-existent MongoDB ID', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('should return 404 for a completely invalid ID string', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles/not-a-valid-id')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });
});

// ─── POST /api/v1/vehicles ───────────────────────────────────────────────────
describe('POST /api/v1/vehicles', () => {
  test('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({ registrationNumber: 'ABC-1234' }); // missing district & province
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should return 401 without token', async () => {
    const res = await request(app)
      .post('/api/v1/vehicles')
      .send({ registrationNumber: 'ABC-1234', district: 'id', province: 'id' });
    expect(res.statusCode).toBe(401);
  });
});

// ─── PATCH /api/v1/vehicles/:id/status ───────────────────────────────────────
describe('PATCH /api/v1/vehicles/:id/status', () => {
  test('should return 400 for invalid status value', async () => {
    const listRes = await request(app)
      .get('/api/v1/vehicles?limit=1')
      .set('Authorization', `Bearer ${token}`);
    const vehicleId = listRes.body.data[0]?._id;
    if (!vehicleId) return;

    const res = await request(app)
      .patch(`/api/v1/vehicles/${vehicleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'unknown_status' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should successfully update status to inactive', async () => {
    const listRes = await request(app)
      .get('/api/v1/vehicles?limit=1')
      .set('Authorization', `Bearer ${token}`);
    const vehicleId = listRes.body.data[0]?._id;
    if (!vehicleId) return;

    const res = await request(app)
      .patch(`/api/v1/vehicles/${vehicleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'inactive' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('inactive');

    // Restore to active
    await request(app)
      .patch(`/api/v1/vehicles/${vehicleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });
  });
});
