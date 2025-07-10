import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.models.js";
import{uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/apiResponse.js";
import jwt from 'jsonwebtoke';

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
        new ApiResponse( 200, {user: loggedInUser, accessToken, refreshToken},"User looged in successfully")
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

const refreshAccessToken = asyncHandler(async(req,res) => {
    try{
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request")
        }

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken._id)

        if (!user) {
            throw new ApiError(401, "invalid refresh token")
        }

        if (incomingRefreshToken != user?.refreshToken) {
            throw new ApiError(401, "invalid refresh token")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const newToken = await generateAcessAndRefreshToken(user._id)

        return res.status(200).cookie("accessToken", newToken.accessToken, options).cookie("refreshToken", newToken.refreshToken, options).json(
            new ApiResponse(200, {accessToken, refreshToken},
                "Accesstoken refreshed succesfully")
        )
    }catch(error){
        throw new ApiError(401, "refreshtoken invalid")
    }

})

const changeCurrentPassword = asyncHandler( async(req,res) => {
    const {oldPassword, newPassword} = req.body;
    if(!oldPassword || !newPassword){
        throw new ApiError(400, "Fields missing")
    }

    const user = await User.findById(req.user?._id)
    const passwordV = await user.isPasswordValid(oldPassword, newPassword);

    if(!passwordV){
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false})

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed succesfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=> {
    return res
        .status(200)
        .json( new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateUserAvatar = asyncHandler( async(req,res) => {
    const avatarLocalPath  = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }
    const avatarN  = await uploadOnCloudinary(avatarLocalPath)
    if(!avatarN.url){
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar: avatarN.url
            }
        },
        {new: true}
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Avatar updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400,"Username is missing" )
    }

    const channel = await User.aggregate([{
        {
            $mat ch: {
                username: username
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount: {$size: "$subscribers"},
                subscribedToCount: {$size: "$subscribedTo"},
                isSubscribed:{
                    $cond:{
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false

                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscried:1,
                email: 1,
                coverImage: 1,
                avatar: 1,

            }
        }


}]);

    if(!channel?.length()){
        throw new ApiError(404, "Channel not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"))
}



export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateUserAvatar, getUserChannelProfile};