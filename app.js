import express from 'express';
import generalLimiter from './util/generalLimiter.js';

const app = express();

app.use(generalLimiter);




const PORT = Number(process.env.PORT);




app.listen(PORT, () => {
    console.log("Server is running on port: ", PORT); 
});