var data = require("./data.js");
const tank_ = require("./tank.js");
var {Parser} = require("./parser.js");
const {Encoder} = require("./encoder.js");
const { Bot } = require("./bot.js")


// Select a tank.
while (1) {
    var tank = window.prompt(`Which tank to use? Select one from: ${Object.keys(tank_.tankTypes)}`) || 'predator'
    if (tank_.tankTypes.hasOwnProperty(tank)) {
        break
    } else {
        window.alert("No such tank: " +  tank + " (not supported).")
    }

}

let bot = new Bot(true, tank_.tankTypes[tank])
let initDone = false

function handleRecvData(buffer) {
  try {
        let p = new Parser(buffer)
        bot.worldUpdate(p.parseInbound())
    } catch (e) {
        // About 5% of packets the parser currently fails to parse.
        // Not the issue though, this happens rare enough and does not affect the performance much.
        // We are able to correct for missed data.
    }
}

function sendPackets(wsInstance, packets) {
    for (let packet of packets) {
        let enc = new Encoder()
        proxiedSend.call(wsInstance, enc.encodeOutbound(packet))
    }
    return null
}

function handleSendData(buffer) {
    let p = new Parser(buffer)
    let packet = p.parseOutbound()
    if (packet.kind === data.outPacketKinds.INPUT) {
        return initDone ? sendPackets(this, bot.getOutPackets(packet)) : buffer
    } else if (packet.kind === data.outPacketKinds.EXT_FOUND) {
        return null
    } else if (packet.kind === data.outPacketKinds.SPAWN) {
        initDone = true
        bot.reset()
        return buffer
    }
    return buffer
}

// -----------------
// WS Injection.
var wsInstances = new Set();
var proxiedSend = window.WebSocket.prototype.send;

window.WebSocket.prototype.send = function (data_) {
    // Data is provided as the UInt8 view, any kind of buffer or view can be returned.
    let data = new Uint8Array(data_)
    if (!wsInstances.has(this)) {
        console.log("Hello: New WebSocket is being used.")
        wsInstances.add(this);
        var inst = this;
        var proxiedRecv = inst.onmessage;
        this.onmessage = function (event) {
            event.data = handleRecvData.call(this, new Uint8Array(event.data));
            if (event.data) {
                return proxiedRecv.call(this, event);
            }
        };
    }
    try {
        data = handleSendData.call(this, data);
    }
    catch (e) {
        console.log(e)
    }
    if (data) {
        return proxiedSend.call(this, data);
    }
};

console.log('ok')