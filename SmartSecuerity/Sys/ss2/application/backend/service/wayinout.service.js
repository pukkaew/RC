const config = require("../config/Mssql.config.js");
const sql = require('mssql');

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
    CheckWeightInOut
};

async function AddWayIn(User_data) {
    try{
 
          var  Query = "INSERT INTO  WayIn (WI_Barcode,WI_FullName,WI_Address,WI_LicensePlate,WI_LicenseProvince,WI_VehicleType,WI_Follower,WI_Remarks,WI_FromCompany,SU_ID,WI_RecordedOn,WI_CardID,WI_Gender,WI_ContactName,QDevice,VT_ID,IC_ID)VALUES('" + User_data.WI_Barcode + "','" + User_data.WI_FullName + "','" + User_data.WI_Address + "','" + User_data.WI_LicensePlate + "','" + User_data.WI_LicenseProvince + "' ,'" + User_data.WI_VehicleType + "'," + parseInt(User_data.WI_Follower) + " ,'" + User_data.WI_Remarks + "','" + User_data.WI_FromCompany + "',2,CURRENT_TIMESTAMP,'','','" + User_data.WI_ContactName + "','"+ User_data.QDevice +"',"+ User_data.WI_VisitType +","+ User_data.IC_ID +")";

                    let pool = await sql.connect(config.sql);
                    const eventsList = await pool.request().query(Query);
              
                    return eventsList.recordset; 

    }catch(error){
        console.log(error.message);
    }
};

/* async function GetlastBarcode() {
    try{

          var  Query = "SELECT MAX(WI_Barcode) + 1 as running FROM WayIn ";

                    let pool = await sql.connect(config.sql);
                    const eventsList = await pool.request().query(Query);
              
                    return eventsList.recordset;

    }catch(error){
        console.log(error.message);
    }
}; */

async function GetlastBarcode() {
    try {
        var Query = "SELECT MAX(WI_Barcode) as running FROM WayIn";

        // Assuming 'sql' and 'config.sql' are properly defined for SQL Server
        let pool = await sql.connect(config.sql);
        const result = await pool.request().query(Query);

        if (result.recordset && result.recordset.length > 0) {
            // Assuming 'WI_Barcode' is returned as 'running'
            let runningBarcode = result.recordset[0].running;

            // Format the 'runningBarcode' as 'yymmddrun'
            let formattedBarcode = formatBarcode(runningBarcode);

            // Return the formatted barcode
            return formattedBarcode;
        } else {
            throw new Error("No results returned from database query.");
        }
    } catch (error) {
        console.error("Error in GetlastBarcode:", error.message);
        throw error; // Propagate the error back to the caller
    }
};

function formatBarcode(currentBarcode) {
    // Extract the date part (yyMMdd) and the running number
    let datePart = currentBarcode.slice(0, 6); // Assuming date part is always the first 6 characters
    let runningNumber = parseInt(currentBarcode.slice(6), 10); // Convert the running number to integer

    // Get current date in yyMMdd format
    let currentDate = new Date();
    let yy = String(currentDate.getFullYear()).slice(-2);
    let mm = ('0' + (currentDate.getMonth() + 1)).slice(-2); // Adding 1 because getMonth() returns zero-based month
    let dd = ('0' + currentDate.getDate()).slice(-2);
    let yymmdd = yy + mm + dd;

    // Check if the date part matches the current date
    if (datePart !== yymmdd) {
        // Reset running number to 1 if date has changed
        runningNumber = 1;
    } else {
        // Increment running number
        runningNumber++;
    }

    // Format the running number as a three-digit string with leading zeros
    let formattedRunningNumber = ('00' + runningNumber).slice(-3);

    // Construct the new barcode
    let newBarcode = yymmdd + formattedRunningNumber;

    return newBarcode;
}



async function GetwayInInformation(barcode) {
    try{

          var  Query = "SELECT WI_ID,WI_Barcode,WI_CardID,WI_FullName,WI_Gender,WI_Address,WI_LicensePlate " +
                       ",WI_LicenseProvince,WI_VehicleType,WI_InternalDivision,WI_Follower,WI_Remarks " +
                       ",SU_ID,FORMAT(WI_RecordedOn,'dd/MM/yyyy hh:mm:ss') as WI_RecordedOn,IC_ID,ID_ID,CASE WHEN VT_ID = 40 THEN 'รับฝากสินค้า' WHEN VT_ID = 39 THEN  'ผู้มาติดต่อ' WHEN VT_ID = 18 THEN 'ซัพพลายเออร์' else '' END as VT_ID,WI_FromCompany,WI_Images,WI_ContactName  " +
                       " FROM WayIn  where WI_Barcode = '"+ barcode +"' ";

                    let pool = await sql.connect(config.sql);
                    const eventsList = await pool.request().query(Query);
              
                    return eventsList.recordset;

    }catch(error){
        console.log(error.message);
    }
};

