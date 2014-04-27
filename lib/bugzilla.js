var bz = require("bz")

var bugzilla = function() {
    var bzClient = bz.createClient();
    var pending = 0;

    var bugsFixed = function(obj, email, callback) {
        pending++;
        bzClient.countBugs({
            "field0-0-0": "attachment.is_patch",
            "type0-0-0": "equals",
            "value0-0-0": 1,
            "field0-1-0": "flagtypes.name",
            "type0-1-0": "contains",
            "value0-1-0": "+",
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
            callback(obj, pending, save);
        });
    };


    var bugsAssigned = function(obj, email, callback) {
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
            callback(obj, pending, save);
        });
    }

    var components = function(obj, email, callback) {
        pending++;
        bzClient.countComponents({
            x_axis_field: "product",
            y_axis_field: "component",
            "field0-0-0": "attachment.is_patch",
            "type0-0-0": "equals",
            "value0-0-0": 1,
            "field0-1-0": "flagtypes.name",
            "type0-1-0": "contains",
            "value0-1-0": "+",
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
                        obj.components[((components.x_labels[i%components.x_labels.length] || "") + " :: " +
                                        (components.y_labels[i/components.x_labels.length|0] || ""))
                                        .replace(/(^ :: | :: $)/g, "")] = components.data[i/components.x_labels.length|0][i%components.x_labels.length];
                }
            }
            pending--;
            callback(obj, pending, save);
        });
    }

    return {
        bugsFixed: bugsFixed,
        components: components,
        bugsAssigned: bugsAssigned
    }

}();

module.exports = bugzilla;
