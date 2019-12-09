const EventEmitter = require('events')
const WebSocket = require('ws')


const WSConnection = class extends EventEmitter {
    constructor(address) {
        super()
        let socket = new WebSocket(address)
        socket.on('open', () => {
            super.emit('open')
            console.log('open')
        })
        socket.on('message', buffer => {
            super.emit('message', buffer)
            console.log('msg')

        })
        socket.on('close', e => {
            super.emit('close')
                        console.log('cloese')

        })
        socket.on('error', err => {
            super.emit('error', err)
            console.log('err', err)

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

var a = new WSConnection("ws://35.180.172.117:8080")