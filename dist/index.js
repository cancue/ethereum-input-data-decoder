'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ethabi = require('ethereumjs-abi');
var ethers = require('ethers');

var InputDataDecoder = function () {
  function InputDataDecoder(prop) {
    _classCallCheck(this, InputDataDecoder);

    this.abi = [];

    if (prop instanceof Object) {
      this.abi = prop;
    } else {
      throw new TypeError('Must pass ABI array object');
    }
  }

  _createClass(InputDataDecoder, [{
    key: 'decodeConstructor',
    value: function decodeConstructor(data) {
      var _this = this;

      if (Buffer.isBuffer(data)) {
        data = data.toString('utf8');
      }

      if (typeof data !== 'string') {
        data = '';
      }

      data = data.trim();

      var _loop = function _loop() {
        var obj = _this.abi[i];
        if (obj.type !== 'constructor') {
          return 'continue';
        }

        var name = obj.name || null;
        var types = obj.inputs ? obj.inputs.map(function (x) {
          return x.type;
        }) : [];

        // take last 32 bytes
        data = data.slice(-256);

        if (data.length !== 256) {
          throw new Error('fial');
        }

        if (data.indexOf('0x') !== 0) {
          data = '0x' + data;
        }

        var values = ethers.Interface.decodeParams(types, data);
        var inputs = obj.inputs.map(function (el, index) {
          el.value = values[index];
          return el;
        });

        return {
          v: {
            name: name,
            inputs: inputs
          }
        };
      };

      for (var i = 0; i < this.abi.length; i++) {
        var _ret = _loop();

        switch (_ret) {
          case 'continue':
            continue;

          default:
            if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        }
      }

      throw new Error('not found');
    }
  }, {
    key: 'decodeData',
    value: function decodeData(data) {
      if (Buffer.isBuffer(data)) {
        data = data.toString('utf8');
      }

      if (typeof data !== 'string') {
        data = '';
      }

      data = data.trim();

      var dataBuf = new Buffer(data.replace(/^0x/, ''), 'hex');
      var methodId = dataBuf.slice(0, 4).toString('hex');
      var inputsBuf = dataBuf.slice(4);

      var result = this.abi.reduce(function (acc, obj) {
        if (obj.type === 'constructor') return acc;
        var name = obj.name || null;
        var types = obj.inputs ? obj.inputs.map(function (x) {
          return x.type;
        }) : [];
        var hash = ethabi.methodID(name, types).toString('hex');

        if (hash === methodId) {
          // https://github.com/miguelmota/ethereum-input-data-decoder/issues/8
          if (methodId === 'a9059cbb') {
            inputsBuf = Buffer.concat([new Buffer(12), inputsBuf.slice(12, 32), inputsBuf.slice(32)]);
          }

          var _values = ethabi.rawDecode(types, inputsBuf);
          var inputs = obj.inputs.map(function (el, index) {
            el.value = _values[index];
            return el;
          });

          return {
            name: name,
            inputs: inputs
          };
        }

        return acc;
      }, { name: null, inputs: [] });

      if (!result.name) {
        try {
          var decoded = this.decodeConstructor(data);
          if (decoded) {
            return decoded;
          }
        } catch (err) {}
      }

      return result;
    }
  }]);

  return InputDataDecoder;
}();

module.exports = InputDataDecoder;