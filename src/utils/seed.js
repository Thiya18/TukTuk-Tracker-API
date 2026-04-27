/**
 * Seed Script — Tuk-Tuk Tracker
 * Populates: 9 Provinces, 25 Districts, 25 Police Stations,
 *            200 Drivers, 200 Vehicles, 1 week of location pings,
 *            and default admin user
 *
 * Run: npm run seed
 */

import mongoose from 'mongoose';
import 'dotenv/config';
import { Province, District, Station, Driver, Vehicle, LocationPing, User } from '../models/index.js';

await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected to MongoDB');

// ─── Clear existing data ───────────────────────────────────────────
await Promise.all([
  Province.deleteMany({}),
  District.deleteMany({}),
  Station.deleteMany({}),
  Driver.deleteMany({}),
  Vehicle.deleteMany({}),
  LocationPing.deleteMany({}),
  User.deleteMany({}),
]);
console.log('🗑️  Cleared existing data');

// ─── 1. Provinces (all 9) ──────────────────────────────────────────
const provincesData = [
  { name: 'Western', code: 'WP' },
  { name: 'Central', code: 'CP' },
  { name: 'Southern', code: 'SP' },
  { name: 'Northern', code: 'NP' },
  { name: 'Eastern', code: 'EP' },
  { name: 'North Western', code: 'NWP' },
  { name: 'North Central', code: 'NCP' },
  { name: 'Uva', code: 'UP' },
  { name: 'Sabaragamuwa', code: 'SGP' },
];
const provinces = await Province.insertMany(provincesData);
const pMap = Object.fromEntries(provinces.map((p) => [p.code, p]));
console.log(`✅ Created ${provinces.length} provinces`);

// ─── 2. Districts (all 25) ────────────────────────────────────────
const districtsData = [
  { name: 'Colombo', code: 'WP' },
  { name: 'Gampaha', code: 'WP' },
  { name: 'Kalutara', code: 'WP' },
  { name: 'Kandy', code: 'CP' },
  { name: 'Matale', code: 'CP' },
  { name: 'Nuwara Eliya', code: 'CP' },
  { name: 'Galle', code: 'SP' },
  { name: 'Matara', code: 'SP' },
  { name: 'Hambantota', code: 'SP' },
  { name: 'Jaffna', code: 'NP' },
  { name: 'Kilinochchi', code: 'NP' },
  { name: 'Mannar', code: 'NP' },
  { name: 'Vavuniya', code: 'NP' },
  { name: 'Mullaitivu', code: 'NP' },
  { name: 'Batticaloa', code: 'EP' },
  { name: 'Ampara', code: 'EP' },
  { name: 'Trincomalee', code: 'EP' },
  { name: 'Kurunegala', code: 'NWP' },
  { name: 'Puttalam', code: 'NWP' },
  { name: 'Anuradhapura', code: 'NCP' },
  { name: 'Polonnaruwa', code: 'NCP' },
  { name: 'Badulla', code: 'UP' },
  { name: 'Moneragala', code: 'UP' },
  { name: 'Ratnapura', code: 'SGP' },
  { name: 'Kegalle', code: 'SGP' },
];

const districts = await District.insertMany(
  districtsData.map((d) => ({ name: d.name, province: pMap[d.code]._id }))
);
const dMap = Object.fromEntries(districts.map((d) => [d.name, d]));
console.log(`✅ Created ${districts.length} districts`);

