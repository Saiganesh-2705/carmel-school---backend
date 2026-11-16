const mongoose = require('mongoose');
module.exports = async function connectDB() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set in server/.env');
  mongoose.set('strictQuery', true);
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log(`MongoDB connected: ${conn.connection.host} / ${conn.connection.name}`);
  } catch (e) {
    throw new Error(
      `MongoDB connection failed: ${e.message}\n` +
      '  1) Check the user name and password in MONGO_URI (URL-encode special characters such as @ : / ?)\n' +
      '  2) Atlas -> Network Access -> add your current IP (or 0.0.0.0/0 for testing)\n' +
      '  3) Make sure the Atlas cluster is not paused');
  }
};
