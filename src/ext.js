var data = require("./data.js");
const tank_ = require("./tank.js");
var {Parser} = require("./parser.js");
const {Encoder} = require("./encoder.js");
const { Bot } = require("./bot.js")
const { inject } = require("./injection.js")


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
    return buffer
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
var proxiedSend = inject(handleRecvData, handleSendData);