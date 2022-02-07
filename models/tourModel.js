const mongoose = require('mongoose');
const slugify = require('slugify');
// const validator = require('validator');
///-----------------------------------MONGOOSE SCHEMA--------------------------------------
//schema
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      // removes all white space beggining and end
      trim: true,
      maxlength: [40, 'A tour must have less  or equal to 40 charaters'],
      minlength: [10, 'A tour must more than  or equal to 0 charaters'],
      // validate: [validator.isAlpha, 'Tour name must only contain character'],
    },
    slug: {
      type: String,
    },
    duration: {
      type: Number,
      required: [true, 'Atour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Dificulty is either: easy, medium, difficulty',
      },
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      max: [5, 'A rating must below 5.0'],
      min: [1, 'A rating must above 1.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        message: 'priceDiscount {VALUE} must lessthan price',
        validator: function (val) {
          // ****** The  'this' pnly points to current doc, on NEW document creation. i.e while on updation it wont work.
          return val < this.price;
        },
      },
    },
    summary: {
      type: String,
      // removes all white space beggining and end
      trim: true,
      required: [true, 'A tour must have summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    //to define images are array
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
  },
  //when we output this data as obje or json we will enable virtual properties
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

///----------------------------------VIRTUAL PROPS------------------------------------------------------
//we use normal function rather than arrow function, because normal function will have accesses to this.
//FAT MODELS THIN Controllers principle
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

///-----------------------------------MONGOOSE-MIDDLEWARE-----------------------------------------------------------
//1)DOCUMENT MIDDLEWARE, runs ONLY before .save() and .create().
// THIS >> Keyword will point to currently being saved document. every middle ware has access to it.
// *** when accessing current document. the 'this' will only work on create only. on update we don't have access to 'this'.
tourSchema.pre('save', function (next) {
  // console.log(this);
  //*** Note : when u define fields that are not in schema, they simply ignored. before save we added some fields, if they are not in Schema they will be ignored. */
  this.slug = slugify(this.name, { lower: true });
  next();
});
// we can have many pre middle wares, the are also called preHOOKS, executes one after other one by one.
tourSchema.pre('save', function (next) {
  console.log('Will save Document');
  next();
});

tourSchema.post('save', function (doc, next) {
  console.log(doc);
  next();
});

//2)QUERY MiddleWare.
//this will work only for find().
// tourSchema.pre('find', function (next) {

//thiswill work for all operations that start with find
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  // this.find({ secretTour: { $ne: false } }); // u get all docs because other docs seted secretTour as nothing.
  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`FIND Query Took ${Date.now() - this.start} milliSeconds !!`);
  // console.log(docs);
  next();
});

// tourSchema.pre('findOne', function (next) {
//   this.find({ secretTour: { $ne: true } });
//   next();
// });

///----------------------------------------------COMPILING SCHEMA TO MODEL, COLLECTION---------
//model, compile schema to model
const Tour = mongoose.model('Tour', tourSchema, 'toursCollection');

module.exports = Tour;
