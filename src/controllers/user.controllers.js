import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.models.js";
import{uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/apiResponse.js";

const generateAcessAndRefreshToken = async (userId) => {
    try{
      const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    }catch(error){
       throw new ApiError(500, "Something went wrong while generating tokens")
    }
}

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

const loginUser = asyncHandler( async(req,res) => {
    //user details
    const {username, email, password} = req.body;
    //verify if data present(username or email)
    if(!email || !password){
        throw new ApiError(400, "Fields missing");
    }
    //find user in db
     const user = await User.findOne({
         email
     })

    if(!user){
        throw new ApiError(404, "User doesnt exist")
    }
    //compare with db password
    const passwordValid = await user.isPasswordValid(password)
    if(!passwordV){
        throw new ApiError(404, "Ivalid user credentials")
    }
    //if verified access and refresh token
    const {accessToken, refreshToken} = await generateAcessAndRefreshToken(user._id);
    //send cookies
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse( 200, {user: loggedInUserm accessToken, refreshToken},"User looged in successfully")
    )
})

const logoutUser = asyncHandler( async(req,res) => {
    await User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken:undefined
        }
    },{
        new:true
    })

    const options = {
        httpOnly: true,
        secure:true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, "User logged out"))
})



export {registerUser, loginUser, logoutUser};