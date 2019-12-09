const http = require('http')
const EventEmitter = require('events')
const WebSocket = require('ws')
const { Encoder } = require('./encoder')

function getDiepWSParams(address, ipv6addr) {
    if (ipv6addr) {
        return {
            origin: address.startsWith('wss') ? 'https://diep.io' : 'http://diep.io',
            localAddress: ipv6addr,
            family: 6,
            rejectUnauthorized: false,
        }
    }
    return {
            origin: address.startsWith('wss') ? 'https://diep.io' : 'http://diep.io',
            rejectUnauthorized: false,
        }
}

wsFromId = id => `wss://${id}.s.m28n.net`

let linkParse = link => {
    let match = link.match(/diep\.io\/#(([0-9A-F]{2})+)/)
    if (!match) return null
    let data = match[1].split('')
    let source = 'diep.io/#'
    let id = ''
    while (true) {
        let lower = data.shift()
        source += lower
        let upper = data.shift()
        source += upper
        let byte = parseInt(lower, 16) + parseInt(upper, 16) * 16
        if (!byte) break
        id += String.fromCharCode(byte)
    }
    let ws = wsFromId(id)
    return { id, party: data.join(''), source, ws }
}


const WSConnection = class extends EventEmitter {
    constructor(address, params) {
        super()
        let socket = new WebSocket(address, params)
        socket.on('open', () => {
            super.emit('open')
            console.log('Opened conn', socket.localAddress)
        })
        socket.on('message', buffer => {
            super.emit('message', buffer)
        })
        socket.on('close', e => {
            console.log("Connection closed");
            super.emit('close')
        })
        socket.on('error', err => {
            console.log("Error", err)
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



module.exports = {WSConnection: WSConnection, linkParse, getDiepWSParams}