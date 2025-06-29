import mongoose from "mongoose";
import {DB_NAME} from "./constants.js";
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
