const bcrypt = require('bcrypt');
const User = require('../models/User');

const SEED_USERS = [
  {
    username: 'marzook',
    password: process.env.OWNER_PASSWORD || 'smartnet123',
    role: 'owner',
  },
  {
    username: 'adhilmk',
    password: process.env.TRANSLATOR_PASSWORD || 'smartnet123',
    role: 'translator',
  },
];

async function seedUsers() {
  for (const u of SEED_USERS) {
    const exists = await User.findOne({ username: u.username });
    if (!exists) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await User.create({ username: u.username, passwordHash, role: u.role });
      console.log(`Seeded user: ${u.username} (${u.role})`);
    }
  }
}

module.exports = seedUsers;
