const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email!'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      //// ***************
      /// This only works obj.CREATE() or on obj.SAVE() .!!!
      validator: function (val) {
        return val === this.password;
      },
      message: 'Password and confirm-password are not same',
    },
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetTokenExpires: Date,
});

////--------------------------------Mongoose Middleware --------------------

// pressave >> before getting data and saving into db we wiill encryprt passwords.
// ONLY RUN this function when password is actually modified.
// we want a function that run before save. i.e When user changing password we want to encrypt it and save that into password and remove conformPassword.
userSchema.pre('save', async function (next) {
  //we want to encypt only when password being updated. or creating new.
  //ex: if user wants to update email, then in that case we don't update password.
  //so, if password is not being modified we just return.
  if (!this.isModified('password')) return next();

  //HASH the password with cost 12. salt - cost parameter. how cpu intensive it should be. 12 is best.
  this.password = await bcrypt.hash(this.password, 12);

  //to not persist in DB. we don't want persist in DB.
  //delete the confirm password
  this.passwordConfirm = undefined;
  next();
});

//when user changed the password we want to change property value of passwordChangedAt, to make tokens expired.
userSchema.pre('save', async function (next) {
  //in case user is not trying to modify the password, so don't modify password prop then don't modift passwordChangedAt.
  //in case if we are creting new doc.> we don't modify password, then don't modify.
  if (!this.isModified('password') || this.isNew) return next();

  //we want create password 1second before the token issue. (HACK.)
  //because sometimes password will be issued before changePasswordAt actuall chage.
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//we want to hide inactive users to output.
userSchema.pre(/^find/, function (next) {
  //any find operation we'll do this.
  // this.find({ active: true }); // shows only docs that are true only. but some docs has no sttus.
  //show all active and no active status prop uesrs
  this.find({ active: { $ne: false } });
  next();
});

// *** instance method. >> a method that will be available on all documents on certain collection.

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // ideally we do, this.password, but we disabled it.
  //so, we passd the passwords,
  //candidate password :: while user login he sent password
  //user password: which is actually in DB
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  //this > points to current document.
  //if passwordChnagedAt exist, i.e user never changed password.
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; // ture will sent if 100<200 i.e user changed in further that jwt issued. 300<200 : return false, because jwt issued after password change.
  }

  //FALSE means not changed.
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  //create a reset token
  const resetToken = crypto.randomBytes(32).toString('hex');

  //encrypt that token before save in DB. (We are saving the encrypted token in DB.)
  //here we are not saving this in Db. we have to do it in called function. here we just modified it.
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000; // for 10 minutes, Timestamp will get.
  console.log('reset Token', resetToken);
  console.log('password Reset Token', this.passwordResetToken);
  //send it via email.

  //Note :: encrypted reset token in DB is useless to change the password
  //we are sending resetToken to user.
  //we will gng to compare user sent resetToken and encrypted one in DB.
  return resetToken;
};

//create user model and link collection
const User = mongoose.model('User', userSchema, 'usersCollection');

module.exports = User;
