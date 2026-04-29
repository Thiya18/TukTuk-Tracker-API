import express from 'express';
import { body, validationResult } from 'express-validator';
import { LocationPing, Vehicle } from '../models/index.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /locations:
 *   post:
 *     summary: Submit a GPS location ping (device role)
 *     tags: [Locations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, latitude, longitude]
 *             properties:
 *               vehicleId: { type: string }
 *               latitude: { type: number, example: 6.9271 }
 *               longitude: { type: number, example: 79.8612 }
 *               speed: { type: number, example: 35 }
 *               heading: { type: number, example: 180 }
 *               accuracy: { type: number, example: 5 }
 *     responses:
 *       201:
 *         description: Location ping recorded
 */
router.post(
  '/',
  authorize('device', 'hq_admin'),
  [
    body('vehicleId').notEmpty().withMessage('vehicleId is required'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { vehicleId, latitude, longitude, speed, heading, accuracy } = req.body;

      if (req.user.role === 'device') {
        if (!req.user.vehicle || req.user.vehicle.toString() !== vehicleId) {
          return res.status(403).json({
            success: false,
            message: 'Device can only submit pings for its own assigned vehicle.',
          });
        }
      }

      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      }

      const ping = await LocationPing.create({
        vehicle: vehicleId,
        latitude,
        longitude,
        speed: speed || 0,
        heading,
        accuracy,
        timestamp: new Date(),
      });

      res.status(201).json({ success: true, data: ping });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /locations/{vehicleId}/latest:
 *   get:
 *     summary: Get the latest (last-known) location of a vehicle
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Latest location ping
 *       404:
 *         description: No location data found for vehicle
 */
router.get('/:vehicleId/latest', async (req, res, next) => {
  try {
    const ping = await LocationPing.findOne({ vehicle: req.params.vehicleId })
      .sort({ timestamp: -1 })
      .populate('vehicle', 'registrationNumber status');

    if (!ping) {
      return res.status(404).json({ success: false, message: 'No location data found for this vehicle.' });
    }

    res.status(200).json({ success: true, data: ping });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /locations/{vehicleId}/history:
 *   get:
 *     summary: Get location history for a vehicle within a time window
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *         description: Start datetime (ISO 8601)
 *         example: "2025-06-01T00:00:00Z"
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *         description: End datetime (ISO 8601)
 *         example: "2025-06-07T23:59:59Z"
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 500 }
 *     responses:
 *       200:
 *         description: Location history array
 */
router.get('/:vehicleId/history', async (req, res, next) => {
  try {
    const { from, to, limit = 500, page = 1 } = req.query;

    const filter = { vehicle: req.params.vehicleId };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;
    const total = await LocationPing.countDocuments(filter);

    const pings = await LocationPing.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parsedLimit);

    res.status(200).json({
      success: true,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      count: pings.length,
      vehicleId: req.params.vehicleId,
      data: pings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /locations/district/{districtId}/latest:
 *   get:
 *     summary: Get the latest location of all vehicles in a district
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: districtId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of latest pings per vehicle in district
 */
router.get('/district/:districtId/latest', async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ district: req.params.districtId, status: 'active' }).select('_id');
    const vehicleIds = vehicles.map((v) => v._id);

    const latestPings = await LocationPing.aggregate([
      { $match: { vehicle: { $in: vehicleIds } } },
      { $sort: { vehicle: 1, timestamp: -1 } },
      { $group: { _id: '$vehicle', latestPing: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latestPing' } },
    ]);

    res.status(200).json({
      success: true,
      districtId: req.params.districtId,
      count: latestPings.length,
      data: latestPings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /locations/province/{provinceId}/latest:
 *   get:
 *     summary: Get the latest location of all active vehicles in a province
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: provinceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of latest pings per vehicle in province
 */
router.get('/province/:provinceId/latest', async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ province: req.params.provinceId, status: 'active' }).select('_id');
    const vehicleIds = vehicles.map((v) => v._id);

    const latestPings = await LocationPing.aggregate([
      { $match: { vehicle: { $in: vehicleIds } } },
      { $sort: { vehicle: 1, timestamp: -1 } },
      { $group: { _id: '$vehicle', latestPing: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latestPing' } },
    ]);

    res.status(200).json({
      success: true,
      provinceId: req.params.provinceId,
      count: latestPings.length,
      data: latestPings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /locations/suspicious:
 *   get:
 *     summary: Get suspicious location pings (overspeeding, unusual activity)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: speedThreshold
 *         schema:
 *           type: number
 *           default: 60
 *         description: Speed threshold in km/h (default 60)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *     responses:
 *       200:
 *         description: List of suspicious pings grouped by vehicle
 */
router.get('/suspicious', authorize('hq_admin', 'provincial_officer', 'station_officer'), async (req, res, next) => {
  try {
    const speedThreshold = parseInt(req.query.speedThreshold) || 60;
    const limit = parseInt(req.query.limit) || 50;

    const filter = { speed: { $gt: speedThreshold } };
    if (req.user.role === 'provincial_officer') filter.province = req.user.province;
    if (req.user.role === 'station_officer') filter.district = req.user.district;

    const suspiciousPings = await LocationPing.find(filter)
      .populate({
        path: 'vehicle',
        select: 'registrationNumber status district province',
        populate: [
          { path: 'district', select: 'name' },
          { path: 'province', select: 'name' }
        ]
      })
      .sort('-speed')
      .limit(limit);

    // Auto flag vehicles with high speed pings
    if (suspiciousPings.length > 0) {
      const vehicleIds = [...new Set(suspiciousPings.map(p => p.vehicle?._id).filter(Boolean))];
      await Vehicle.updateMany(
        { _id: { $in: vehicleIds } },
        { status: 'flagged', isActive: false }
      );
    }

    // Group by vehicle
    const grouped = {};
    suspiciousPings.forEach(ping => {
      const vehicleId = ping.vehicle?._id?.toString();
      if (!grouped[vehicleId]) {
        grouped[vehicleId] = {
          vehicle: ping.vehicle,
          isSuspicious: true,
          status: 'flagged',
          maxSpeed: 0,
          totalIncidents: 0,
          incidents: []
        };
      }
      grouped[vehicleId].incidents.push({
        latitude: ping.latitude,
        longitude: ping.longitude,
        speed: ping.speed,
        timestamp: ping.timestamp
      });
      grouped[vehicleId].maxSpeed = Math.max(grouped[vehicleId].maxSpeed, ping.speed);
      grouped[vehicleId].totalIncidents++;
    });

    res.status(200).json({
      success: true,
      speedThreshold: `>${speedThreshold} km/h`,
      totalPings: suspiciousPings.length,
      vehiclesInvolved: Object.keys(grouped).length,
      data: Object.values(grouped)
    });
  } catch (error) {
    next(error);
  }
});

export default router;