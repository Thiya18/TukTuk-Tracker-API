import request from 'supertest';
import app from '../../app.js';

let token;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ username: 'hq_admin', password: 'Admin@1234' });
  token = res.body.token;
});

// ─── GET /api/v1/drivers ─────────────────────────────────────────────────────
describe('GET /api/v1/drivers', () => {
  test('should return list of drivers with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/drivers')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/drivers');
    expect(res.statusCode).toBe(401);
  });

  test('should filter drivers by isActive=true', async () => {
    const res = await request(app)
      .get('/api/v1/drivers?isActive=true')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    res.body.data.forEach((d) => expect(d.isActive).toBe(true));
  });
});

// ─── GET /api/v1/drivers/:id ──────────────────────────────────────────────────
describe('GET /api/v1/drivers/:id', () => {
  let driverId;

  beforeAll(async () => {
    const res = await request(app)
      .get('/api/v1/drivers')
      .set('Authorization', `Bearer ${token}`);
    driverId = res.body.data[0]?._id;
  });

  test('should return a single driver by valid ID', async () => {
    if (!driverId) return;
    const res = await request(app)
      .get(`/api/v1/drivers/${driverId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(driverId);
  });

  test('should return 404 for non-existent driver ID', async () => {
    const res = await request(app)
      .get('/api/v1/drivers/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('should return 404 for invalid ID format', async () => {
    const res = await request(app)
      .get('/api/v1/drivers/invalid-id-xyz')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });
});

// ─── POST /api/v1/drivers ─────────────────────────────────────────────────────
describe('POST /api/v1/drivers', () => {
  test('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/drivers')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Test Driver' }); // missing nationalId, licenseNumber, district, province
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should return 401 when no token provided', async () => {
    const res = await request(app)
      .post('/api/v1/drivers')
      .send({ fullName: 'Test', nationalId: '1234', licenseNumber: 'B999', district: 'id', province: 'id' });
    expect(res.statusCode).toBe(401);
  });
});

// ─── PATCH /api/v1/drivers/:id/status ────────────────────────────────────────
describe('PATCH /api/v1/drivers/:id/status', () => {
  let driverId;

  beforeAll(async () => {
    const res = await request(app)
      .get('/api/v1/drivers')
      .set('Authorization', `Bearer ${token}`);
    driverId = res.body.data[0]?._id;
  });

  test('should return 400 when isActive is not boolean', async () => {
    if (!driverId) return;
    const res = await request(app)
      .patch(`/api/v1/drivers/${driverId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: 'yes' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should update driver isActive status', async () => {
    if (!driverId) return;
    const res = await request(app)
      .patch(`/api/v1/drivers/${driverId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.isActive).toBe(false);

    // Restore
    await request(app)
      .patch(`/api/v1/drivers/${driverId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: true });
  });
});
