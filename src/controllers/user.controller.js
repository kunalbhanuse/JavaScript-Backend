import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uplodeOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponce.js";
import jwt from "jsonwebtoken";

const genereteAccessTokendAndRefreshToken = async (userID) => {
  try {
    const user = await User.findById(userID);

    const accessToken = await user.generateAccesToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    // console.log("user.refresh", user.refreshToken);

    const responceDb = await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.log("💥 THE REAL ERROR IS: ", error);
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and acces tokens",
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;
  // console.log(req.body);

  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  // check userExiting so get the User From model
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError("409", "User with email or username Allready Exists");
  }

  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  }

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatarLocalPath is required");
  }

  //here we pass the clodinary a local path
  const avatar = await uplodeOnCloudinary(avatarLocalPath);
  const coverImage = await uplodeOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "avatar filed is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );
  if (!createdUser) {
    throw new ApiError(500, "Spmething went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registerd succefully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;
  // console.log(req.body);

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }
  // console.log(`email:-${email} , username:-${username}`);

  // getting the user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  // console.log("user", user);

  if (!user) {
    throw new ApiError(404, "User Does not exist");
  }

  const isPaswordValid = await user.isPasswordCorrect(password);
  if (!isPaswordValid) {
    throw new ApiError(401, " Invalid user credentials");
  }

  const { accessToken, refreshToken } =
    await genereteAccessTokendAndRefreshToken(user._id);
  // console.log("tokend", accessToken, refreshToken);
  // then get the Logged in user // this is optional
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: accessToken,
          refreshToken,
          loggedInUser,
        },
        "User LoggedIn Succefully",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    },
  );
  // now cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Succefully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken;

  if (refreshAccessToken) {
    throw new ApiError(401, "UnAuthorize Request");
  }
  try {
    const decodeToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    //get the user
    const user = await User.findById(decodeToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token user");
    }

    if (!incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Expired Token is Expired or used");
    }

    const { newRefreshToken, accessToken } =
      await genereteAccessTokendAndRefreshToken(user._id);

    const option = {
      httpsOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", newRefreshToken, option)
      .json(
        new ApiResponse(
          200,
          { accessToken, newRefreshToken },
          "Accesed Token Refreshd",
        ),
      );
  } catch (error) {
    console.log("error in refredToken", error);
    throw ApiError(401, error?.message || "Invalid refreshToken");
  }
});
export { registerUser, loginUser, logoutUser, refreshAccessToken };
