import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    console.log("Mongodb Connected Succesfully 🚀");
  } catch (error) {
    console.log("MOngoDB connection Failed", error);
    process.exit(1);
  }
};

export default connectDB;
