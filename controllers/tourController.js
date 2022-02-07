const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = 'price,-ratingsAverage';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  //Execute Query
  const tours = await features.query;

  //Send Response
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);
  // Tour.findOne({_id: req.params.id}) // same

  if (!tour) {
    //alway return. otherwise 2responses can't send err.
    return next(new AppError(`No tour found with ID : ${req.params.id}`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});

exports.createTour = catchAsync(async (req, res, next) => {
  // const newTour = new Tour({}); // creates a tour model obj
  // newTour.save(); // save tour with new Id in Tour Collection in DB
  //we call directly metod on model, the following does same method
  const newTour = await Tour.create(req.body);
  res.status(201).json({
    status: true,
    data: {
      tour: newTour,
    },
  });
});

exports.updateTour = catchAsync(async (req, res, next) => {
  //get doc, and update.
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    //we will get back the updated doc
    new: true,
    //runs validators in Tour Model against this update
    runValidators: true,
  });
  if (!tour) {
    //alway return. otherwise 2responses can't send err.
    return next(new AppError(`No tour found with ID : ${req.params.id}`, 404));
  }

  res.status(200).json({
    status: true,
    data: {
      tour,
    },
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);
  if (!tour) {
    //alway return. otherwise 2responses can't send err.
    return next(new AppError(`No tour found with ID : ${req.params.id}`, 404));
  }
  // 204 for deletion operation
  res.status(204).json({
    status: true,
    data: {},
  });
});

// exports.getTourStats = async (req, res) => {
//   try {
//     //aggregration is done in stages and each step documents are travelled.
//     const stats = Tour.aggregate([

//     ]);
//   } catch (error) {
//     res.status(400).json({
//       status: false,
//       data: error,
//     });
//   }
// };