// ─── 3. Police Stations (25) ─────────────────────────────────────
const stationsData = [
  { name: 'Colombo Fort Police Station', code: 'COL-F', district: 'Colombo' },
  { name: 'Maradana Police Station', code: 'COL-M', district: 'Colombo' },
  { name: 'Wellampitiya Police Station', code: 'COL-W', district: 'Colombo' },
  { name: 'Negombo Police Station', code: 'GAM-N', district: 'Gampaha' },
  { name: 'Gampaha Police Station', code: 'GAM-G', district: 'Gampaha' },
  { name: 'Kalutara North Police Station', code: 'KAL-N', district: 'Kalutara' },
  { name: 'Kandy Central Police Station', code: 'KAN-C', district: 'Kandy' },
  { name: 'Peradeniya Police Station', code: 'KAN-P', district: 'Kandy' },
  { name: 'Matale Police Station', code: 'MAT-C', district: 'Matale' },
  { name: 'Nuwara Eliya Police Station', code: 'NUW-C', district: 'Nuwara Eliya' },
  { name: 'Galle Fort Police Station', code: 'GAL-F', district: 'Galle' },
  { name: 'Matara Police Station', code: 'MAT-S', district: 'Matara' },
  { name: 'Hambantota Police Station', code: 'HAM-C', district: 'Hambantota' },
  { name: 'Jaffna Central Police Station', code: 'JAF-C', district: 'Jaffna' },
  { name: 'Chavakachcheri Police Station', code: 'JAF-CH', district: 'Jaffna' },
  { name: 'Vavuniya Police Station', code: 'VAV-C', district: 'Vavuniya' },
  { name: 'Batticaloa Police Station', code: 'BAT-C', district: 'Batticaloa' },
  { name: 'Ampara Police Station', code: 'AMP-C', district: 'Ampara' },
  { name: 'Trincomalee Police Station', code: 'TRI-C', district: 'Trincomalee' },
  { name: 'Kurunegala Police Station', code: 'KUR-C', district: 'Kurunegala' },
  { name: 'Puttalam Police Station', code: 'PUT-C', district: 'Puttalam' },
  { name: 'Anuradhapura Police Station', code: 'ANU-C', district: 'Anuradhapura' },
  { name: 'Badulla Police Station', code: 'BAD-C', district: 'Badulla' },
  { name: 'Ratnapura Police Station', code: 'RAT-C', district: 'Ratnapura' },
  { name: 'Kegalle Police Station', code: 'KEG-C', district: 'Kegalle' },
];

const stations = await Station.insertMany(
  stationsData.map((s) => {
    const district = dMap[s.district];
    return {
      name: s.name,
      stationCode: s.code,
      district: district._id,
      province: district.province,
    };
  })
);
console.log(`✅ Created ${stations.length} police stations`);

// ─── 4. Drivers (200) ────────────────────────────────────────────
const sinhalaFirstNames = ['Kasun', 'Nuwan', 'Chamara', 'Sajith', 'Ruwan', 'Pradeep', 'Lasith', 'Dinesh', 'Asanka', 'Mahesh',
  'Chathura', 'Buddhika', 'Saman', 'Aruna', 'Nimal', 'Harsha', 'Dulith', 'Isuru', 'Gayan', 'Thilina'];
const sinhalaLastNames = ['Perera', 'Silva', 'Fernando', 'Dissanayake', 'Rajapaksa', 'Wickramasinghe', 'Gunawardena',
  'Jayawardena', 'Bandara', 'Kumara', 'Senanayake', 'Wijesinghe', 'Ranasinghe', 'Mahalingam', 'Pathirana'];

const driversToInsert = [];
for (let i = 0; i < 200; i++) {
  const firstName = sinhalaFirstNames[i % sinhalaFirstNames.length];
  const lastName = sinhalaLastNames[i % sinhalaLastNames.length];
  const district = districts[i % districts.length];
  driversToInsert.push({
    fullName: `${firstName} ${lastName}`,
    nationalId: `${String(195000000 + i).padStart(9, '0')}V`,
    licenseNumber: `B${String(1000000 + i).padStart(7, '0')}`,
    phone: `07${String(10000000 + i).slice(-8)}`,
    district: district._id,
    province: district.province,
    isActive: true,
  });
}
const drivers = await Driver.insertMany(driversToInsert);
console.log(`✅ Created ${drivers.length} drivers`);

// ─── 5. Vehicles (200) ───────────────────────────────────────────
const provinceCodes = ['WP', 'CP', 'SP', 'NP', 'EP', 'NWP', 'NCP', 'UP', 'SGP'];
const vehiclesToInsert = [];
for (let i = 0; i < 200; i++) {
  const district = districts[i % districts.length];
  const pCode = provinceCodes[i % provinceCodes.length];
  const regNum = `${pCode}-CAB-${String(1000 + i).padStart(4, '0')}`;
  const statusRoll = i % 10;
  const status = statusRoll === 9 ? 'flagged' : statusRoll >= 7 ? 'inactive' : 'active';

  vehiclesToInsert.push({
    registrationNumber: regNum,
    driver: drivers[i]._id,
    district: district._id,
    province: district.province,
    deviceId: `DEV-${String(10000 + i).padStart(5, '0')}`,
    isActive: status === 'active',
    status,
    color: ['Yellow', 'Blue', 'Green'][i % 3],
    year: 2010 + (i % 15),
  });
}
const vehicles = await Vehicle.insertMany(vehiclesToInsert);
console.log(`✅ Created ${vehicles.length} vehicles`);

