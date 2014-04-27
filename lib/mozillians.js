var mozilliansAPI = function() {

    var options = {
        hostname: "mozillians.org",
        path: constructPath()
    }

    function constructPath() {
        return "/api/v1/users/?app_name=" + appName +
               "&app_key=" + apiKey +
               "&country=" + country +
               "&limit=" + limit +
               "&offset=" + offset +
               "&format=json";
    }

    function makeRequest(mozillians, callback) {
        console.log('Making Request to mozillians api..');
        var data = "";
        var req = https.request(options, function(res) {
            res.on("data", function(d) {
                data += d.toString();
            });
            res.on("end", function() {
                console.log("Completed request to Mozillians API...");
                var tmp = JSON.parse(data).objects;
                mozillians = mozillians.concat(tmp);
                if (tmp.length == limit) {
                    offset += limit;
                    options.path = constructPath();
                    makeRequest(mozillians);
                } else {
                    // process mozillians
                    console.log('Processing Mozillians..');
                    for(var i = 0; i < mozillians.length; i++) {
                        callback(mozillians[i], true, true);
                    }
                }
            });
        });
        req.end();
        console.log('Request Ended...');
        req.on("error", errorHandler);
    }

    function errorHandler(e) {
        console.log(e);
    }

    return {
        makeRequest: makeRequest
    };
}();

module.exports = mozillians;
