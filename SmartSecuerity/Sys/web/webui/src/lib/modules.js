

module.exports = {
    proxyObj2Array: function(obj)
    {
        return JSON.parse(JSON.stringify(obj));
    }
};