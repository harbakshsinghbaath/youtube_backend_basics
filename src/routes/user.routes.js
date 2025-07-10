import {Router} from 'express';
import {
    getUserChannelProfile,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateUserAvatar
} from "../controllers/user.controllers.js";
import {upload} from "../middleware/multer.middleware.js";
import {verifyJWT} from "../middleware/auth.middleware.js";

const router = Router();
router.route('/register').post(upload.fields([
    { name: 'avatar',
        maxCount: 1
    },
    { name: 'coverImage',
        maxCount: 1 }
]),
    registerUser);

router.route('/login').post(loginUser)

//secured
router.route('/logout').post(verifyJWT, logoutUser)
router.route('/refreshToken').post( refreshAccessToken)
//update user a atar
router.route('/updateAvatar').patch(verifyJWT, upload.single('avatar'), updateUserAvatar)
//get user channel profile
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)


export default router;