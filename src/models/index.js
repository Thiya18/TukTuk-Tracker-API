import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

// ─────────────────────────────────────────────
// Province Model
// ─────────────────────────────────────────────
/**
 * @swagger
 * components:
 *   schemas:
 *     Province:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         name: { type: string, example: "Western" }
 *         code: { type: string, example: "WP" }
 */
const provinceSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
}, { timestamps: true });

// ─────────────────────────────────────────────
// District Model
// ─────────────────────────────────────────────
/**
 * @swagger
 * components:
 *   schemas:
 *     District:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         name: { type: string, example: "Colombo" }
 *         province: { type: string, description: "Province ID" }
 */
const districtSchema = new Schema({
  name: { type: String, required: true, trim: true },
  province: { type: Schema.Types.ObjectId, ref: 'Province', required: true },
}, { timestamps: true });

// Index for filtering districts by province
districtSchema.index({ province: 1 });

// ─────────────────────────────────────────────
// Police Station Model
// ─────────────────────────────────────────────
/**
 * @swagger
 * components:
 *   schemas:
 *     Station:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         name: { type: string, example: "Colombo Fort Police Station" }
 *         district: { type: string }
 *         province: { type: string }
 *         stationCode: { type: string }
 */
const stationSchema = new Schema({
  name: { type: String, required: true, trim: true },
  stationCode: { type: String, required: true, unique: true, uppercase: true },
  district: { type: Schema.Types.ObjectId, ref: 'District', required: true },
  province: { type: Schema.Types.ObjectId, ref: 'Province', required: true },
  address: { type: String },
  contactNumber: { type: String },
}, { timestamps: true });

// Indexes for filtering stations by district or province
stationSchema.index({ district: 1 });
stationSchema.index({ province: 1 });

// ─────────────────────────────────────────────
// Driver Model
// ─────────────────────────────────────────────
/**
 * @swagger
 * components:
 *   schemas:
 *     Driver:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         fullName: { type: string }
 *         nationalId: { type: string }
 *         licenseNumber: { type: string }
 *         phone: { type: string }
 *         district: { type: string }
 *         isActive: { type: boolean }
 */
const driverSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  nationalId: { type: String, required: true, unique: true, trim: true },
  licenseNumber: { type: String, required: true, unique: true, trim: true },
  phone: { type: String },
  district: { type: Schema.Types.ObjectId, ref: 'District', required: true },
  province: { type: Schema.Types.ObjectId, ref: 'Province', required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Indexes for common queries on driver list
driverSchema.index({ district: 1 });
driverSchema.index({ isActive: 1 });

// ─────────────────────────────────────────────
// Vehicle (Tuk-Tuk) Model
// ─────────────────────────────────────────────
/**
 * @swagger
 * components:
 *   schemas:
 *     Vehicle:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         registrationNumber: { type: string, example: "WP-CAB-1234" }
 *         driver: { type: string }
 *         district: { type: string }
 *         province: { type: string }
 *         deviceId: { type: string }
 *         isActive: { type: boolean }
 *         status: { type: string, enum: [active, inactive, flagged] }
 */
const vehicleSchema = new Schema({
  registrationNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  driver: { type: Schema.Types.ObjectId, ref: 'Driver' },
  district: { type: Schema.Types.ObjectId, ref: 'District', required: true },
  province: { type: Schema.Types.ObjectId, ref: 'Province', required: true },
  deviceId: { type: String, unique: true, sparse: true },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'inactive', 'flagged'], default: 'active' },
  color: { type: String },
  year: { type: Number },
}, { timestamps: true });

// Indexes for common queries
vehicleSchema.index({ district: 1, status: 1 });
vehicleSchema.index({ province: 1, status: 1 });
vehicleSchema.index({ registrationNumber: 'text' });

// ─────────────────────────────────────────────
// Location Ping Model
// ─────────────────────────────────────────────
/**
 * @swagger
 * components:
 *   schemas:
 *     LocationPing:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         vehicle: { type: string }
 *         latitude: { type: number, example: 6.9271 }
 *         longitude: { type: number, example: 79.8612 }
 *         speed: { type: number }
 *         timestamp: { type: string, format: date-time }
 */
const locationPingSchema = new Schema({
  vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  speed: { type: Number, default: 0 },          // km/h
  heading: { type: Number },                     // degrees 0-360
  accuracy: { type: Number },                    // metres
  timestamp: { type: Date, default: Date.now },
}, { timestamps: false });

// Indexes for fast time-window and vehicle queries
locationPingSchema.index({ vehicle: 1, timestamp: -1 });
locationPingSchema.index({ timestamp: -1 });

// ─────────────────────────────────────────────
// User Model
// ─────────────────────────────────────────────
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         username: { type: string }
 *         role: { type: string, enum: [hq_admin, provincial_officer, station_officer, device] }
 *         province: { type: string }
 *         district: { type: string }
 *         station: { type: string }
 *         isActive: { type: boolean }
 */
const userSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 8, select: false },
  fullName: { type: String, required: true },
  role: {
    type: String,
    enum: ['hq_admin', 'provincial_officer', 'station_officer', 'device'],
    required: true,
  },
  // Scope — set based on role
  province: { type: Schema.Types.ObjectId, ref: 'Province' },
  district: { type: Schema.Types.ObjectId, ref: 'District' },
  station: { type: Schema.Types.ObjectId, ref: 'Station' },
  // For device role — linked vehicle
  vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─────────────────────────────────────────────
// Export all models
// ─────────────────────────────────────────────
export const Province = mongoose.model('Province', provinceSchema);
export const District = mongoose.model('District', districtSchema);
export const Station = mongoose.model('Station', stationSchema);
export const Driver = mongoose.model('Driver', driverSchema);
export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export const LocationPing = mongoose.model('LocationPing', locationPingSchema);
export const User = mongoose.model('User', userSchema);
