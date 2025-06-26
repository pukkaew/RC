const config = require("../config/Mssql.config.js");
const configJson = require("../config.json");
const sql = require("mssql");
const jwt = require("jsonwebtoken");

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
  GetList_UserByParameter,
  UpdateSystemRole
};

async function Get_SystemUser(SU_Code, SU_Password) {
  try {
    var Query =
      "SELECT * FROM SystemUser as su  " +
      "WHERE SU_Username = '" +
      SU_Code +
      "' AND SU_Password = '" +
      SU_Password +
      "' AND  SU_Active = 1";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error.message);
  }
}

async function NewUser(User_data) {
  try {
    var Query =
      "INSERT INTO  SystemUser(SU_Code,SU_Name1,SU_Name2,SU_Username,SU_Password,SU_Remarks,SU_LogOn,SU_Active)VALUES('" +
      User_data.SU_Code +
      "','" +
      User_data.SU_Name1 +
      "','" +
      User_data.SU_Name2 +
      "','" +
      User_data.SU_Username +
      "','" +
      User_data.SU_Password +
      "','" +
      User_data.UR_remark +
      "',CURRENT_TIMESTAMP,1) ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error);
  }
}

async function UpdateUser(User_data) {

  try {
    var Query = "UPDATE SystemUser SET SU_Code = '" + User_data.SU_Code + "',SU_Name1 = '" + User_data.SU_Name1 + "',SU_Name2 = '"+ User_data.SU_Name2 +"',SU_Remarks = '"+ User_data.UR_remark +"'  WHERE SU_Code = '" + User_data.SU_Code + "' ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error);
  }
}

async function CancelUser(User_data) {
  try {
    var Query =
      "UPDATE SystemUser SU_Active = 0 SET WHERE SU_Code = '" +
      User_data.SU_Code +
      "' ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error);
  }
}

async function NewSystemRole(SU_ID, Role) {

  try {
    var Query =
      "INSERT INTO SystemUserSystemRole(SU_ID,SR_ID)VALUES(" +
      SU_ID +
      "," +
      Role +
      ")";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error);
  }
}


async function UpdateSystemRole(SU_ID, Role) {

  try {
    var Query = "UPDATE SystemUserSystemRole SET SR_ID = "+ Role +" where SU_ID = "+ SU_ID +" ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error);
  }
}


async function GetlastIDUsers() {
  try {
    var Query = "SELECT TOP 1 SU_ID FROM SystemUser ORDER BY SU_ID DESC";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error);
  }
}

async function GetList_User() {
  try {
    var Query =
      "SELECT SU_ID,SU_Code,SU_Name1,SU_Name2,SU_Username,SU_Password,SU_Remarks FROM SystemUser ORDER BY SU_ID DESC ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error);
  }
}

async function GetList_UserByParameter(txt_key) {
  try {
    var Query =
      "SELECT SU_ID,SU_Code,SU_Name1,SU_Name2,SU_Username,SU_Password,SU_Remarks FROM SystemUser where SU_ID LIKE '%" +
      txt_key +
      "%' OR SU_Code LIKE '%" +
      txt_key +
      "%'  OR SU_Name1 LIKE '%" +
      txt_key +
      "%'  OR SU_Name2 LIKE '%" +
      txt_key +
      "%'  OR SU_Username LIKE '%" +
      txt_key +
      "%'  OR SU_Password LIKE '%" +
      txt_key +
      "%'  OR SU_Remarks LIKE '%" +
      txt_key +
      "%'  ORDER BY SU_ID DESC ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error);
  }
}

async function Get_User(su_id) {
  try {
    var Query ="SELECT su.SU_ID,SU_Code,SU_Name1,SU_Name2,SU_Username,SU_Password,SU_Remarks,SR_ID,CASE WHEN SR_ID = 1 THEN 'ADM' WHEN SR_ID = 2 THEN 'SGS' WHEN SR_ID = 3 THEN 'SGU'  WHEN SR_ID = 4 THEN 'HRU'  WHEN SR_ID = 6 THEN 'RCT'  WHEN SR_ID = 7 THEN 'QA' END  as SR_Code FROM SystemUser as su LEFT JOIN (SELECT TOP 1 SR_ID,SU_ID FROM SystemUserSystemRole where SU_ID = " +  su_id +  " ) as sur ON su.SU_ID = sur.SU_ID where su.su_id  = " +  su_id +  " ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log(error);
  }
}

async function authenticate({ username, password, SR_ID }) {
    try {
        const user = await Get_SystemUser(username, password, SR_ID);

        let userRoleValue = "";

        if (Array.isArray(user) && user.length === 0) {
            throw 'Username or password is incorrect';
        }

        const token = jwt.sign({ sub: user[0].SU_ID }, configJson.secret, { expiresIn: '7d' });

        let UserRole = await GetRole(user[0].SU_ID);
        console.log("User roles:", UserRole);

        const isReception = UserRole.some(role => role.SR_ID === 1010);

        if(isReception){
            console.log("This user has RCT role (SR_ID = 1010).");
        } else {
            console.log("This user does not have RCT role.");
        }

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
  return users.map((u) => omitPassword(u));
}

// helper functions

function omitPassword(user) {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

async function GetRole(su_id) {
  try {
    var Query =
      "SELECT DISTINCT  sr.SR_ID,SR_Code,SR_Name  FROM SystemRole as sr  LEFT JOIN SystemUserSystemRole as sur ON sr.SR_ID = sur.SR_ID where SU_ID = " +
      su_id +
      " ";

    let pool = await sql.connect(config.sql);
    const eventsList = await pool.request().query(Query);

    return eventsList.recordset;
  } catch (error) {
    console.log();
  }
}


