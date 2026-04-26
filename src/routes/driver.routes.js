import express from 'express';
import { body, validationResult } from 'express-validator';
import { Driver } from '../models/index.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

/**
 * @swagger
 * /drivers:
 *   get:
 *     summary: Get all drivers with optional filtering
 *     tags: [Drivers]
 *     parameters:
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *       - in: query
 *         name: province
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: List of drivers
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.district) filter.district = req.query.district;
    if (req.query.province) filter.province = req.query.province;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const drivers = await Driver.find(filter)
      .populate('district', 'name')
      .populate('province', 'name code')
      .sort('fullName');

    res.status(200).json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /drivers/{id}:
 *   get:
 *     summary: Get single driver
 *     tags: [Drivers]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate('district', 'name')
      .populate('province', 'name code');

    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /drivers:
 *   post:
 *     summary: Register a new driver
 *     tags: [Drivers]
 */
router.post(
  '/',
  authorize('hq_admin', 'provincial_officer', 'station_officer'),
  [
    body('fullName').notEmpty(),
    body('nationalId').notEmpty(),
    body('licenseNumber').notEmpty(),
    body('district').notEmpty(),
    body('province').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const driver = await Driver.create(req.body);
      res.status(201).json({ success: true, data: driver });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /drivers/{id}:
 *   put:
 *     summary: Update driver details
 *     tags: [Drivers]
 */
router.put('/:id', authorize('hq_admin', 'provincial_officer', 'station_officer'), async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /drivers/{id}/status:
 *   patch:
 *     summary: Toggle driver active status
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Driver status updated
 */
router.patch('/:id/status', authorize('hq_admin', 'provincial_officer'), async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be a boolean.' });
    }
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /drivers/{id}:
 *   delete:
 *     summary: Delete a driver
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Driver deleted
 */
router.delete('/:id', authorize('hq_admin'), async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
