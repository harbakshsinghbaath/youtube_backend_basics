import dotenv from "dotenv";
import mongoose from "mongoose";
import {DB_NAME} from "./constants.js";
import connectDB from "./db/index.js";
dotenv.config({
    path:"./env"
})
connectDB()
.then(() => {
    app.listen(process.env.MONGODB_URL|| 8000, () =>{
        console.log(`server is running at port ${process.env.MONGODB_URL}`)
    })
})
    .catch((err) => {
        console.log("Mongo db connection failed", err);
    })
/*
import express from "express";

const app = express();

(async () =>{
    try{
      await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error",() =>{
            console.log("ERr:" ,error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`)
        })

    }catch(err){
        console.log("error: ", err);
        throw err;
    }

})()*/
