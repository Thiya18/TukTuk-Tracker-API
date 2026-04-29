import express from 'express';
import { District } from '../models/index.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

/**
 * @swagger
 * /districts:
 *   get:
 *     summary: Get all 25 districts, optionally filter by province
 *     tags: [Administrative]
 *     parameters:
 *       - in: query
 *         name: province
 *         schema: { type: string }
 *         description: Filter by province ID
 *     responses:
 *       200:
 *         description: List of districts
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.province) filter.province = req.query.province;

    const districts = await District.find(filter)
      .populate('province', 'name code')
      .sort('name');

    res.status(200).json({ success: true, count: districts.length, data: districts });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /districts/{id}:
 *   get:
 *     summary: Get a single district
 *     tags: [Administrative]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: District ID
 *     responses:
 *       200:
 *         description: District found
 *       404:
 *         description: District not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const district = await District.findById(req.params.id).populate('province', 'name code');
    if (!district) return res.status(404).json({ success: false, message: 'District not found.' });
    res.status(200).json({ success: true, data: district });
  } catch (error) {
    next(error);
  }
});

export default router;