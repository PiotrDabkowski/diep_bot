const { World } = require("./world.js");
const  data = require("./data.js");
const tank_ = require("./tank.js");
const {AI} = require("./ai.js");

function getDefaultInputPacket() {
    return {
        kind: data.outPacketKinds.INPUT,
            key: 0,
        x: 0,
        y: 0,
    }
}

const Bot = class {
    constructor(sansboxMode = true, tankConfig = tank_.dragonConfig) {
        if (!sansboxMode) {
            throw "Only sandbox is supported."
        }
        this.w = new World()
        this.ai = new AI(this.w)
        this.tankConfig = tankConfig
        this.buildManager = new tank_.TankBuildManager(this.tankConfig)
        this.spawned = false
    }

    reset() {
        this.w.clear()
        this.buildManager.reset()
        return [
            {
                kind: data.outPacketKinds.INPUT,
                x: 0,
                y: 0,
                key: data.keyInput.SUICIDE,
            },
            {
                kind: data.outPacketKinds.CLEAR_DEATH,
            },
            {
                kind: data.outPacketKinds.SPAWN,
                name: "Baby Bot <3",
            },
        ]
    }

    noTargetStrategy(inputPacket) {
        Object.assign(inputPacket, {key: data.keyInput[Object.keys(data.directionKeys)[this.w.frame % 8]]})
        return inputPacket
    }

    universalStrategy(inputPacket) {
        let oldKey = inputPacket.key || 0;
        let target = this.w.getLowestEntity(data.entityTypes.TANK)
        let tankConfig = this.tankConfig;
        if (target) {
            if (this.tankConfig.ramming) {
                Object.assign(inputPacket, this.ai.ramInto(target, tankConfig.avgTankSpeed, tankConfig.maxTankSpeed, tankConfig.reverseShoot));
            } else {
                Object.assign(inputPacket, this.ai.huntDown(target, tankConfig.bulletProfile, tankConfig.avgTankSpeed, tankConfig.maxTankSpeed, tankConfig.keepDist));
            }
            inputPacket.key |= data.keyInput.LEFT_MOUSE
        } else {
            inputPacket = this.noTargetStrategy(inputPacket)
        }
        inputPacket.key |= oldKey
        return inputPacket
    }

    // Only these 2 methods are public.

    worldUpdate(updatePacket) {
        this.w.eatUpdate(updatePacket)
    }

    // If this method fails then the connection should be reset.
    getOutPackets(userInputPacket = null) {
        let inputPacket = userInputPacket || getDefaultInputPacket();
        if (!this.spawned) {
            this.spawned = true;
            return this.reset()
        }
        if (!this.buildManager.initDone) {
            return this.buildManager.maybeGetInitPackets(this.w)
        }
        if (!this.w.checkAliveAndOk()) {
            return this.reset()
        }
        return [this.universalStrategy(inputPacket)]
    }
}

module.exports = {Bot}