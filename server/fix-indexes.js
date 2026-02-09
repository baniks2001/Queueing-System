const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Drop email index from users collection
    try {
      await db.collection('users').dropIndex('email_1');
      console.log('✅ Dropped email index from users collection');
    } catch (error) {
      console.log('⚠️ Email index not found or already dropped:', error.message);
    }

    // Drop email index from admins collection  
    try {
      await db.collection('admins').dropIndex('email_1');
      console.log('✅ Dropped email index from admins collection');
    } catch (error) {
      console.log('⚠️ Admin email index not found or already dropped:', error.message);
    }

    console.log('✅ Database indexes fixed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  }
}

fixIndexes();
