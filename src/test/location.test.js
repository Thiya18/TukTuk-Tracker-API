import request from 'supertest';
import app from '../../app.js';

let token;
let vehicleId;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ username: 'hq_admin', password: 'Admin@1234' });
  token = loginRes.body.token;

  // Get a real vehicle ID for location pings
  const vehicleRes = await request(app)
    .get('/api/v1/vehicles?limit=1')
    .set('Authorization', `Bearer ${token}`);
  vehicleId = vehicleRes.body.data[0]?._id;
});

// ─── GET /:vehicleId/latest ───────────────────────────────────────────────────
describe('GET /api/v1/locations/:vehicleId/latest', () => {
  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/locations/someid/latest');
    expect(res.statusCode).toBe(401);
  });

  test('should return 200 or 404 for a valid vehicle ID', async () => {
    if (!vehicleId) return;
    const res = await request(app)
      .get(`/api/v1/locations/${vehicleId}/latest`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 404]).toContain(res.statusCode);
  });

  test('should return 404 for a vehicle with no pings', async () => {
    const res = await request(app)
      .get('/api/v1/locations/000000000000000000000000/latest')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /:vehicleId/history ──────────────────────────────────────────────────
describe('GET /api/v1/locations/:vehicleId/history', () => {
  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/locations/someid/history');
    expect(res.statusCode).toBe(401);
  });

  test('should return paginated history for a valid vehicle', async () => {
    if (!vehicleId) return;
    const res = await request(app)
      .get(`/api/v1/locations/${vehicleId}/history?limit=10&page=1`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.page).toBe(1);
    expect(res.body.data).toBeDefined();
  });

  test('should support from/to date filtering', async () => {
    if (!vehicleId) return;
    const res = await request(app)
      .get(`/api/v1/locations/${vehicleId}/history?from=2020-01-01T00:00:00Z&to=2030-12-31T23:59:59Z`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── GET /suspicious ─────────────────────────────────────────────────────────
describe('GET /api/v1/locations/suspicious', () => {
  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/locations/suspicious');
    expect(res.statusCode).toBe(401);
  });

  test('should return suspicious pings list for hq_admin', async () => {
    const res = await request(app)
      .get('/api/v1/locations/suspicious')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.speedThreshold).toBeDefined();
  });

  test('should respect custom speedThreshold query param', async () => {
    const res = await request(app)
      .get('/api/v1/locations/suspicious?speedThreshold=80')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.speedThreshold).toBe('>80 km/h');
  });
});

// ─── POST /api/v1/locations ───────────────────────────────────────────────────
describe('POST /api/v1/locations', () => {
  test('should return 400 when vehicleId is missing', async () => {
    const res = await request(app)
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${token}`)
      .send({ latitude: 6.9271, longitude: 79.8612 });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should return 400 for out-of-range latitude', async () => {
    const res = await request(app)
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${token}`)
      .send({ vehicleId: 'someid', latitude: 999, longitude: 79.8612 });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should return 401 without token', async () => {
    const res = await request(app)
      .post('/api/v1/locations')
      .send({ vehicleId: 'someid', latitude: 6.9271, longitude: 79.8612 });
    expect(res.statusCode).toBe(401);
  });

  test('should create a location ping as hq_admin for a real vehicle', async () => {
    if (!vehicleId) return;
    const res = await request(app)
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${token}`)
      .send({ vehicleId, latitude: 6.9271, longitude: 79.8612, speed: 30 });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vehicle).toBe(vehicleId);
  });
});

// ─── GET /district/:districtId/latest ────────────────────────────────────────
describe('GET /api/v1/locations/district/:districtId/latest', () => {
  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/locations/district/someid/latest');
    expect(res.statusCode).toBe(401);
  });

  test('should return 200 with empty or populated data array', async () => {
    const res = await request(app)
      .get('/api/v1/locations/district/000000000000000000000000/latest')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
