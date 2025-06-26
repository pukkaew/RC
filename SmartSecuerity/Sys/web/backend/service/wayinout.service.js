const config = require("../config/Mssql.config.js");
const sql = require("mssql");

module.exports = {
  GetlastBarcode,
  AddWayIn,
  GetwayInInformation,
  Checkout,
  FindID_WayIn,
  GetList_WayInOut,
  Get_WayInOut,
  BeforeCheckOutValidate,
  InternalCheckin,
  GetVisionType,
  UpdateVisionType,
  Get_WayInOutWithID,
  Get_WayInOutWithBarcode,
  Get_WayInOut_VT_IDWithBarcode
};

async function AddWayIn(User_data) {
  try {
    var Query =
      "INSERT INTO  WayIn (WI_Barcode,WI_FullName,WI_Address,WI_LicensePlate,WI_LicenseProvince,WI_VehicleType,WI_Follower,WI_Remarks,WI_FromCompany,SU_ID,WI_RecordedOn,WI_CardID,WI_Gender,WI_ContactName)VALUES('" +
      User_data.WI_Barcode +
      "','" +
      User_data.WI_FullName +
      "','" +
      User_data.WI_Address +
      "','" +
      User_data.WI_LicensePlate +
      "','" +
      User_data.WI_LicenseProvince +
      "' ,'" +
      User_data.WI_VehicleType +
      "'," +
      parseInt(User_data.WI_Follower) +
      " ,'" +
      User_data.WI_Remarks +
      "','" +
      User_data.WI_FromCompany +
      "',2,CURRENT_TIMESTAMP,'','','" +
      User_data.WI_ContactName +
      "')";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error.message);
  }
}

async function GetlastBarcode() {
  try {
    var Query = "SELECT MAX(WI_Barcode) + 1 as running FROM WayIn ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error.message);
  }
}

async function GetwayInInformation(barcode) {
  try {
    var Query =
      "SELECT WI_ID,WI_Barcode,WI_CardID,WI_FullName,WI_Gender,WI_Address,WI_LicensePlate " +
      ",WI_LicenseProvince,WI_VehicleType,WI_InternalDivision,WI_Follower,WI_Remarks " +
      ",SU_ID,WI_RecordedOn,IC_ID,ID_ID,VT_ID,WI_FromCompany,WI_Images,WI_ContactName " +
      " FROM WayIn  where WI_Barcode = '" +
      barcode +
      "' ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error.message);
  }
}

async function Checkout(wayin_id, SU_ID, Remark) {
  try {
    var Query =
      "INSERT INTO WayOut(WI_ID,SU_ID,WO_RecordedOn,WO_Remarks)VALUES(" +
      wayin_id +
      "," +
      SU_ID +
      ",CURRENT_TIMESTAMP,'" +
      Remark +
      "')";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error.message);
  }
}

async function FindID_WayIn(barcode) {
  try {
    var Query = "SELECT WI_ID FROM WayIn where WI_Barcode = '" + barcode + "' ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error.message);
  }
}

async function GetList_WayInOut() {
  try {
    var Query =
      "SELECT top 500 wi.WI_ID,WI_Barcode,WI_CardID,WI_FullName,WI_Gender,WI_Address,WI_LicensePlate,WI_LicenseProvince,WI_VehicleType,WI_InternalDivision,WI_Follower,WI_Remarks,WI_RecordedOn,WI_FromCompany,WI_Images,(su1.SU_Name1 + ' ' + su1.SU_Name2) as UserInternal,WO_RecordedOn,SU_IDInternalRecordedOn," +
      "(su2.SU_Name1 + ' ' + su2.SU_Name2) as UserWayOut,(su3.SU_Name1 + ' ' + su3.SU_Name2) as UserWayIn,CASE WHEN VT_ID = 40 THEN 'ฝาก/เบิกสินค้า' WHEN VT_ID = 39 THEN  'ซัพพลายเออร์ (Supplier)' WHEN VT_ID = 18 THEN 'ติดต่อประสานงาน'  WHEN VT_ID = 46 THEN 'ขอดูสินค้า' else '' END as VT_ID  " +
      "FROM WayIn as wi " +
      "LEFT JOIN WayOut as wo on wi.WI_ID = wo.WI_ID " +
      "LEFT JOIN SystemUser as su1 on wi.SU_IDInternal = su1.SU_ID " +
      "LEFT JOIN SystemUser as su2 on wo.SU_ID = su2.SU_ID " +
      "LEFT JOIN SystemUser as su3 on wi.SU_ID = su3.SU_ID " +
      "ORDER BY wi.wi_id desc ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error.message);
  }
}

