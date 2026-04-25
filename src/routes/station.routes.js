import express from 'express';
import { Station } from '../models/index.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

/**
 * @swagger
 * /stations:
 *   get:
 *     summary: Get all police stations, filter by district or province
 *     tags: [Administrative]
 *     parameters:
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *       - in: query
 *         name: province
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of police stations
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.district) filter.district = req.query.district;
    if (req.query.province) filter.province = req.query.province;

    const stations = await Station.find(filter)
      .populate('district', 'name')
      .populate('province', 'name code')
      .sort('name');

    res.status(200).json({ success: true, count: stations.length, data: stations });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /stations/{id}:
 *   get:
 *     summary: Get a single police station
 *     tags: [Administrative]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const station = await Station.findById(req.params.id)
      .populate('district', 'name')
      .populate('province', 'name code');

    if (!station) return res.status(404).json({ success: false, message: 'Station not found.' });
    res.status(200).json({ success: true, data: station });
  } catch (error) {
    next(error);
  }
});

export default router;
