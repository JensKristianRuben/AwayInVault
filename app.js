import express from 'express';
import generalLimiter from './util/generalLimiter.js';
import PagesRouter from './routers/pagesRouter.js';
import loginRouter from './routers/loginRouter.js';

const app = express();

app.use(express.static("public"));
app.use(generalLimiter);
app.use(express.urlencoded({ extended: true }));


app.use(PagesRouter);
app.use(loginRouter);






const PORT = Number(process.env.PORT);




app.listen(PORT, () => {
    console.log("Server is running on port: ", PORT); 
});