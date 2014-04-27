var https = require('https'),
    config = require('../config.js'),
    keys = require('./keys.js');

var mozilliansAPI = function() {

    var offset = 0;

    var country = config.country,
        limit = config.limit,
        appName = keys.appName,
        apiKey = keys.apiKey;

    var options = {
        hostname: 'mozillians.org',
        path: constructPath()
    }

    function constructPath() {
        return '/api/v1/users/?app_name=' + appName +
               '&app_key=' + apiKey +
               '&country=' + country +
               '&limit=' + limit +
               '&offset=' + offset +
               '&format=json';
    }


    function makeRequest(mozillians, processMozillians) {
        var data = '';
        var req = https.request(options, function(res) {
            res.on('data', function(d) {
                data += d.toString();
            });
            res.on('end', function() {
                var tmp = JSON.parse(data).objects;
                mozillians = mozillians.concat(tmp);
                if (tmp.length == limit) {
                    offset += limit;
                    options.path = constructPath();
                    makeRequest(mozillians, processMozillians);
                } else {
                    processMozillians(mozillians);
                }
            });
        });
        req.end();
        req.on('error', errorHandler);
    }

    function errorHandler(e) {
        console.log(e);
    }

    return {
        makeRequest: makeRequest
    };
}();

module.exports = mozilliansAPI;
