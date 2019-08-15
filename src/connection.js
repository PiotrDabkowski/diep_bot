const http = require('http')
const EventEmitter = require('events')
const WebSocket = require('ws')
const { Encoder } = require('./encoder')

let findEach = mode => new Promise((resolve, reject) => {
    http.get(`http://api.n.m28.io/endpoint/diepio-${ mode }/findEach/`, res => {
        let data = ''
        console.log(resolve)
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
            try {
                resolve(JSON.parse(data))
            } catch(e) {
                reject(e)
            }
        })
    }).on('error', reject)
})


const WSConnection = class extends EventEmitter {
    constructor(address, { ip, release }) {
        super()
        let socket = new WebSocket(address, {
            origin: address.startsWith('wss') ? 'https://diep.io' : 'http://diep.io',
            //localAddress: ip,
            rejectUnauthorized: false,
        })
        socket.on('open', () => {
            super.emit('open')
        })
        socket.on('message', buffer => {
            super.emit('message', buffer)
        })
        socket.on('close', e => {
            release()
            super.emit('close')
        })
        socket.on('error', err => {
            release()
            super.emit('error', err)
        })
        this.socket = socket
    }
    send(packet) {
        let encoder = new Encoder()
        this.socket.send(encoder.encodeOutbound(packet))
    }

    multiSend(packets) {
        for (let packet of packets) {
            this.send(packet)
        }
    }
    close() {
        try {
            this.socket.close()
        } catch(e) {
            this.socket.terminate()
        }
    }
}

let range = "2a00:1450:4001:81b::/64";

let parseIpv6 = ip => {
  let { length } = ip.match(/:/) || []
  return ip
    .replace('::', ':' + Array(8 - length).join(':') + ':')
    .split(':')
    .map(r => parseInt(r, 16) || 0)
}

const IpAlloc = class {
  constructor(template) {
    let match = template.toLowerCase().match(/^([0-9a-f:]{2,39})\/([0-9]+)$/)
    if (!match)
      throw new SyntaxError('Invalid IPv6 range!')

    let maximum = 1 << match[2]
    let ipv6 = parseIpv6(match[0])

    this.ipStart = ipv6.slice(0, 7).map(r => r.toString(16)).join(':') + ':'
    this.ipMin = ipv6[7] & -maximum
    this.maximum = maximum
    this.connected = {}
  }
  asString(addr) {
    return this.ipStart + (this.ipMin + addr).toString(16)
  }
  getRandom() {
    return this.asString(Math.floor(Math.random() * this.maximum))
  }
  for(ip) {
    let connected = this.connected[ip]
    if (!connected)
      connected = this.connected[ip] = Array(this.maximum).fill(0)
    let index = null
    for (let i = 0; i < this.maximum; i++)
      if (connected[i] < 2) {
        connected[index = i]++
        break
      }
    if (index === null)
      return null
    let locked = true
    return {
      ip: this.asString(index),
      release: () => {
        if (locked)
          connected[index]--
        locked = false
      },
    }
  }
}


module.exports = {WSConnection: WSConnection}