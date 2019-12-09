const WebSocket = require('ws')

var wss = new WebSocket.Server({port: 8080})
var conn = false;
var swarm = null;


wss.on('connection', function connection(ws) {

    ws.on('message', function incoming(message) {
        if (!conn) {
            let tmpSwarm = new WebSocket("ws://35.180.121.250:8080")
            conn = true;
            tmpSwarm.on("close", () => {
                console.log("Swarm dead!")
                swarm = null
                conn = false
            })
            tmpSwarm.on("open", () => {
                console.log("Swarm ready")
                swarm = tmpSwarm
            })
            tmpSwarm.on("error", () => {
                console.log("Cannot connect to swarm")
                swarm = null
                conn = false
            })
        }
        if (swarm) {
            try {
                swarm.send(message)
            } catch (e) {
                console.log(e)
            }
        }
    });

    ws.send('something');
});