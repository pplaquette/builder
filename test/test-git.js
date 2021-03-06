var git = require('../lib/git'),
    nodeunit = require('../deps/nodeunit');


exports['command parsing'] = nodeunit.testCase({

    setUp: function (callback) {
        this._cmd = git.cmd;
        callback();
    },
    tearDown: function (callback) {
        git.cmd = this._cmd;
        callback();
    },

    'tag list': function (test) {
        test.expect(3);
        git.cmd = function (wd, commands, callback) {
            test.equal(wd, 'working_dir');
            test.same(commands, ['tag']);
            callback(null, 'v1.2.0\nv1.2.1\nv1.2.2\nv1.2.3\nv1.2.4\nv1.2.5\n');
        };
        git.getTags('working_dir', function (err, tags) {
            test.same(tags, [
                'v1.2.0',
                'v1.2.1',
                'v1.2.2',
                'v1.2.3',
                'v1.2.4',
                'v1.2.5'
            ]);
            test.done();
        });
    },

    'blobs from ls-tree output': function (test) {
        test.expect(3);
        git.cmd = function (wd, commands, callback) {
            test.equal(wd, 'working_dir');
            test.same(commands, [
                'ls-tree', '-r', '--full-name', 'treeish', 'path'
            ]);
            callback(
                null,
                '100644 blob c62f4c77b61f72c9632a7c208464488e9c59324d' +
                    '\tsrc/dateinput/dateinput.js\n' +
                '100644 blob b51e867bee540ae271aa7f495957e0f2f5ea60b8' +
                    '\tsrc/overlay/overlay.apple.js\n' +
                '100644 blob 163cb4bd101eb1a187e23b8745e43ec77022636e' +
                    '\tsrc/overlay/overlay.js\n'
            );
        };
        git.lsBlobs('working_dir', 'treeish', 'path', function (err, blobs) {
            test.same(blobs, [
                {
                    mode: '100644',
                    type: 'blob',
                    hash: 'c62f4c77b61f72c9632a7c208464488e9c59324d',
                    path: 'src/dateinput/dateinput.js'
                },
                {
                    mode: '100644',
                    type: 'blob',
                    hash: 'b51e867bee540ae271aa7f495957e0f2f5ea60b8',
                    path: 'src/overlay/overlay.apple.js'
                },
                {
                    mode: '100644',
                    type: 'blob',
                    hash: '163cb4bd101eb1a187e23b8745e43ec77022636e',
                    path: 'src/overlay/overlay.js'
                }
            ]);
            test.done();
        });
    }

});

exports['eachBlob'] = function (test) {
    test.expect(8);
    var call_order = [];

    var _lsBlobs = git.lsBlobs;
    git.lsBlobs = function (wd, treeish, path, callback) {
        test.equal(wd, 'wd');
        test.equal(treeish, 'treeish');
        test.equal(path, 'path');
        callback(null, [
            {path: 'one'},
            {path: 'two'}
        ]);
    };

    var _show = git.show;
    git.show = function (wd, treeish, path, callback) {
        test.equal(wd, 'wd');
        test.equal(treeish, 'treeish');
        call_order.push('show ' + path);
        callback(null, 'data ' + path);
    };

    git.eachBlob('wd', 'treeish', 'path', function (blob, callback) {
        call_order.push(blob);
        setTimeout(callback, Math.random()*10);
    },
    function (err) {
        call_order.push('callback');
        test.same(call_order, [
            'show one', {path: 'one', data: 'data one'},
            'show two', {path: 'two', data: 'data two'},
            'callback'
        ]);
        test.done();
    });
};

exports['eachBlob - lsBlobs error'] = function (test) {
    test.expect(1);
    var call_order = [];

    var _lsBlobs = git.lsBlobs;
    git.lsBlobs = function (wd, treeish, path, callback) {
        callback('error');
    };

    var _show = git.show;
    git.show = function (wd, treeish, path, callback) {
        test.ok(false, 'should not be called');
    };

    git.eachBlob('wd', 'treeish', 'path', function (blob, callback) {
        test.ok(false, 'should not be called');
        callback();
    },
    function (err) {
        test.equal(err, 'error');
        test.done();
    });
};

exports['eachBlob - show error'] = function (test) {
    test.expect(1);
    var call_order = [];

    var _lsBlobs = git.lsBlobs;
    git.lsBlobs = function (wd, treeish, path, callback) {
        callback(null, [{test:'blob'}]);
    };

    var _show = git.show;
    git.show = function (wd, treeish, path, callback) {
        callback('error');
    };

    git.eachBlob('wd', 'treeish', 'path', function (blob, callback) {
        callback();
    },
    function (err) {
        test.equal(err, 'error');
        test.done();
    });
};
