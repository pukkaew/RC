
module.exports = app => {
    let systemUser = require("../controllers/systemuser.controller");

    app.post("/systemuser/Get_SystemUser",systemUser.Get_SystemUser);
    app.post("/systemuser/NewUser",systemUser.NewUser);
    app.post("/systemuser/UpdateUser",systemUser.UpdateUser);
    app.post("/systemuser/CancelUser",systemUser.CancelUser);
    app.post("/systemuser/GetList_User",systemUser.GetList_User);
    app.post("/systemuser/Get_User",systemUser.Get_User);

};