import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`server is running at Port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("Mongo db connection Failed", err);
  });
