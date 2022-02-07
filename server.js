const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('UNHANDLED EXCEPTION :: ** SHUTTING DOWN...');
  console.log(err);
  //since sync code so, no need of server.

  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

// const DBURI = process.env.DATABASE.replace(
//   '<PASSWORD>',
//   process.env.DATABASE_PASSWORD
// );

mongoose
  // .connect(DBURI, {
  .connect(process.env.DATABASE_LOCAL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() =>
    // console.log(connObj.connections);
    console.log('<<< DB Connection successfull >>>')
  );

//locally we handling exception.
// .catch((e) => {
//   console.log(e);
// });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  // console.log(
  //   '*******************',
  //   err.name,
  //   ':',
  //   err.message,
  //   '*******************'
  // );
  //shutdown app. if no db conn.
  //code :: 0>> success, 1 >> uncaught exception.
  console.log('UNHANDLED REJECTION :: ** SHUTTING DOWN...');
  console.log(err);

  // process.exit(1);

  //we close server and shutdown app. so, server will be given time to complete req,being handled and after that server will be killed.
  server.close(() => {
    process.exit(1);
  });
});
