import express from 'express';
import generalLimiter from './util/generalLimiter.js';
import PagesRouter from './routers/pagesRouter.js';

const app = express();

app.use(generalLimiter);
app.use(PagesRouter);
app.use(express.static("public"));

// TODO: find ud af om public mappen kan virker eller om der skal ske noget andet her.




const PORT = Number(process.env.PORT);




app.listen(PORT, () => {
    console.log("Server is running on port: ", PORT); 
});