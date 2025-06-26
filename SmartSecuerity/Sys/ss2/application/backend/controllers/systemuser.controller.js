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




