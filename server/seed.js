const mongoose = require('mongoose');
const Service = require('./models/Service');
const PersonType = require('./models/PersonType');
const User = require('./models/User');
require('dotenv').config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Service.deleteMany({});
    await PersonType.deleteMany({});
    await User.deleteMany({});

    const services = [
      {
        name: 'Cashier',
        description: 'Payment and billing services',
        prefix: 'CSH',
        windowFlow: [
          { windowNumber: 1, order: 1 },
          { windowNumber: 2, order: 2 }
        ]
      },
      {
        name: 'Information',
        description: 'General information and inquiries',
        prefix: 'INF',
        windowFlow: [
          { windowNumber: 3, order: 1 }
        ]
      },
      {
        name: 'Documentation',
        description: 'Document processing and verification',
        prefix: 'DOC',
        windowFlow: [
          { windowNumber: 4, order: 1 },
          { windowNumber: 5, order: 2 }
        ]
      },
      {
        name: 'Technical Support',
        description: 'Technical assistance and support',
        prefix: 'TEC',
        windowFlow: [
          { windowNumber: 6, order: 1 }
        ]
      },
      {
        name: 'Customer Service',
        description: 'Customer relations and complaints',
        prefix: 'CST',
        windowFlow: [
          { windowNumber: 7, order: 1 },
          { windowNumber: 8, order: 2 }
        ]
      }
    ];

    const personTypes = [
      {
        name: 'Normal',
        description: 'Regular customer',
        priority: 0,
        color: '#3B82F6'
      },
      {
        name: 'Person with disabilities',
        description: 'Customers with disabilities',
        priority: 8,
        color: '#10B981'
      },
      {
        name: 'Pregnant',
        description: 'Pregnant customers',
        priority: 7,
        color: '#EC4899'
      },
      {
        name: 'Senior Citizen',
        description: 'Senior citizens (60+ years)',
        priority: 6,
        color: '#8B5CF6'
      },
      {
        name: 'Priority',
        description: 'Priority customers',
        priority: 9,
        color: '#F59E0B'
      }
    ];

    const windowUsers = [
      {
        username: 'window1',
        email: 'window1@queueing.com',
        password: 'Window123!',
        role: 'window',
        windowNumber: 1,
        service: 'Cashier'
      },
      {
        username: 'window2',
        email: 'window2@queueing.com',
        password: 'Window123!',
        role: 'window',
        windowNumber: 2,
        service: 'Cashier'
      },
      {
        username: 'window3',
        email: 'window3@queueing.com',
        password: 'Window123!',
        role: 'window',
        windowNumber: 3,
        service: 'Information'
      },
      {
        username: 'window4',
        email: 'window4@queueing.com',
        password: 'Window123!',
        role: 'window',
        windowNumber: 4,
        service: 'Documentation'
      },
      {
        username: 'window5',
        email: 'window5@queueing.com',
        password: 'Window123!',
        role: 'window',
        windowNumber: 5,
        service: 'Documentation'
      }
    ];

    const adminUser = {
      username: 'admin',
      email: 'admin@queueing.com',
      password: 'Admin123!',
      role: 'admin'
    };

    await Service.insertMany(services);
    console.log('Services seeded successfully');

    await PersonType.insertMany(personTypes);
    console.log('Person types seeded successfully');

    await User.insertMany(windowUsers);
    console.log('Window users seeded successfully');

    await User.create(adminUser);
    console.log('Admin user seeded successfully');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
