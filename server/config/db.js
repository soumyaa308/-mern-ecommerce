import mongoose from "mongoose";

/**
 * Connects to MongoDB using the MONGO_URI env variable.
 * Exits the process on failure so the app never runs against a broken DB.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[DB] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on("error", (err) => {
      console.error(`[DB] Connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[DB] MongoDB disconnected");
    });
  } catch (error) {
    console.error(`[DB] Failed to connect: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;