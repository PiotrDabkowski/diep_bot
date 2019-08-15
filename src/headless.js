const { WSConnection } = require('./connection')
const data = require('./data.js')
const { Bot } = require('./bot.js')
const { Parser } = require('./parser.js')
const tank_ = require("./tank.js");

const program = require('commander');

program
  .option('-p, --party <value>', 'Your diep.io sandbox party link (eg: diep.io/#93D64747001AF89EF02920)')
  .option('-t, --tank <value>', 'One of supported tank types: ' + Object.keys(tank_.tankTypes).join(', '))


program.parse(process.argv);


if (process.argv.slice(2).length < 1) {
    console.log("Missing required party option.")
  console.log(program.help());
    process.exit(1)
}
program.tank = program.tank || "dragon"
if (!tank_.tankTypes.hasOwnProperty(program.tank)) {
    console.log("invalid tank type, choose one from: " + Object.keys(tank_.tankTypes).join(', '))
    process.exit(1)
}

console.log(program);

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


let serverInfo = linkParse(program.party)
let ws = new WSConnection(serverInfo.ws, {ip: 2, release: ()=>{}})

let bot = new Bot(true, tank_.tankTypes[program.tank])

ws.on('open', () => {
    ws.send({kind: data.outPacketKinds.HEARTBEAT})
    ws.send({kind: data.outPacketKinds.INIT, unk1: '', unk2: '', build: '262dc9877a9ae20ee80991d37da301dc856b33dd', partyId: serverInfo.party})
    setTimeout(inputLoop, 25)
})

function inputLoop() {
    ws.multiSend(bot.getOutPackets())
    setTimeout(inputLoop, 25)
}

ws.on('message', (buffer) => {
    try {
        let p = new Parser(buffer)
        bot.worldUpdate(p.parseInbound())
    } catch (e) {
        // About 5% of packets the parser currently fails to parse.
        // Not the issue though, this happens rare enough and does not affect the performance much.
        // We are able to correct for missed data.
    }
})

