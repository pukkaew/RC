const wayinout = require("../service/wayinout.service");
const systemuser = require("../service/systemuser.service");

exports.RegisterWayIn = async (req,res) => {
    try{

        let User_data = {
            WI_VisitType:req.body.WI_VisitType,
            WI_CardID:req.body.WI_CardID,
            WI_FullName:req.body.WI_FullName,
            WI_Address:req.body.WI_Address,
            WI_LicensePlate:req.body.WI_LicensePlate,
            WI_LicenseProvince:req.body.WI_LicenseProvince,
            WI_VehicleType:req.body.WI_VehicleType,
            WI_Follower:req.body.WI_Follower,
            WI_Remarks:req.body.WI_Remarks,
            WI_FromCompany:req.body.WI_FromCompany,
            IC_ID:req.body.IC_ID,
            WI_ContactName:req.body.WI_ContactName,
            QDevice:req.body.QDevice,
        }


        if(User_data.WI_VisitType == 'รับฝากสินค้า')
        {
            User_data.WI_VisitType = 40
        }
        else if(User_data.WI_VisitType == 'ผู้มาติดต่อ')
        {
            User_data.WI_VisitType = 39
        }
        else if(User_data.WI_VisitType == 'ซัพพลายเออร์')
        {
            User_data.WI_VisitType = 18
        } 


        let barcode = await wayinout.GetlastBarcode();

         User_data.WI_Barcode = barcode;

         if(User_data.WI_FullName == '' || User_data.WI_Address  == '' ||  User_data.WI_LicensePlate  == '' || User_data.WI_LicenseProvince == '' || User_data.WI_VehicleType == '' || User_data.WI_Follower == ''  || User_data.WI_FromCompany == '')
        {
            barcode =  0; 
        }
        else
        {
            if(User_data.WI_ContactName == '')
            {
                User_data.WI_ContactName = '-';
            }

            let result_data = await wayinout.AddWayIn(User_data);
        }
    
        res.send(barcode); 

    }catch(err)
    {
        res.json(err);
        return;
    }
}

exports.GetwayInInformation = async (req,res) => {
    try{

        let barcode = req.body.WI_Barcode;

        let result_data = await wayinout.GetwayInInformation(barcode);

        res.send(result_data);


    }catch(err)
    {
        res.json(err);
        return;
    }
}


exports.Checkout = async (req,res) => {
    try{

        let barcode = req.body.QR_Code;
        let su_id = req.body.su_id;
        let remarks = req.body.remarks;


        let wayin_id = await wayinout.FindID_WayIn(barcode);
        let validate_check = await wayinout.BeforeCheckOutValidate(wayin_id[0].WI_ID);

        if(validate_check.length > 0)
        {

            if(validate_check[0].VT_ID == 40)
            {

                if (validate_check[0].WO_ID == null || validate_check[0].WO_ID === undefined) {
                    // หาก WO_ID เป็น null หรือ undefined ให้อนุญาตให้สแกน
                    result_data = await wayinout.Checkout(wayin_id[0].WI_ID, su_id, remarks);
                    res.send(result_data);
                } else {
                    // หาก WO_ID มีอยู่ (ไม่ใช่ null หรือ undefined) ให้ส่งข้อความผิดพลาดกลับ
                    res.status(400).json({ error: 'ขออภัยไม่สามารถแสกนซ้ำได้' });
                }

            }
            else
            {

                if(validate_check[0].SU_IDInternal == null || validate_check[0].SU_IDInternal == undefined)
                {
                        res.status(400).json({ error: 'ไม่พบการแสกนจากบุคคลภายใน' });
                }
                else if(validate_check[0].SU_IDInternal != null || validate_check[0].SU_IDInternal !== undefined)
                {
                        res.status(400).json({ error: 'ขออภัยไม่สามารถแสกนซ้ำได้' });
                }
                else if (validate_check[0].WO_ID != null || validate_check[0].WO_ID !== undefined) 
                {
                        res.status(400).json({ error: 'ขออภัยไม่สามารถแสกนซ้ำได้' });
                }
                else
                {
                        result_data = await wayinout.Checkout(wayin_id[0].WI_ID,su_id,remarks);
                        res.send(result_data);
                }
            }

        }


    }catch(err)
    {
        res.json(err);
        return;
    }
}

exports.GetList_WayInOut = async (req,res) => {
    try{

        let user_data = req.body;

        result_data = await wayinout.GetList_WayInOut(user_data);

        res.send(result_data);

    }catch(err)
    {
        res.json(err);
        return;
    }
}

exports.BeforeCheckOutValidate = async (req,res) => {
    try{
        let user_data = req.body;

        result_data = await wayinout.BeforeCheckOutValidate(user_data);

        res.send(result_data);
    }
    catch(err)
    {
        res.json(err);
        return;
    }
}


exports.InternalCheckin = async (req,res) => {
    try{

        let user_data = req.body;

        let result_userId = await systemuser.Get_SUID(user_data.SU_IDI);

        user_data.SU_IDI = result_userId[0].SU_ID;

        result_data = await wayinout.InternalCheckin(user_data); 

        res.send(result_data);
                

    }catch(err)
    {
        res.json(err);
        return;
    }
}