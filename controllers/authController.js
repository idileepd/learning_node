const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/email');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const AppError = require('../utils/appError');

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  //Token generation
  const payload = {
    id: user._id,
  };
  const token = signToken(payload);

  //cookie generation logic.
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: true,
    httpOnly: true,
  };
  console.log(cookieOptions);
  console.log(process.env.NODE_ENV);
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  // res.cookie('jwt', token, cookieOptions);
  // res.clearCookie('sds');
  res.cookie('jwt', token, cookieOptions);
  // console.log(res.cookie);
  //removing password.
  user.password = undefined;
  res.status(statusCode).json({
    status: true,
    token,
    data: {
      user: user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1)Check if email and password actually exist.
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  //2) check if user exist and password is corect
  //here we already disabled password to output in model. now we have to explicitly select the password.
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    //actually I can do better. whether incorrect user or only password.
    //401 :: Unauthorized. orFOR BIDDEN
    return next(new AppError('Incorrect email or password', 401));
  }
  //3) If everything is ok, send token to client.
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting the token and check if it is exist.
  let token;
  if (req.headers.authorization) {
    token = req.headers.authorization;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }
  //2) Verification token.
  // it is synchronours function, but we don't want to break async await pattern so, convert it to promisify Function.
  //convert to promisify function.
  const decodedPayload = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );

  //3) if user still exist.
  const freshUser = await User.findById(decodedPayload.id);
  if (!freshUser) {
    return next(
      new AppError('The user belonging to this token does no longer exist', 401)
    );
  }
  //4) Check if user changed password after jwt token is issued.
  if (freshUser.changedPasswordAfter(decodedPayload.iat)) {
    return next(
      new AppError(
        'User recently changed the password. Please login Again',
        401
      )
    );
  }

  // GRANT TTHE ACCESS TO PROTECTED ROUTE.
  req.user = freshUser; // useful in authorization.
  next();
});

// ...roles will take all parameters into an array and returns a function that takes req, res, next, so, we have access to roles array because of closure.
exports.restictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide'],
    // if user role, is not in the restricted one.
    if (!roles.includes(req.user.role)) {
      return next(
        //403 >> Forbidden.
        new AppError('You are not authorized to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  console.log('GO TO forgot PASS');

  //1) Get user based on posted email.
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address', 404));
  }

  //2)Generate random reset token
  const resetToken = user.createPasswordResetToken();
  //while we save this, validators will be run and validation will be failed. so, we disable validators.
  await user.save({ validateBeforeSave: false });

  //3)send it to user's email.
  // next();
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password ? Submit a patch request with your new password and PassConfirm to : ${resetURL} .\n If you didn't forget your password ignore this email!`;

  try {
    //in case email fails to send then we send err, and also set back the resetpassword token.
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token : valid for 10 minutes ',
      message,
    });

    res.status(200).json({
      status: true,
      message: 'Token sent to email',
    });
  } catch (error) {
    console.log(error);
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error in sending the email. Try again later',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  console.log('GO TO RESET PASS');
  //1) Get the user based on the token,
  //we got encrypted tok in DB and non-encrypted token sent to user. so, we have to compare them.
  //encrypt user send token and compare it with DB toke.
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  // we have get the usr with this token and also we need compare the current Date and passwordResetTokenExpires. (clear way is there)
  console.log('HASHED TOKEN,', hashedToken);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  });

  // Fixed a name err bug
  // console.log('USER ::: ', user);
  // console.log('userPasswordRestTokenExpires,', user.passwordResetTokenExpires);
  // const dat = user.passwordResetTokenExpires;
  // console.log('Stored Date', Date(dat));
  // console.log('current dateTime', Date.now());

  //2) If token has not expired, and there is user, set the new password.
  if (!user) {
    return next(new AppError('Token is invalid or Expired.', 400));
  }
  //3) update changePasswordAt property for the user.
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  // console.log('USER BEFORE SAVE', user);
  await user.save({ validateBeforeSave: true }); // we need to turn validatos here.

  //4) Log the user in, send JWT.
  createSendToken(user, 200, res);
});

exports.updateMyPassword = catchAsync(async (req, res, next) => {
  //1)Get the user from the collection,
  //this is for loggedin users.
  const user = await User.findById(req.user.id).select('+password');

  //2) check if posted password is correct.
  //we need check whether both passwords of user and db password.
  if (!user.correctPassword(req.body.passwordCurrent, user.password)) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  //3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save(); //we want happen password validation.
  // we don't do this :: findbyidAndUpdate.. because we are unable to run the validation on password Confirm. because it is running on only ONSAVE. not on UPDATE.
  //also, 'save' middlewares won't work.

  //4) Log user in, send JWT.
  createSendToken(user, 200, res);
});
