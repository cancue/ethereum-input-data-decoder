const ethabi = require('ethereumjs-abi')
const ethers = require('ethers')

class InputDataDecoder {
  constructor(prop) {
    this.abi = []

    if (prop instanceof Object) {
      this.abi = prop
    } else {
      throw new TypeError(`Must pass ABI array object`)
    }
  }

  decodeConstructor(data) {
    if (Buffer.isBuffer(data)) {
      data = data.toString('utf8')
    }

    if (typeof data !== `string`) {
      data = ``
    }

    data = data.trim()

    for (var i = 0; i < this.abi.length; i++) {
      const obj = this.abi[i]
      if (obj.type !== 'constructor') {
        continue
      }

      const name = obj.name || null
      const types = obj.inputs ? obj.inputs.map(x => x.type) : []

      // take last 32 bytes
      data = data.slice(-256)

      if (data.length !== 256) {
        throw new Error('fial')
      }

      if (data.indexOf(`0x`) !== 0) {
        data = `0x${data}`
      }

      const values = ethers.Interface.decodeParams(types, data)
      const inputs = obj.inputs.map((el, index) => {
        el.value = values[index]
        return el
      })

      return {
        name,
        inputs
      }
    }

    throw new Error('not found')
  }

  decodeData(data) {
    if (Buffer.isBuffer(data)) {
      data = data.toString('utf8')
    }

    if (typeof data !== `string`) {
      data = ``
    }

    data = data.trim()

    const dataBuf = new Buffer(data.replace(/^0x/, ``), `hex`)
    const methodId = dataBuf.slice(0, 4).toString(`hex`)
    var inputsBuf = dataBuf.slice(4)

    const result = this.abi.reduce((acc, obj) => {
      if (obj.type === 'constructor') return acc
      const name = obj.name || null
      const types = obj.inputs ? obj.inputs.map(x => x.type) : []
      const hash = ethabi.methodID(name, types).toString(`hex`)

      if (hash === methodId) {
        // https://github.com/miguelmota/ethereum-input-data-decoder/issues/8
        if (methodId === 'a9059cbb') {
          inputsBuf = Buffer.concat([new Buffer(12), inputsBuf.slice(12,32), inputsBuf.slice(32)])
        }

        const values = ethabi.rawDecode(types, inputsBuf)
        const inputs = obj.inputs.map((el, index) => {
          el.value = values[index]
          return el
        })

        return {
          name,
          inputs
        }
      }

      return acc
    }, {name: null, inputs: []})

    if (!result.name) {
      try {
        const decoded = this.decodeConstructor(data)
        if (decoded) {
          return decoded
        }
      } catch(err) { }
    }

    return result
  }
}

module.exports = InputDataDecoder
