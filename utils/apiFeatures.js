class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString }; // we will take out all items in req.query and create new object with them
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    /// replace :: gt, lt, gte, lte >> $gt, $lt, $gte, $lte
    queryStr = queryStr.replace(/\b(gte|lte|lt|gt)\b/g, (match) => `$${match}`);
    //we will update query :)
    this.query = this.query.find(JSON.parse(queryStr));
    //Helps in chaining, it returns entire object then next function in chaing will call other function.
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      // in mongoDB, we sort db.coll.find().sort(filed1 filed2) << seperated by spaces so, we will do that
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    //Helps in chaining, it returns entire object then next function in chaing will call other function.
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      // in mongoDB, we sort db.coll.find().select(name duration) << seperated by spaces so, we will do that
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      //we exclude some things by default, - minus will make it exlucting it and getting all
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    //4)pagination
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 10;
    const skip = (page - 1) * limit;
    // skip :: amount of results that should be skipped before actually querying data, limit:: amount of results that we want in the query
    //page=2&limit=10 >> means >> 1-10 -> page-1, 11-20 -> page-2, ...
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
