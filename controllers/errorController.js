const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  //400: for bad request.
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  //we need to loop over all objects in error:errors{....}
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value`;
  return new AppError(message, 400);
};

const handleJWTError = (err) => {
  const message = 'Invalid token. Please login again!';
  return new AppError(message, 401);
};

const handleJWTExpiredError = (err) => {
  const message = 'Your token expired. Please login again!';
  return new AppError(message, 401);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendErrorProd = (err, res) => {
  // // Operational, trusted errors: send message to client.
  // console.log('PROD ERR :: :');
  // console.log(err.isOperational);
  // console.log(err.message);
  // console.log(err);
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.msg, // I have created a prop of msg that takes my operational err msg.
    });
  }
  // programming or other unknown errors: wdont' want to leak error details to client
  else {
    //1) Log error
    console.log(
      '***************SOME NON OPERATIONAL ERR OCCURED***************',
      err
    );
    //send generic message.
    res.status(500).json({ status: false, message: 'Something went wrong !' });
  }
};

module.exports = (err, req, res, next) => {
  //   console.log(err.stack); // ** this will show where this error happened.
  //we can get errors from places where we don't know and it will don't set error code . so, we set it.
  err.statusCode = err.statusCode || 500; // 500-internal server err.
  err.status = err.status || false;

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    //we use this error now to create new errors.
    let error = { ...err };

    //** Handlind Database Errors */
    // this function will create and error that has isOperational = true,
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    // handles duplicate key error by mongoDB Driver.
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);

    //** Handling Token Errors */
    //JSON WEB Token signature invalid error.
    if (err.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError(error);

    sendErrorProd(error, res);
  }
};
