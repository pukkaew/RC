const MasterService = require("../service/master.service");

exports.Get_department = async (req,res) => {
    try{

        let result_data = await MasterService.Get_department();
    
        res.send(result_data);

    }catch(err)
    {
        res.json(err);
        return;
    }
}

exports.Get_IntenalCompony = async (req,res) => {
    try{

        let result_data = await MasterService.Get_IntenalCompony();

        res.send(result_data)

    }catch(err)
    {
        res.json(err);
        return;
    }
}
