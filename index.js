var fs = require('fs'),
    bz = require('bz'),
    crypto = require('crypto'),
    execSync = require('execSync'),
    mozilliansAPI = require('./lib/mozillians.js');

var GITHUB_USERNAME = '',
    GITHUB_PASSWORD = '';

var emails = [],
    userData = [],
    mozillians = [];

var totalUsers = 0,
    completedUsers = 0;

var bzClient = bz.createClient();

function createMD5(email) {
    return crypto.createHash('md5').update(email).digest('hex');
}

function errorHandler(e) {
    console.log(e);
}

function loadUsers(callback) {
    fs.readFile('users.json', function(err, data) {
        if(err)
            errorHandler(err);
        var userFile = eval(data.toString());
        for (var i = 0; i < userFile.length; i++) {
            createUser({ full_name: userFile[i][0],
                         ircname: userFile[i][0],
                         email: userFile[i][1],
                         git: userFile[i][2],
                         level: userFile[i][3] }, false, false);
        }
        mozilliansAPI.makeRequest(mozillians, processMozillians);
    });
}

function createUser(userObj, private, save) {
    if(emails.indexOf(userObj.email) != -1)
        return;

    totalUsers++;
    var obj = {};
    var email = userObj.email;
    var pending = 0;
    if (private)
        obj.email = '';
    else
        obj.email = email;
    obj.gravatar = createMD5(email);
    obj.name = userObj.ircname || userObj.full_name;
    obj.bugzilla = {};
    obj.components = {};
    obj.level = userObj.level || 0;

    // Count fixed
    pending++;
    bzClient.countBugs({
        'field0-0-0': 'attachment.is_patch',
        'type0-0-0': 'equals',
        'value0-0-0': 1,
        'field0-1-0': 'flagtypes.name',
        'type0-1-0': 'contains',
        'value0-1-0': '+',
        email1: email,
        email1_assigned_to: 1,
        status: ['RESOLVED', 'VERIFIED'],
        resolution: ['FIXED']
    }, function(error, fixed) {
        if (error) {
            errorHandler(error);
            return;
        }
        obj.bugzilla.fixed = fixed;
        pending--;
        maybeSave(obj, pending, save);
    });

    // Count assigned
    pending++;
    bzClient.countBugs({
        email1: email,
        email1_assigned_to: 1
    }, function(error, assigned) {
        if (error) {
            errorHandler(error);
            return;
        }
        obj.bugzilla.assigned = assigned;
        pending--;
        maybeSave(obj, pending, save);
    });

    // Calculate Component
    pending++;
    bzClient.countComponents({
        x_axis_field: 'product',
        y_axis_field: 'component',
        'field0-0-0': 'attachment.is_patch',
        'type0-0-0': 'equals',
        'value0-0-0': 1,
        'field0-1-0': 'flagtypes.name',
        'type0-1-0': 'contains',
        'value0-1-0': '+',
        email1: email,
        email1_assigned_to: 1,
        status: ['RESOLVED', 'VERIFIED'],
        resolution: ['FIXED']
    }, function(error, components) {
        if (error) {
            errorHandler(error);
            return;
        }
        var data = [];
        if (components && components.data && components.data.length) {
            data = data.concat.apply(data, components.data);
            for (var i = 0; i < data.length; i++) {
                if (components.data[i/components.x_labels.length|0][i%components.x_labels.length] != 0)
                    obj.components[((components.x_labels[i%components.x_labels.length] || '') + ' :: ' +
                                    (components.y_labels[i/components.x_labels.length|0] || ''))
                                    .replace(/(^ :: | :: $)/g, '')] = components.data[i/components.x_labels.length|0][i%components.x_labels.length];
            }
        }
        pending--;
        maybeSave(obj, pending, save);
    });

    emails.push(email);
}

function processMozillians (data) {
    // process mozillians
    for(var i = 0; i < data.length; i++) {
        createUser(data[i], true, true);
    }
}

function saveFile() {
    fs.writeFile('stats.json', JSON.stringify(userData), function(err) {
        if (err)
            errorHandler(err);
        console.log('stats.json created.');
    });
}


function maybeSave(obj, pending, save) {
    if (pending == 0) {
        completedUsers++;
        console.log('Completed Bugzilla requests for', obj.name, '(' + completedUsers + '/' + totalUsers + ')');
        if (obj.bugzilla.assigned != 0) {
            userData.push(obj);
        }
        if (completedUsers == totalUsers && save)
            saveFile();
    }
}


// Bootstrap the app

// Try to read github credentials from command line
process.argv.forEach(function(val, index, array) {
    GITHUB_USERNAME = array[2]? array[2] : GITHUB_USERNAME;
    GITHUB_PASSWORD = array[3]? array[3]: GITHUB_PASSWORD;
});
if (!GITHUB_USERNAME || !GITHUB_PASSWORD) {
    console.error('Please setup you github credentials before running.');
    process.exit(1);
}
var ORIG_URL = 'https://' + GITHUB_USERNAME + ':' + GITHUB_PASSWORD + '@github.com/' + GITHUB_USERNAME + '/leaderchalk.git';

var execResult = execSync.exec('git config remote.origin.url ' + ORIG_URL);
if (execResult.code != 0) {
    // Command failed
    console.log(execResult.stderr);
    process.exit(1);
}

// copy our copy of bz.js
var execResult = execSync.exec('cp bz.js node_modules/bz/');
if (execResult.code != 0) {
    // Command failed
    console.log(execResult.stderr);
    process.exit(1);
}

// Start already!
loadUsers();
