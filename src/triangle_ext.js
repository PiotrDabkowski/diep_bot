var data = require("./data.js");
var {Parser} = require("./parser.js");
const {Encoder} = require("./encoder.js");
const { inject } = require("./injection.js")


function sendPackets(wsInstance, packets) {
    for (let packet of packets) {
        let enc = new Encoder()
        proxiedSend.call(wsInstance, enc.encodeOutbound(packet))
    }
    return null
}



var frame = 0;
var trianglePhase = 0;
window.isOn = false;
window.switchPeriod = 3;
window.switches = [78, -1]
var phase = 0


document.addEventListener('keydown', function(e) {
  if (e.key === 't' || e.key === 'T') {
      window.isOn = !window.isOn;
      phase = 0;
      console.log(`Switch script on: ${window.isOn}`)
  }
});


function handleSendData(buffer) {
    window.sendPackets = (packets) => sendPackets(this, packets);
    let p = new Parser(buffer)
    let packet = p.parseOutbound()
    if (packet.kind === data.outPacketKinds.SPAWN) {
        window.isOn = false;
    }
    if (packet.kind !== data.outPacketKinds.INPUT) {
        if (packet.kind !== data.outPacketKinds.HEARTBEAT) {
            console.log(packet)
        }
        if (packet.kind === data.outPacketKinds.EXT_FOUND) {
            console.log("Extension found packet blocked!")
            return null
        }
        return buffer
    }

    frame++;
    if (window.isOn && frame % window.switchPeriod === 0) {
        phase = phase % switches.length;
        let cmd = window.switches[phase++]
        if (cmd >= 0) {
            // select triangle
            sendPackets(this, [{kind: 4, tankId: cmd}])
        } else {
            // switch tank via /
            packet.key |= data.keyInput.SWITCH_CLASS;
            return sendPackets(this, [packet])
        }
    }
    return buffer
}


// -----------------
// WS Injection.
var proxiedSend = inject(null, handleSendData);