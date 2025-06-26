const wayinout = require("../service/wayinout.service");
const systemuser = require("../service/systemuser.service");

exports.RegisterWayIn = async (req, res) => {
  try {
    let User_data = {
      WI_CardID: req.body.WI_CardID,
      WI_FullName: req.body.WI_FullName,
      WI_Address: req.body.WI_Address,
      WI_LicensePlate: req.body.WI_LicensePlate,
      WI_LicenseProvince: req.body.WI_LicenseProvince,
      WI_VehicleType: req.body.WI_VehicleType,
      WI_Follower: req.body.WI_Follower,
      WI_Remarks: req.body.WI_Remarks,
      WI_FromCompany: req.body.WI_FromCompany,
      IC_ID: req.body.IC_ID,
      WI_ContactName: req.body.WI_ContactName,
    };

    let barcode = await wayinout.GetlastBarcode();

    User_data.WI_Barcode = barcode[0].running;

    let result_data = await wayinout.AddWayIn(User_data);

    res.send(barcode);
  } catch (err) {
    res.json(err);
    return;
  }
};

exports.GetwayInInformation = async (req, res) => {
  try {
    let barcode = req.body.QR_Code;

    let result_data = await wayinout.GetwayInInformation(barcode);

    res.send(result_data);
  } catch (err) {
    res.json(err);
    return;
  }
};

exports.Checkout = async (req, res) => {
  try {
    let barcode = req.body.QR_Code;
    let su_id = req.body.su_id;
    let remarks = req.body.remarks;

    let wayin_id = await wayinout.FindID_WayIn(barcode);

    let result_data = await wayinout.Checkout(
      wayin_id[0].WI_ID,
      su_id,
      remarks
    );

    res.send(result_data);
  } catch (err) {
    res.json(err);
    return;
  }
};

exports.GetList_WayInOut = async (req, res) => {
  try {
    let user_data = req.body;

    result_data = await wayinout.GetList_WayInOut(user_data);

    res.send(result_data);
  } catch (err) {
    res.json(err);
    return;
  }
};

exports.BeforeCheckOutValidate = async (req, res) => {
  try {
    let user_data = req.body;

    result_data = await wayinout.BeforeCheckOutValidate(user_data);

    res.send(result_data);
  } catch (err) {
    res.json(err);
    return;
  }
};

exports.InternalCheckin = async (req, res) => {
  try {
    let user_data = req.body;

    result_data = await wayinout.InternalCheckin(user_data);

    res.send(result_data);
  } catch (err) {
    res.json(err);
    return;
  }
};

exports.GetVisionType = async (req, res) => {
  try {
    let VT_Id = req.body;

    result_data = await wayinout.GetVisionType(VT_Id);

    res.send(result_data);
  } catch (err) {
    res.json(err);
    return;
  }
};

exports.UpdateVisionType = async (req, res) => {
  const { WI_ID, VT_ID } = req.body;

  if (!WI_ID || !VT_ID) {
      return res.status(400).json({ message: "WI_ID and VT_ID are required." });
  }

  if (isNaN(VT_ID)) {
      return res.status(400).json({ message: "Invalid VT_ID. Must be a number." });
  }

  try {
      const result1 = await wayinout.Get_WayInOutWithID(WI_ID);
      if (!result1 || result1.length === 0) {
          return res.status(404).json({ message: "WayInOut not found" });
      }

      if(result1[0].VT_ID == "ขอดูสินค้า")
      {

        if (result1[0].SU_IDInternal !== null) {

          const RolUser = await systemuser.Get_User(result1[0].SU_IDInternal);

          if (RolUser[0] && RolUser[0].SR_Code) {

              if(RolUser[0].SR_Code != "QA")
              {
                  return res.status(200).json({
                  success: true,
                  message: "Cannot change Status",
                  data: result1,
              });
              }
          }
        }
        else
        {
          return res.status(200).json({
            success: true,
            message: "Cannot change Status",
            data: result1,
        });
        }

      }

        await wayinout.UpdateVisionType(WI_ID, VT_ID);
        const result2 = await wayinout.Get_WayInOutWithID(WI_ID);
        return res.status(200).json({
              success: true,
              message: "Data Update Success",
              data: result2,
        });

  } catch (error) {
      console.error("Error updating vision type:", error);
      res.status(500).json({ message: "Error updating vision type", error: error.message });
  }
};




exports.GetStatus = async (req, res) => {
  const { WI_ID, VT_ID } = req.body;

  try {
    let result = await wayinout.GetStatus(WI_ID);

  } catch (error) {
    res.status(500).json({ message: "Error get status", error: error.message });
  }
};

exports.Get_WayInOutWithID = async (req, res) => {

  let WI_ID = parseInt(req.body.WI_ID, 10);
  let VT_ID = parseInt(req.body.VT_ID, 10);


  if (isNaN(WI_ID)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {

    let result_data = await wayinout.Get_WayInOutWithID(WI_ID);

    res.status(200).json({ success: true, message: "Data Update Success", data: result_data });
    
    // res.status(200).json(result_data);
  } catch (error) {
    console.error("Database Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.Get_WayInOutWithBarcode = async (req, res) => {
  console.log("Received payload from Frontend:", req.body);

  let WI_Barcode = req.body.WI_Barcode;



  if (isNaN(WI_Barcode)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {

    let  result_data = await wayinout.Get_WayInOutWithBarcode(WI_Barcode);

    res.status(200).json({ success: true, message: "Get Data Sucsess", data: result_data });
    
    // res.status(200).json(result_data);
  } catch (error) {
    console.error("Database Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};