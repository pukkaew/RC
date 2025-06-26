const systemUser = require("../service/systemuser.service");

exports.Get_SystemUser = async (req,res) => {
    try{

        result_data = await systemUser.Get_SystemUser(req.body.SU_Code,req.body.SU_Password);
    
        res.send(result_data);

    }catch(err)
    {
        res.json(err);
        return;
    }
}


exports.NewUser = async (req,res) => {
    try{

        let User_data = req.body;

        result_data = await systemUser.NewUser(User_data);
        
        let last_suID = await systemUser.GetlastIDUsers();

        let Role;

        if(User_data.UR_Role == 'ADM')
        {
            Role = 1;
        }
        else if(User_data.UR_Role == 'SGS')
        {
            Role = 2;
        }
        else if(User_data.UR_Role == 'SGU')
        {
            Role = 3;
        }
        else if(User_data.UR_Role == 'HRU')
        {
            Role = 4;
        }
        else if(User_data.UR_Role == 'RCT')
        {
            Role = 6;
        }
        else if(User_data.UR_Role == 'QA')
        {
            Role = 7;
        }
        else
        {
            Role = 0;
        }

        result_role = await systemUser.NewSystemRole(last_suID[0].SU_ID,Role);

        res.send(result_data);

    }catch(err)
    {
        res.json(err);
        return;
    }
}

exports.UpdateUser = async (req,res) => {
    try{

        let User_data = req.body;

        let result_data  = await systemUser.UpdateUser(User_data);

        if(User_data.UR_Role == 'ADM')
        {
                Role = 1;
        }
        else if(User_data.UR_Role == 'SGS')
        {
                Role = 2;
        }
        else if(User_data.UR_Role == 'SGU')
        {
                Role = 3;
        }
        else if(User_data.UR_Role == 'HRU')
        {
                Role = 4;
        }
        else if(User_data.UR_Role == 'RCT')
        {
                Role = 6;
        }
        else if(User_data.UR_Role == 'QA')
        {
                Role = 7;
        }
        else
        {
                Role = 0;
        }

        result_role = await systemUser.UpdateSystemRole(User_data.SU_ID._value,Role);

        res.send(result_data);


    }catch(err)
    {
        res.json(err);
        return;
    }
}

exports.CancelUser = async (req,res) => {
    try{
        let User_data = req.body;

        let result_data = await systemUser.CancelUser(User_data);

        res.send(result_data);
    }
    catch(err)
    {
        res.json(err);
        return;
    }
}

exports.GetList_User = async (req,res) => {
    try{
        let result_data = await systemUser.GetList_User();

        res.send(result_data);
    }
    catch(err)
    {
        res.json(err);
        return;
    }
}

exports.GetList_UserByParameter = async (req,res) => {
    try{

        let txt_key = req.body.txt_key;

        let result_data = await systemUser.GetList_UserByParameter(txt_key);

        res.send(result_data);
    }
    catch(err)
    {
        res.json(err);
        return;
    }
}

exports.Get_User = async (req,res) => {
    try{

        let User_data = req.body.SU_ID;

        let result_data = await systemUser.Get_User(User_data);

        res.send(result_data);

    }catch(err)
    {
        res.json(err);
        return;
    }
}

exports.CheckRole = async (req, res) => {
    try {
        const { SR_ID, SU_ID } = req.body; 
        let result_data = await systemUser.CheckRole(SR_ID, SU_ID);
      
        if (result_data.length > 0) {
          res.status(200).json({ message: 'Success', data: result_data });
        } else {
          res.status(200).json({ message: 'No matching role found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error', error: err });
    }
};