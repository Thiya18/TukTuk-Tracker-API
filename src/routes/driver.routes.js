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
 *         description: Filter by district ID
 *       - in: query
 *         name: province
 *         schema: { type: string }
 *         description: Filter by province ID
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *         description: Filter by active status
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver found
 *       404:
 *         description: Driver not found
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, nationalId, licenseNumber, district, province]
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Kasun Perera
 *               nationalId:
 *                 type: string
 *                 example: 199012345678
 *               licenseNumber:
 *                 type: string
 *                 example: B1234567
 *               phone:
 *                 type: string
 *                 example: 0771234567
 *               district:
 *                 type: string
 *                 example: 64a1b2c3d4e5f6g7h8i9j0k1
 *               province:
 *                 type: string
 *                 example: 64a1b2c3d4e5f6g7h8i9j0k2
 *     responses:
 *       201:
 *         description: Driver registered successfully
 *       400:
 *         description: Validation error
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Driver updated successfully
 *       404:
 *         description: Driver not found
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
 *         description: Driver ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Driver status updated
 *       404:
 *         description: Driver not found
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
 *     summary: Delete a driver (hq_admin only)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       204:
 *         description: Driver deleted successfully
 *       404:
 *         description: Driver not found
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