
module.exports = app => {
    let wayinout = require("../controllers/wayinout.controller");

    app.post("/wayinout/RegisterWayIn",wayinout.RegisterWayIn);
    app.post("/wayinout/GetwayInInformation",wayinout.GetwayInInformation);
    app.post("/wayinout/Checkout",wayinout.Checkout);
    app.post("/wayinout/GetList_WayInOut",wayinout.GetList_WayInOut);
    app.post("/wayinout/BeforeCheckOutValidate",wayinout.BeforeCheckOutValidate);
    app.post("/wayinout/InternalCheckin",wayinout.InternalCheckin);
};