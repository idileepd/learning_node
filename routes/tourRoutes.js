const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');

const router = express.Router();

//top5 cheapest tours :: ALIASING
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

// router.param('id', tourController.checkID);
// GET  : /tours >> give all tours
// POST : /tours >> add tour
router
  .route('/')
  .get(
    authController.protect,
    authController.restictTo('admin', 'lead-guide'),
    tourController.getAllTours
  )
  .post(tourController.createTour);

//we will get tour by id :: tours/:id << all operation on this specific tour
// GET    : /tours/id >> get that particular tour
// PATCH  : /tours/id >> update that tour
// DELETE : /tours/id >> delete that tour
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(
    authController.protect,
    authController.restictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
