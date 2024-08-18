'use strict';

var benchmark = require('benchmark');
var zipdRPC = require('@zipeva/zipd-rpc');
var async = require('async');
var maxTime = 20;

console.log('Zip Service native interface vs. Zip JSON RPC interface');
console.log('----------------------------------------------------------------------');

// To run the benchmarks a fully synced Zip Core directory is needed. The RPC comands
// can be modified to match the settings in zip.conf.

var fixtureData = {
  blockHashes: [
    '00000b0896b55ada0b830f4ae96b81344119008714af713b0b693dc0ca92df6f',
    '00000bd7b94468042f90eb2cda6892ece51e00c0c6d4ce1a588efef7e4f0812b',
    '00000499e1ab7704d7100ccec39ca4d0a2328f212e28eb539a6691661a232a3a',
    '000000000b52dbc2e0076a2cee4eb20299f0dfc6b9cce21923f9ca85c0677bd8'
  ],
  txHashes: [
    'c7a8aa497828e0ea78eff8536f18abcf04fa9ce238d2f24c27584e681afbd00d',
    'f5926e65f888883957ed2c3cb34cf3bd4fbd2316c5665764f8eccac97457e388',
    '90816b5798eeee731a5797ab8d6edab68784ffa149ab7a1005070c907f6bc2b5',
    'd261f76eab0f67bda46aec12ffb76203e1737b97c07cf75624f75218faa1a317',
  ]
};

var zipd = require('../').services.Zip({
  node: {
    datadir: process.env.HOME + '/.zip',
    network: {
      name: 'testnet'
    }
  }
});

zipd.on('error', function(err) {
  console.error(err.message);
});

zipd.start(function(err) {
  if (err) {
    throw err;
  }
  console.log('Zip Core started');
});

zipd.on('ready', function() {

  console.log('Zip Core ready');

  var client = new zipdRPC({
    host: 'localhost',
    port: 18332,
    user: 'zip',
    pass: 'local321'
  });

  async.series([
    function(next) {

      var c = 0;
      var hashesLength = fixtureData.blockHashes.length;
      var txLength = fixtureData.txHashes.length;

      function zipdGetBlockNative(deffered) {
        if (c >= hashesLength) {
          c = 0;
        }
        var hash = fixtureData.blockHashes[c];
        zipd.getBlock(hash, function(err, block) {
          if (err) {
            throw err;
          }
          deffered.resolve();
        });
        c++;
      }

      function zipdGetBlockJsonRpc(deffered) {
        if (c >= hashesLength) {
          c = 0;
        }
        var hash = fixtureData.blockHashes[c];
        client.getBlock(hash, false, function(err, block) {
          if (err) {
            throw err;
          }
          deffered.resolve();
        });
        c++;
      }

      function zipGetTransactionNative(deffered) {
        if (c >= txLength) {
          c = 0;
        }
        var hash = fixtureData.txHashes[c];
        zipd.getTransaction(hash, true, function(err, tx) {
          if (err) {
            throw err;
          }
          deffered.resolve();
        });
        c++;
      }

      function zipGetTransactionJsonRpc(deffered) {
        if (c >= txLength) {
          c = 0;
        }
        var hash = fixtureData.txHashes[c];
        client.getRawTransaction(hash, function(err, tx) {
          if (err) {
            throw err;
          }
          deffered.resolve();
        });
        c++;
      }

      var suite = new benchmark.Suite();

      suite.add('zipd getblock (native)', zipdGetBlockNative, {
        defer: true,
        maxTime: maxTime
      });

      suite.add('zipd getblock (json rpc)', zipdGetBlockJsonRpc, {
        defer: true,
        maxTime: maxTime
      });

      suite.add('zipd gettransaction (native)', zipGetTransactionNative, {
        defer: true,
        maxTime: maxTime
      });

      suite.add('zipd gettransaction (json rpc)', zipGetTransactionJsonRpc, {
        defer: true,
        maxTime: maxTime
      });

      suite
        .on('cycle', function(event) {
          console.log(String(event.target));
        })
        .on('complete', function() {
          console.log('Fastest is ' + this.filter('fastest').pluck('name'));
          console.log('----------------------------------------------------------------------');
          next();
        })
        .run();
    }
  ], function(err) {
    if (err) {
      throw err;
    }
    console.log('Finished');
    zipd.stop(function(err) {
      if (err) {
        console.error('Fail to stop services: ' + err);
        process.exit(1);
      }
      process.exit(0);
    });
  });
});