async function Checkout(wayin_id,SU_ID,Remark)
{
    try{
        var Query = "INSERT INTO WayOut(WI_ID,SU_ID,WO_RecordedOn,WO_Remarks)VALUES("+ wayin_id +","+ SU_ID +",CURRENT_TIMESTAMP,'"+ Remark +"')";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
  
        return eventsList.recordset;


    }catch(error){
        console.log(error.message);
    }
}

async function FindID_WayIn(barcode)
{
    try{

        var Query = "SELECT WI_ID FROM WayIn where WI_Barcode = '"+ barcode +"' ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
  
        return eventsList.recordset;

    }catch(error)
    {
        console.log(error.message);
    }
}

async function GetList_WayInOut()
{
    try{

        var Query = "SELECT top 200 wi.WI_ID,WI_Barcode,WI_CardID,WI_FullName,WI_Gender,WI_Address,WI_LicensePlate,WI_LicenseProvince,WI_VehicleType,WI_InternalDivision,WI_Follower,WI_Remarks,su1.SU_Name1 as UserWayIn,WI_RecordedOn,WI_FromCompany,WI_Images,su2.SU_Name1 as UserWayOut,WO_RecordedOn,su3.SU_Name1 as UserInternal,wi.SU_IDInternalRecordedOn FROM WayIn as wi LEFT JOIN WayOut as wo on wi.WI_ID = wo.WI_ID LEFT JOIN SystemUser as su1 ON wi.SU_ID = su1.SU_ID LEFT JOIN SystemUser as su2 ON wo.SU_ID = su2.SU_ID LEFT JOIN SystemUser as su3 on wi.SU_IDInternal = SU3.SU_ID ORDER BY wi.wi_id desc ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
  
        return eventsList.recordset;

    }
    catch(error)
    {
        console.log(error.message);
    }
}

async function Get_WayInOut(User_data)
{
    try{

        var Query = "SELECT top 500 wi.WI_ID,WI_Barcode,WI_CardID,WI_FullName,WI_Gender,WI_Address,WI_LicensePlate,WI_LicenseProvince,WI_VehicleType,WI_InternalDivision,WI_Follower,WI_Remarks,su1.SU_Name1 as UserWayIn,WI_RecordedOn,WI_FromCompany,WI_Images,su2.SU_Name1 as UserWayOut,WO_RecordedOn,su3.SU_Name1 as UserInternal,wi.SU_IDInternalRecordedOn FROM WayIn as wi LEFT JOIN WayOut as wo on wi.WI_ID = wo.WI_ID LEFT JOIN SystemUser as su1 ON wi.SU_ID = su1.SU_ID LEFT JOIN SystemUser as su2 ON wo.SU_ID = su2.SU_ID LEFT JOIN SystemUser as su3 on wi.SU_IDInternal = SU3.SU_ID  where WI_Barcode = '" + User_data.WI_Barcode + "' ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
  
        return eventsList.recordset;

    }
    catch(error)
    {
        console.log(error.message);
    }
}

async function InternalCheckin(User_data)
{
    try{

        var Query = "UPDATE WayIn SET  SU_IDInternal  = " + User_data.SU_IDI +  ",SU_IDInternalRecordedOn = CURRENT_TIMESTAMP,SU_IDInternal_Remark = '"+ User_data.SU_IDI_Remark +"' WHERE WI_Barcode = '" + User_data.WI_Barcode + "' ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
  
        return eventsList.recordset;

    }catch(error)
    {
        console.log(error.message);
    }
}

async function BeforeCheckOutValidate(WI_ID)
{
    try{

        var Query = "SELECT  SU_IDInternal,WO_ID,VT_ID FROM WayIn as wi LEFT JOIN WayOut as wo on wi.WI_ID = wo.WI_ID where wi.WI_ID =  "+ WI_ID +" ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
  
        return eventsList.recordset;

    }
    catch(error)
    {
        console.log(error.message);
    }
}

async function InternalCheckin(User_data)
{
    try{

        var Query = "UPDATE WayIn SET SU_IDInternal  = " + User_data.SU_IDI +  ",SU_IDIRecordedOn = CURRENT_TIMESTAMP,SU_IDI_Remark = '"+ User_data.SU_IDI_Remark +"' WHERE WI_Barcode = '" + User_data.WI_Barcode + "' ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
  
        return eventsList.recordset;

    }catch(error)
    {
        console.log(error.message);
    }
}

async function CheckWeightInOut(User_data)
{
    try{

        var Query = "SELECT TOP 2 TS_ID,TS_Barcode,TS_ScanDatetime,TS_LicensePlate,TS_Weight  FROM [ScalesCenter].[dbo].[TruckScales] where TS_Barcode = '"+ User_data.WI_Barcode +"' ORDER BY TS_ID DESC ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
  
        return eventsList.recordset;

    }catch(error)
    {
        console.log(error.message);
    }
}