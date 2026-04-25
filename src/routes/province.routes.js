import express from 'express';
import { Province } from '../models/index.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

/**
 * @swagger
 * /provinces:
 *   get:
 *     summary: Get all 9 provinces
 *     tags: [Administrative]
 *     responses:
 *       200:
 *         description: List of provinces
 */
router.get('/', async (req, res, _next) => {
  try {
    const provinces = await Province.find().sort('name');
    res.status(200).json({ success: true, count: provinces.length, data: provinces });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /provinces/{id}:
 *   get:
 *     summary: Get a single province
 *     tags: [Administrative]
 */
router.get('/:id', async (req, res, _next) => {
  try {
    const province = await Province.findById(req.params.id);
    if (!province) return res.status(404).json({ success: false, message: 'Province not found.' });
    res.status(200).json({ success: true, data: province });
  } catch (error) {
    next(error);
  }
});

export default router;
