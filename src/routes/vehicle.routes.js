import express from 'express';
import { body, validationResult } from 'express-validator';
import { Vehicle } from '../models/index.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All vehicle routes require authentication
router.use(protect);

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: Get all vehicles with filtering, sorting and pagination
 *     tags: [Vehicles]
 *     parameters:
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *         description: Filter by district ID
 *       - in: query
 *         name: province
 *         schema: { type: string }
 *         description: Filter by province ID
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive, flagged] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by registration number
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         description: Sort field e.g. registrationNumber, -createdAt
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of vehicles
 */
router.get('/', async (req, res, next) => {
  try {
    const { district, province, status, search, sort, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};
    if (district) filter.district = district;
    if (province) filter.province = province;
    if (status) filter.status = status;
    if (search) filter.registrationNumber = { $regex: search, $options: 'i' };

    // Role-based scoping
    if (req.user.role === 'provincial_officer') filter.province = req.user.province;
    if (req.user.role === 'station_officer') filter.district = req.user.district;

    // Sorting
    const sortObj = {};
    if (sort) {
      sort.split(',').forEach((field) => {
        sortObj[field.startsWith('-') ? field.slice(1) : field] = field.startsWith('-') ? -1 : 1;
      });
    } else {
      sortObj.createdAt = -1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Vehicle.countDocuments(filter);
    const vehicles = await Vehicle.find(filter)
      .populate('driver', 'fullName nationalId phone')
      .populate('district', 'name')
      .populate('province', 'name code')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    // ── ETag / Conditional GET (REST Level 5) ─────────────────────────
    const etag = `"${Buffer.from(JSON.stringify({ total, page, limit })).toString('base64')}"`;
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) return res.status(304).end();

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /vehicles/{id}:
 *   get:
 *     summary: Get single vehicle by ID
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Vehicle details
 *       404:
 *         description: Vehicle not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('driver', 'fullName nationalId licenseNumber phone')
      .populate('district', 'name')
      .populate('province', 'name code');

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /vehicles:
 *   post:
 *     summary: Register a new tuk-tuk vehicle
 *     tags: [Vehicles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vehicle'
 *     responses:
 *       201:
 *         description: Vehicle created
 */
router.post(
  '/',
  authorize('hq_admin', 'provincial_officer', 'station_officer'),
  [
    body('registrationNumber').notEmpty().withMessage('Registration number is required'),
    body('district').notEmpty().withMessage('District is required'),
    body('province').notEmpty().withMessage('Province is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const vehicle = await Vehicle.create(req.body);
      // ── Location header on 201 Created (REST best practice) ────────
      res.setHeader('Location', `/api/v1/vehicles/${vehicle._id}`);
      res.status(201).json({ success: true, data: vehicle });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /vehicles/{id}:
 *   put:
 *     summary: Update a vehicle
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Vehicle updated
 *       404:
 *         description: Vehicle not found
 */
router.put('/:id', authorize('hq_admin', 'provincial_officer', 'station_officer'), async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /vehicles/{id}/status:
 *   patch:
 *     summary: Update vehicle status (active/inactive/flagged)
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [active, inactive, flagged] }
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', authorize('hq_admin', 'provincial_officer', 'station_officer'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'flagged'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /vehicles/{id}:
 *   delete:
 *     summary: Delete a vehicle (hq_admin only)
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Vehicle deleted (no content)
 *       404:
 *         description: Vehicle not found
 */
router.delete('/:id', authorize('hq_admin'), async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }
    // 204 No Content — REST convention for successful DELETE
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