async function Get_WayInOut(User_data) {
  try {
    var Query =
      "SELECT top 500 wi.WI_ID,WI_Barcode,WI_CardID,WI_FullName,WI_Gender,WI_Address,WI_LicensePlate,WI_LicenseProvince,WI_VehicleType,WI_InternalDivision,WI_Follower,WI_Remarks,WI_RecordedOn,WI_FromCompany,WI_Images,(su1.SU_Name1 + ' ' + su1.SU_Name2) as UserInternal,WO_RecordedOn,SU_IDInternalRecordedOn," +
      "(su2.SU_Name1 + ' ' + su2.SU_Name2) as UserWayOut,(su3.SU_Name1 + ' ' + su3.SU_Name2) as UserWayIn " +
      "FROM WayIn as wi " +
      "LEFT JOIN WayOut as wo on wi.WI_ID = wo.WI_ID " +
      "LEFT JOIN SystemUser as su1 on wi.SU_IDInternal = su1.SU_ID " +
      "LEFT JOIN SystemUser as su2 on wo.SU_ID = su2.SU_ID " +
      "LEFT JOIN SystemUser as su3 on wi.SU_ID = su3.SU_ID " +
      "where WI_Barcode = '" +
      User_data.WI_Barcode +
      "'  ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error.message);
  }
}

async function Get_WayInOutWithID(WI_ID) {
  try {

    const Query = `
      SELECT TOP 500 
        wi.WI_ID, WI_Barcode, WI_CardID, WI_FullName, WI_Gender, WI_Address, WI_LicensePlate,
        WI_LicenseProvince, WI_VehicleType, WI_InternalDivision, WI_Follower, WI_Remarks, 
        WI_RecordedOn, WI_FromCompany, WI_Images, 
        (su1.SU_Name1 + ' ' + su1.SU_Name2) AS UserInternal, 
        WO_RecordedOn, SU_IDInternalRecordedOn, SU_IDInternal,
        (su2.SU_Name1 + ' ' + su2.SU_Name2) AS UserWayOut, 
        (su3.SU_Name1 + ' ' + su3.SU_Name2) AS UserWayIn, 
        CASE 
          WHEN VT_ID = 40 THEN 'ฝาก/เบิกสินค้า' 
          WHEN VT_ID = 39 THEN 'ซัพพลายเออร์ (Supplier)' 
          WHEN VT_ID = 18 THEN 'ติดต่อประสานงาน'  
          WHEN VT_ID = 46 THEN 'ขอดูสินค้า' 
          ELSE '' 
        END AS VT_ID
      FROM WayIn AS wi 
      LEFT JOIN WayOut AS wo ON wi.WI_ID = wo.WI_ID 
      LEFT JOIN SystemUser AS su1 ON wi.SU_IDInternal = su1.SU_ID 
      LEFT JOIN SystemUser AS su2 ON wo.SU_ID = su2.SU_ID 
      LEFT JOIN SystemUser AS su3 ON wi.SU_ID = su3.SU_ID 
      WHERE wi.WI_ID = @WI_ID
    `;

    let pool = await sql.connect(config.sql);
    const eventsList = await pool
      .request()
      .input("WI_ID", sql.Int, WI_ID)
      .query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.error("Error in Get_WayInOutWithID:", error.message);
    throw error;
  }
}

