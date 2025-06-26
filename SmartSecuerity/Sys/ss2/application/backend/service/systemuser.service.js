const config = require("../config/Mssql.config.js");
const configJson = require('../config.json');
const sql = require('mssql');
const jwt = require('jsonwebtoken');

module.exports = {
    Get_SystemUser,
    NewUser,
    UpdateUser,
    CancelUser,
    authenticate,
    getAll,
    GetRole,
    NewSystemRole,
    GetlastIDUsers,
    GetList_User,
    Get_User,
    Get_SUID
};

async function Get_SystemUser(SU_Code) {
    try{

          var  Query = "SELECT * FROM SystemUser as su  " +
                       "WHERE SU_Username = '" + SU_Code  +"' AND  SU_Active = 1";

                    let pool = await sql.connect(config.sql);
                    const eventsList = await pool.request().query(Query);
              
                    return eventsList.recordset;

    }catch(error){
        console.log(error.message);
    }
};

async function NewUser(User_data)
{
    try{

        var  Query = "INSERT INTO  SystemUser(SU_Code,SU_Name1,SU_Name2,SU_Username,SU_Password,SU_Remarks,SU_LogOn,SU_Active)VALUES('"+ User_data.SU_Code +"','"+ User_data.SU_Name1 +"','"+ User_data.SU_Name2 +"','" + User_data.SU_Username + "','"+ User_data.SU_Password +"','"+ User_data.UR_remark +"',CURRENT_TIMESTAMP,1) ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
   
        return eventsList.recordset;

    }
    catch(error)
    {
        console.log(error);
    }
}

async function UpdateUser(User_data)
{
    try{

        var  Query = "UPDATE SystemUser SU_Code = '"+ User_data.SU_Code +"',SU_Name1 = '" + User_data.SU_Name1 +  "',SU_Name2 = '',SU_Username = '',SU_Password = '',SU_Remarks = ''  SET WHERE SU_Code = '" + User_data.SU_Code + "' ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
   
        return eventsList.recordset;

    }
    catch(error)
    {
        console.log(error);
    }
}


async function CancelUser(User_data)
{
    try{

        var  Query = "UPDATE SystemUser SU_Active = 0 SET WHERE SU_Code = '" + User_data.SU_Code + "' ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
   
        return eventsList.recordset;

    }
    catch(error)
    {
        console.log(error);
    }
}

async function NewSystemRole(SU_ID,Role)
{
    try{

        var  Query = "INSERT INTO SystemUserSystemRole(SU_ID,SR_ID)VALUES("+ SU_ID +","+ Role +")";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
   
        return eventsList.recordset;

    }
    catch(error)
    {
        console.log(error);
    }
}

async function GetlastIDUsers()
{
    try{

        var  Query = "SELECT TOP 1 SU_ID FROM SystemUser ORDER BY SU_ID DESC";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
   
        return eventsList.recordset;

    }
    catch(error)
    {
        console.log(error);
    }
}

async function GetList_User()
{
    try{

        var  Query = "SELECT SU_ID,SU_Code,SU_Name1,SU_Name2,SU_Username,SU_Password,SU_Remarks FROM SystemUser ORDER BY SU_ID DESC ";
 
        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
   
        return eventsList.recordset;

    }
    catch(error)
    {
        console.log(error);
    }
}

async function Get_User(su_id)
{
    try{

        var  Query = "SELECT SU_ID,SU_Code,SU_Name1,SU_Name2,SU_Username,SU_Password,SU_Remarks FROM SystemUser where su_id = "+ su_id +" ";
 
        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
   
        return eventsList.recordset;

    }
    catch(error)
    {
        console.log(error);
    }
}

async function authenticate({ username }) {

    try {

        const user = await Get_SystemUser(username);

        let userRoleValue = "";


        if (Array.isArray(user) && user.length === 0) {
            throw 'Username or password is incorrect';
        } 

        // create a jwt token that is valid for 7 days
        const token = jwt.sign({ sub: user[0].SU_ID }, configJson.secret, { expiresIn: '7d' });

        //Set Role Permission

        let UserRole = await GetRole(user[0].SU_ID);


          if (UserRole) {
                userRoleValue = UserRole[0].SR_Code;
          } else {
            console.log("User role not found for the given username.");
          }


        return {
            ...omitPassword(user),
            token,
            userRoleValue
        };
    } catch (error) {
        console.error('Error:', error);
        throw 'An error occurred during authentication';
    }
}

async function getAll() {
    return users.map(u => omitPassword(u));
}

// helper functions

function omitPassword(user) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

async function GetRole(su_id)
{
    try{

        var  Query = "SELECT DISTINCT  sr.SR_ID,SR_Code,SR_Name  FROM SystemRole as sr  LEFT JOIN SystemUserSystemRole as sur ON sr.SR_ID = sur.SR_ID where SU_ID = "+ su_id +" ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
   
        return eventsList.recordset;

    }
    catch(error)
    {
        console.log();
    }
}

async function Get_SUID(username)
{
    try{

        var  Query = "SELECT SU_ID FROM SystemUser where SU_Username = '"+ username +"' ";

        let pool = await sql.connect(config.sql);
        const eventsList = await pool.request().query(Query);
   
        return eventsList.recordset;

    }
    catch(error)
    {
        console.log(error);
    }
}

