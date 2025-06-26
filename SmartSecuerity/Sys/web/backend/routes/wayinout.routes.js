
module.exports = app => {
    let wayinout = require("../controllers/wayinout.controller");

    app.post("/wayinout/RegisterWayIn",wayinout.RegisterWayIn);
    app.post("/wayinout/GetwayInInformation",wayinout.GetwayInInformation);
    app.post("/wayinout/Checkout",wayinout.Checkout);
    app.post("/wayinout/GetList_WayInOut",wayinout.GetList_WayInOut);
    app.post("/wayinout/BeforeCheckOutValidate",wayinout.BeforeCheckOutValidate);
    app.post("/wayinout/InternalCheckin",wayinout.InternalCheckin);
    app.post("/wayinout/GetVisionType", wayinout.GetVisionType);  
    app.post("/wayinout/UpdateVisionType", wayinout.UpdateVisionType);
    app.post("/wayinout/Get_WayInOutWithID", wayinout.Get_WayInOutWithID);
    app.post("/wayinout/Get_WayInOutWithBarcode",wayinout.Get_WayInOutWithBarcode);
};