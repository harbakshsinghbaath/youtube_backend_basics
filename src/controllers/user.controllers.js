import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.models.js";
import{uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/apiResponse.js";

const registerUser = asyncHandler( async(req,res) => {
    // user details - username full name email password
    const {username, fullName, email, password} = req.body;
    console.log("email:", email, "username:", username, "fullName:", fullName, "password:", password);

    //validation for fields
    if(!username || !email || !password || !fullName){
        throw new ApiError(400, "Fields missing")
    }

    //check if user exists
    const existingUser = await User.findOne({
        $or: [{email},{username}]
    })
    if(existingUser){
        throw new ApiError(409, "Username or email already exists")
    }

    // check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }
    //upload them to cloudinary
    const avatar =  await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }
    //create user object create entry in db
    const user =  await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    //remove password and refresh token from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //check for user creation? return response. send error
    if(!createdUser){
        throw new ApiError(500, "User not registered");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "Userregistered succesfully")
    )


})

export {registerUser};