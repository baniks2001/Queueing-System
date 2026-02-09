// Temporary in-memory users for testing when MongoDB is unavailable
const tempUsers = [
  {
    _id: 'temp-admin-1',
    username: 'admin',
    email: 'admin@queueing.com',
    password: '$2b$10$rQZ8kHqKqKqKqKqKqKqKqO', // 'admin123' hashed
    role: 'admin',
    isActive: true,
    comparePassword: async function(candidatePassword) {
      return candidatePassword === 'admin123';
    }
  },
  {
    _id: 'temp-admin-2',
    username: 'user1',
    email: 'user1@queueing.com',
    password: '$2b$10$rQZ8kHqKqKqKqKqKqKqKqO', // 'admin123' hashed
    role: 'admin',
    isActive: true,
    comparePassword: async function(candidatePassword) {
      return candidatePassword === 'admin123';
    }
  },
  {
    _id: 'temp-window-1',
    username: 'window1',
    email: 'window1@example.com',
    password: '$2b$10$rQZ8kHqKqKqKqKqKqKqKqO', // 'window123' hashed
    role: 'window',
    windowNumber: 1,
    service: 'Cashier',
    isActive: true,
    comparePassword: async function(candidatePassword) {
      return candidatePassword === 'window123';
    }
  },
  {
    _id: 'temp-window-2',
    username: 'window2',
    email: 'window2@example.com',
    password: '$2b$10$rQZ8kHqKqKqKqKqKqKqKqO', // 'window123' hashed
    role: 'window',
    windowNumber: 2,
    service: 'Reception',
    isActive: true,
    comparePassword: async function(candidatePassword) {
      return candidatePassword === 'window123';
    }
  },
  {
    _id: 'temp-window-3',
    username: 'window3',
    email: 'window3@example.com',
    password: '$2b$10$rQZ8kHqKqKqKqKqKqKqKqO', // 'window123' hashed
    role: 'window',
    windowNumber: 3,
    service: 'Information',
    isActive: true,
    comparePassword: async function(candidatePassword) {
      return candidatePassword === 'window123';
    }
  },
  {
    _id: 'temp-window-4',
    username: 'window4',
    email: 'window4@example.com',
    password: '$2b$10$rQZ8kHqKqKqKqKqKqKqKqO', // 'window123' hashed
    role: 'window',
    windowNumber: 4,
    service: 'Payment',
    isActive: true,
    comparePassword: async function(candidatePassword) {
      return candidatePassword === 'window123';
    }
  },
  {
    _id: 'temp-window-5',
    username: 'window5',
    email: 'window5@example.com',
    password: '$2b$10$rQZ8kHqKqKqKqKqKqKqKqO', // 'window123' hashed
    role: 'window',
    windowNumber: 5,
    service: 'Verification',
    isActive: true,
    comparePassword: async function(candidatePassword) {
      return candidatePassword === 'window123';
    }
  }
];

const findUserByUsername = async (username) => {
  return tempUsers.find(user => user.username === username);
};

const findAdminByUsername = async (username) => {
  return tempUsers.find(user => user.username === username && (user.role === 'admin' || user.role === 'super_admin'));
};

module.exports = {
  tempUsers,
  findUserByUsername,
  findAdminByUsername
};
