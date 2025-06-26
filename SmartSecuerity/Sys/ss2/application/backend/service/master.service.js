const config = require("../config/Mssql.config.js");
const sql = require('mssql');

module.exports = {
    Get_department,
    Get_IntenalCompony
};

async function Get_department() {
    try{

          var  Query = "SELECT ID_Code,ID_LocalName FROM InternalDepartment    ";

          let pool = await sql.connect(config.sql);
          const eventsList = await pool.request().query(Query);
              
          return eventsList.recordset;

    }catch(error){
        console.log(error.message);
    }
};

async function Get_IntenalCompony() {
    try{
        
        var  Query = "SELECT  IC_ID,IC_LocalName FROM InternalCompany where IC_ID = 5 ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
  
        return eventsList.recordset;

    }catch(error)
    {
        console.log(error.message);
    }
}

