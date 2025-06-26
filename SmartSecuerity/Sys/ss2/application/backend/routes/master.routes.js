
module.exports = app => {
    let master = require("../controllers/master.controller");

    app.post("/master/Get_department",master.Get_department);
    app.post("/master/Get_IntenalCompony",master.Get_IntenalCompony);

};