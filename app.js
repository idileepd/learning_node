const express = require('express');
const morgan = require('morgan');
// const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const AppError = require('./utils/appError');
const globalErrorHandlere = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

console.log(`App Mode:: <<<<-${process.env.NODE_ENV}->>>>`);

//-------------------------- 1) MIDDLEWARES

//Security HTTP headers
app.use(helmet());

//Development looging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests Middleware.
//we allow 100req, for one in 1hr window.
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});
app.use('/api', limiter);

// app.use(cookieParser());

//Body parser, reading data from body into req.body.
// app.use(express.json()); //limiting body size
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
// filter out all $ signs happens for quert injection attacks
app.use(mongoSanitize());
// Data sanitization against XSS.
//helps to prevent XSS Attacks.(prevent malisious html)
app.use(xss());

//serving static files. MW
app.use(express.static(`${__dirname}/public`));

//Test Middleware.
// app.use((req, res, next) => {
//   console.log('Hello from the middleware 👋');
//   next();
// });

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});

// 3) ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

//route handler for 404 routes. all>> all url's
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: false,
  //   message: `Can't find ${req.originalUrl} on the server`,
  // });
  //// CREATING ERR - we use buildin Error constorctor to create error.
  /// pass a string to Error('String'), that String will be err.message.

  // old way
  // const err = new Error(`Can't find ${req.originalUrl} on the server`);
  // err.status = false;
  // err.statusCode = 404;
  // we need to pass err, to error handler.
  // if next function see's any argument then, no matter what it is express automatically assume there is err
  // express will skip all middle wares and take us to global error handling middleware.
  // next(err);

  //new way
  next(new AppError(`Can't find ${req.originalUrl} on the server`, 400));
});

//Error handling MIDDLEWARE ::
// express already comes with middleware handlers outof box
// to define a error handling middle ware function all we need to do is  give middleware function 4 arguments.
//only call it when there is err.
app.use(globalErrorHandlere);

module.exports = app;
