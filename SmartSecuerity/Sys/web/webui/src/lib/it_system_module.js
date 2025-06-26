import Swal from 'sweetalert2';
import moment from 'moment';


const modules = {
    sweetAlertFromDict: async function(dict=[], callback=null)
    {
        for (let i=0; i < dict.length; i++)
        {
            await Swal.fire(dict[i]);


            if (i + 1 === dict.length)
            {
                if (typeof callback === 'function')
                {
                    callback();
                }
            }
        }
    },

    date2String: function(dateValue)
    {
        return moment(dateValue).format("YYYY/MM/DD HH:mm:ss");
    },


    /**
     * ถ้า is_off_succ ปิด is_off_warn จะพลอยปิดไปด้วย
     */

    sweetAlertReport: async function(response_data={}, callback_err=null, callback_succ=null, is_off_warn=false, callback_warn=null, is_off_err=false, is_off_succ=false)
    {
        if (response_data.error.length === 0)
        {
            if (!is_off_succ)
            {
                modules.sweetAlertFromDict(response_data.succ.map(function(succ){
                    return {
                        icon: "success",
                        title: succ
                    };
                }), function(){
                    if (response_data.warning.length > 0)
                    {
                        if (!is_off_warn)
                        {
                            modules.sweetAlertFromDict(response_data.warning.map(function(warn){
                                return {
                                    icon: "warning",
                                    title: warn
                                };
                            }), function(){
                                return modules.callFunc(callback_warn, response_data.warning);
                            });
                        }
                    }
                    
                    return modules.callFunc(callback_succ, {
                        succ: response_data.succ,
                        data: response_data.data
                    });
                });
            }
            else
            {
                return modules.callFunc(callback_succ, {
                    succ: response_data.succ,
                    data: response_data.data
                });
            }
        }
        else
        {
            if (!is_off_err)
            {
                modules.sweetAlertFromDict(response_data.error.map(function(err){
                    return {
                        icon: "error",
                        title: err
                    };
                }), function(){
                    return modules.callFunc(callback_err, response_data.error);
                });
            }
            else
            {
                return modules.callFunc(callback_err, response_data.error);
            }
        }


    },

    sweetAlertServerError: async function(callback=null)
    {
        Swal.fire({
            icon: "error",
            title: "Server Error!"
        }).then(function(result){
            result;
            modules.callFunc(callback)
        });
    },


    callFunc: function(callback, paramValue=null)
    {
        if (typeof callback === 'function')
        {
            return callback(paramValue);
        }
    },


    try_json_parse: function(json_str)
    {
        try
        {
            JSON.parse(json_str);


            return true;
        }
        catch (err)
        {
            return false;
        }
    },


    formatTimeAgo: function(pastDate) 
    {
        const currentDate = new Date();
        const timeDifference = currentDate - pastDate;
    
        const seconds = Math.floor(timeDifference / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
    
        if (days > 0) {
            return days === 1 ? '1 day ago' : `${days} days ago`;
        } else if (hours > 0) {
            return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
        } else if (minutes > 0) {
            return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
        } else {
            return 'Just now';
        }
    },


    mergeFileList: function(fileList_a, fileList_b)
    {
        const dataTranfer = new DataTransfer;


        for (let i=0; i < fileList_a.length; i++)
        {
            dataTranfer.items.add(fileList_a.item(i));
        }


        for (let i=0; i < fileList_b.length; i++)
        {
            dataTranfer.items.add(fileList_b.item(i));
        }


        return dataTranfer.files;
    }
};


export default modules;