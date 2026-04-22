import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { User } from '../models/index.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Helper to sign JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// Helper to send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    data: {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  });
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and receive JWT token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: "hq_admin" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { username, password } = req.body;
      const user = await User.findOne({ username }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated.' });
      }

      sendTokenResponse(user, 200, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user (hq_admin only)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, fullName, role]
 *             properties:
 *               username: { type: string }
 *               password: { type: string, minLength: 8 }
 *               fullName: { type: string }
 *               role: { type: string, enum: [hq_admin, provincial_officer, station_officer, device] }
 *               province: { type: string }
 *               district: { type: string }
 *               station: { type: string }
 *               vehicle: { type: string }
 *     responses:
 *       201:
 *         description: User created successfully
 *       403:
 *         description: Not authorized
 */
router.post(
  '/register',
  protect,
  authorize('hq_admin'),
  [
    body('username').notEmpty().isLength({ min: 3 }),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').notEmpty(),
    body('role').isIn(['hq_admin', 'provincial_officer', 'station_officer', 'device']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // ── Whitelist allowed fields to prevent mass assignment ──────────────────
      const { username, password, fullName, role, province, district, station, vehicle } = req.body;
      const user = await User.create({ username, password, fullName, role, province, district, station, vehicle });

      res.setHeader('Location', `/api/v1/auth/me`);
      res.status(201).json({
        success: true,
        message: 'User created successfully.',
        data: { id: user._id, username: user.username, role: user.role },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Current user data
 */
router.get('/me', protect, async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

export default router;
