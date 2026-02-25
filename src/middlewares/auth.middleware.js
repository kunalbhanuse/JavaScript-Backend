import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unathorized request");
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = User.findById(decoded._id).select("-password -refreshToken");

    if (!user) {
      throw new ApiError(401, "Invalid Acces Token");
    }
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Acces Token");
  }
});
