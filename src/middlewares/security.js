const helmet = require('helmet');
const cors = require('cors');
 
module.exports = (app) => {
  app.use(helmet());
  app.use(cors());
}; 