const { WSConnection, linkParse, getDiepWSParams } = require('./connection')
const data = require('./data.js')
const { Bot } = require('./bot.js')
const { Parser } = require('./parser.js')
const tank_ = require("./tank.js");
const WebSocket = require('ws')

const program = require('commander');

program
  .option('-p, --party <value>', 'Your diep.io sandbox party link (eg: diep.io/#93D64747001AF89EF02920)')
  .option('-t, --tank <value>', 'One of supported tank types: ' + Object.keys(tank_.tankTypes).join(', '))
  .option('-b, --body <value>', 'Bodyguard mode entity id')
  .option('-n, --num <value>', 'Number of bots', 1)



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

var addressPool = [
    null,
    "2a05:d012:2f6:a100:1075:c087:f048:d311",
    "2a05:d012:2f6:a100:f13e:1af3:d3d1:44d1"
]

// 2 connections allowed per IP.
addressPool = addressPool.concat(addressPool)

let serverInfo = linkParse(program.party)

function getDiepBot(serverInfo) {
    if (addressPool.length == 0) {
        console.log('run out of addresses');
        return null;
    }
    let ipv6 = addressPool.shift();
    let ws = new WSConnection(serverInfo.ws, getDiepWSParams(serverInfo.ws, ipv6))

    let bot = new Bot(true, tank_.tankTypes[program.tank])
    bot.running = true
    bot.ws = ws;
    if (program.body) {
        bot.strategy = bot.getBodyguardStrategy(program.body)
    }
    ws.on('open', () => {
        ws.send({kind: data.outPacketKinds.HEARTBEAT})
        ws.send({kind: data.outPacketKinds.INIT, unk1: '', unk2: '', build: '5d3c85aad8642f8b14ad7cfa43a007b4a9b15c8a', partyId: serverInfo.party})
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
            // console.log(bot.w.entities)
        } catch (e) {
            // About 5% of packets the parser currently fails to parse.
            // Not the issue though, this happens rare enough and does not affect the performance much.
            // We are able to correct for missed data.
        }
    })

    ws.on("error", () => {
        console.log("errors...")
    })

    ws.on("close", () => {
        bot.running = false
        addressPool.push(ipv6)
        console.log("conf close")
    })


    return bot
}


let bots = []
for (let i = 0; i < +program.num; i++) {
    bot = getDiepBot(serverInfo)
    bot.id = i;
    bot.numBots = +program.num
    bots.push(bot)
}

var master = null

function updateAllies() {
    let allies = {}
    for (let bot of bots) {
        let id = bot.ai.ownTank;
        if (id) {
            allies[id.entityId] = 1
        }
        bot.allies = allies
    }
}

function updateBots() {
    updateAllies()
    setTimeout(updateBots, 330)
}
updateBots()


// Server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
  console.log("Got in connection!")
  ws.on('message', function incoming(message) {
    let command = JSON.parse(message);
    for (let bot of bots) {
        bot.handleCommand(command);
    }
  });
});


