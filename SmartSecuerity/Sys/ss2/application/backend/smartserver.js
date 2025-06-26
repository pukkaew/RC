const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./node_modules/cors');
const jwt = require('./Helper/jwt');

const app = express();

const corsOptions = {
  origin: ['http://localhost','http://192.168.88.139','http://192.168.1.74','192.168.88.135:5174','192.168.1.16','*','http://192.168.88.200:3000','http://localhost:8080'],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(bodyParser.json({limit: '50mb'}));

app.use(bodyParser.urlencoded({ extended: true }));


//app.use(jwt());

//app.use('/users', require('./users/users.controller'));


app.get("/home", (req, res) => {
    res.json({ message: "Welcome to Marine Gold Web API" });
  });

require("../backend/routes/systemuser.routes")(app);
require("../backend/routes/master.routes")(app);
require("../backend/routes/wayinout.routes")(app);


app.listen(7000, () => console.log('server run listening on port 7000'));