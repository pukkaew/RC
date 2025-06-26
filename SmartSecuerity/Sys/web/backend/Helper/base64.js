const fs = require('fs');


function deconvertBase64ToFile(base64String, filePath)
 {

    try
    {

        const buffer = Buffer.from(base64String, 'base64');
      
        fs.writeFileSync(filePath, buffer);
      
        console.log(`File saved at ${filePath}`);

    }catch(err)
    {
        console.log(err);
    }
};

module.exports = {
    deconvertBase64ToFile
}