// ─── 6. Location Pings (1 week) ──────────────────────────────────
const locations = [
  { lat: 6.9271, lng: 79.8612, name: 'Colombo' },
  { lat: 7.2906, lng: 80.6337, name: 'Kandy' },
  { lat: 6.0535, lng: 80.2210, name: 'Galle' },
  { lat: 9.6615, lng: 80.0255, name: 'Jaffna' },
  { lat: 7.4863, lng: 80.3621, name: 'Kurunegala' },
  { lat: 8.3114, lng: 80.4037, name: 'Anuradhapura' },
  { lat: 7.8731, lng: 81.6930, name: 'Batticaloa' },
  { lat: 6.8876, lng: 81.3391, name: 'Badulla' },
  { lat: 6.7056, lng: 80.3847, name: 'Ratnapura' },
];

const now = new Date();
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const pingsToInsert = [];

const activeVehicles = vehicles.filter((v) => v.status === 'active');
console.log(`⏳ Generating location pings for ${activeVehicles.length} active vehicles...`);

for (let vi = 0; vi < activeVehicles.length; vi++) {
  const vehicle = activeVehicles[vi];
  const baseLocation = locations[vi % locations.length];

  for (let day = 0; day < 7; day++) {
    const pingsPerDay = 6 + Math.floor(Math.random() * 3);
    for (let p = 0; p < pingsPerDay; p++) {
      const dayOffset = day * 24 * 60 * 60 * 1000;
      const timeOffset = Math.random() * 18 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000;
      const timestamp = new Date(oneWeekAgo.getTime() + dayOffset + timeOffset);
      const lat = baseLocation.lat + (Math.random() - 0.5) * 0.1;
      const lng = baseLocation.lng + (Math.random() - 0.5) * 0.1;

      pingsToInsert.push({
        vehicle: vehicle._id,
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        speed: Math.floor(Math.random() * 60),
        heading: Math.floor(Math.random() * 360),
        accuracy: Math.floor(3 + Math.random() * 10),
        timestamp,
      });
    }
  }
}

const batchSize = 1000;
for (let i = 0; i < pingsToInsert.length; i += batchSize) {
  await LocationPing.insertMany(pingsToInsert.slice(i, i + batchSize));
  process.stdout.write(`\r📍 Inserted ${Math.min(i + batchSize, pingsToInsert.length)}/${pingsToInsert.length} pings`);
}
console.log(`\n✅ Created ${pingsToInsert.length} location pings`);

// ─── 7. Users
// ✅ FIX: Use User.create() instead of insertMany() to trigger bcrypt password hashing
const usersToInsert = [
  {
    username: 'hq_admin',
    password: 'Admin@1234',
    fullName: 'HQ Administrator',
    role: 'hq_admin',
  },
  {
    username: 'wp_officer',
    password: 'Officer@1234',
    fullName: 'Western Province Officer',
    role: 'provincial_officer',
    province: pMap['WP']._id,
  },
  {
    username: 'colombo_station',
    password: 'Station@1234',
    fullName: 'Colombo Fort Station Officer',
    role: 'station_officer',
    province: pMap['WP']._id,
    district: dMap['Colombo']._id,
    station: stations[0]._id,
  },
  {
    username: 'device_001',
    password: 'Device@1234',
    fullName: 'Device WP-CAB-1000',
    role: 'device',
    vehicle: vehicles[0]._id,
  },
];

for (const userData of usersToInsert) {
  await User.create(userData);
}
console.log(`✅ Created ${usersToInsert.length} users`);

//Done
console.log('\n🎉 Seed complete! Default credentials:');
console.log('   hq_admin     / Admin@1234');
console.log('   wp_officer   / Officer@1234');
console.log('   colombo_station / Station@1234');
console.log('   device_001   / Device@1234');

await mongoose.disconnect();
process.exit(0);