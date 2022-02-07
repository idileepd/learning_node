class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // calling Error(msg)
    this.msg = message; // I am doing this because unable to access parents object.
    this.statusCode = statusCode;
    // this.status = `${this.statusCode}`.startsWith('4') ? 'false' : 'error';
    // i am just using status :: Ture or False. here it's err so, Always false.
    this.status = false;
    //so, we are setting this because , some crazy things might happen in app if we set it we can differentiate operational errors and program erros (bugs).
    //then those bugs will not have this isOperational Property. in them.
    //other errors can be, :: ThirdParty package, Programming err, we won't have isOperational property to it, and we don't leak that info to client in prod.
    this.isOperational = true;

    //we want to show error where occured, but not here.
    //so, this way when this object is created, the constructor will be called and that constructor functioncall will not appear in stackTrace.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