async function Get_WayInOutWithBarcode(WI_Barcode) {
  try {

    const Query = `
      SELECT TOP 500 
        wi.WI_ID, WI_Barcode, WI_CardID, WI_FullName, WI_Gender, WI_Address, WI_LicensePlate,
        WI_LicenseProvince, WI_VehicleType, WI_InternalDivision, WI_Follower, WI_Remarks, 
        WI_RecordedOn, WI_FromCompany, WI_Images, 
        (su1.SU_Name1 + ' ' + su1.SU_Name2) AS UserInternal, 
        WO_RecordedOn, SU_IDInternalRecordedOn, SU_IDInternal,
        (su2.SU_Name1 + ' ' + su2.SU_Name2) AS UserWayOut, 
        (su3.SU_Name1 + ' ' + su3.SU_Name2) AS UserWayIn, 
        CASE 
          WHEN VT_ID = 40 THEN 'ฝาก/เบิกสินค้า' 
          WHEN VT_ID = 39 THEN 'ซัพพลายเออร์ (Supplier)' 
          WHEN VT_ID = 18 THEN 'ติดต่อประสานงาน'  
          WHEN VT_ID = 46 THEN 'ขอดูสินค้า' 
          ELSE '' 
        END AS VT_ID
      FROM WayIn AS wi 
      LEFT JOIN WayOut AS wo ON wi.WI_ID = wo.WI_ID 
      LEFT JOIN SystemUser AS su1 ON wi.SU_IDInternal = su1.SU_ID 
      LEFT JOIN SystemUser AS su2 ON wo.SU_ID = su2.SU_ID 
      LEFT JOIN SystemUser AS su3 ON wi.SU_ID = su3.SU_ID 
      WHERE wi.WI_Barcode = @WI_Barcode
    `;

    let pool = await sql.connect(config.sql);
    const eventsList = await pool
      .request()
      .input("WI_Barcode", sql.VarChar, WI_Barcode.toString())
      .query(Query);

    console.log("Query Result for WI_Barcode", WI_Barcode, ":", eventsList.recordset);
    return eventsList.recordset;
  } catch (error) {
    console.error("Error in Get_WayInOutWithID:", error.message);
    throw error;
  }
}


async function Get_WayInOut_VT_IDWithBarcode(WI_Barcode) {
  try {

    const Query = `
      SELECT TOP 500 
        wi.WI_ID, WI_Barcode, WI_CardID, WI_FullName, WI_Gender, WI_Address, WI_LicensePlate,
        WI_LicenseProvince, WI_VehicleType, WI_InternalDivision, WI_Follower, WI_Remarks, 
        WI_RecordedOn, WI_FromCompany, WI_Images, 
        (su1.SU_Name1 + ' ' + su1.SU_Name2) AS UserInternal, 
        WO_RecordedOn, SU_IDInternalRecordedOn, SU_IDInternal,
        (su2.SU_Name1 + ' ' + su2.SU_Name2) AS UserWayOut, 
        (su3.SU_Name1 + ' ' + su3.SU_Name2) AS UserWayIn, 
        VT_ID
      FROM WayIn AS wi 
      LEFT JOIN WayOut AS wo ON wi.WI_ID = wo.WI_ID 
      LEFT JOIN SystemUser AS su1 ON wi.SU_IDInternal = su1.SU_ID 
      LEFT JOIN SystemUser AS su2 ON wo.SU_ID = su2.SU_ID 
      LEFT JOIN SystemUser AS su3 ON wi.SU_ID = su3.SU_ID 
      WHERE wi.WI_Barcode = @WI_Barcode
    `;

    let pool = await sql.connect(config.sql);
    const eventsList = await pool
      .request()
      .input("WI_Barcode", sql.VarChar, WI_Barcode.toString())
      .query(Query);

    console.log("Query Result for WI_Barcode", WI_Barcode, ":", eventsList.recordset);
    return eventsList.recordset;
  } catch (error) {
    console.error("Error in Get_WayInOutWithID:", error.message);
    throw error;
  }
}


async function BeforeCheckOutValidate(User_data) {
  try {
    var Query =
      "SELECT  SU_IDI FROM WayIn as wi LEFT JOIN WayOut as wo on wi.WI_ID = wo.WI_ID where WI_Barcode = '" +
      User_data.WI_ID +
      "' ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error.message);
  }
}

async function InternalCheckin(User_data) {
  try {
    var Query =
      "UPDATE WayIn SET = SU_IDI  = " +
      User_data.SU_IDI +
      ",SU_IDIRecordedOn = CURRENT_TIMESTAMP,SU_IDI_Remark = '" +
      User_data.SU_IDI_Remark +
      "' WHERE WI_Barcode = '" +
      User_data.WI_Barcode +
      "' ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error.message);
  }
}

async function GetVisionType() {
  try {
    var Query =
      "SELECT VT_ID, VT_Localname, VT_EnglishName FROM VisitType where VT_ID IN (40,18,39,46)";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error.message);
  }
}

async function UpdateVisionType(WI_ID, VT_ID) {
  try {
    let pool = await sql.connect(config.sql);
    const query = `
          UPDATE WayIn
          SET VT_ID = @VT_ID
          WHERE WI_ID = @WI_ID
      `;

    const result = await pool
      .request()
      .input("VT_ID", sql.Int, VT_ID)
      .input("WI_ID", sql.Int, WI_ID)
      .query(query);

    return result.recordset;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
