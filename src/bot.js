const { World } = require("./world.js");
const  data = require("./data.js");
const tank_ = require("./tank.js");
const {AI, unitVecDiff, dot} = require("./ai.js");

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
        this.setTankConfig(tankConfig);
        this.spawned = false
        // this.strategy = (inputPacket) => {return this.universalStrategy(inputPacket)}
        this.strategy = this.getBodyguardStrategy()
        this.allies = {}
        this.aimlessTarget = {x: 0, y: 0}
        this.master = null
        this.attackOn = true;
        this.id = 0
        this.numBots = 1
    }

    handleCommand(c) {
        if (!c) {
            return;
        }
        if (c.type === "master") {
            this.master = c.target || null;
            if (this.master) {
                this.allies[this.master.entityId] = 1
            }
        } else if (c.type === "attack") {
            this.attackOn = c.on;
        }
    }

    setTankConfig(tankConfig) {
        this.tankConfig = tankConfig
        this.buildManager = new tank_.TankBuildManager(this.tankConfig)
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
                name: "Guard",
            },
        ]
    }

    noTargetStrategy(inputPacket) {
        // Object.assign(inputPacket, {key: data.keyInput[Object.keys(data.directionKeys)[this.w.frame % 8]]})
        if (Math.random() < 5e-3 || this.aimlessTarget.x === 0) {
            this.aimlessTarget = {x: (Math.random()-0.5)*5000, y: (Math.random()-0.5)*5000,}
        }
        Object.assign(inputPacket, this.ai.goto(this.aimlessTarget, 55, true, this.getAlliedEntitites()));
        return inputPacket
    }

    getAlliedEntitites() {
        let res = []
        for (let id of Object.keys(this.allies)) {
            let cand = this.w.entities[id]
            if (cand) {
                res.push(cand)
            }
        }
        return res
    }

    getBodyguardStrategy() {
        if (this.tankConfig.ramming) {
            throw "Rammer cannot be a body guard."
        }
        var step = 0
        var lastEnemySeen = step
        return (inputPacket) => {
            step++;
            if (!this.master) {
                return this.universalStrategy(inputPacket)
            }
            inputPacket.key |= data.keyInput.LEFT_MOUSE
            inputPacket.key ^= data.keyInput.LEFT_MOUSE
            let tankConfig = this.tankConfig;

            let masterId = this.master.entityId;
            let master = this.w.entities.hasOwnProperty(masterId) ? this.w.entities[masterId] : this.master;

            let target = this.w.getLowestEntity(data.entityTypes.TANK, this.allies)
            let targetLook = this.ai.aimAt(tankConfig.bulletProfile, target)

            Object.assign(inputPacket, this.ai.follow(master, tankConfig.avgTankSpeed, tankConfig.maxTankSpeed, 660, this.getAlliedEntitites()));
            let masterLook = this.ai.aimAt(tankConfig.bulletProfile, master)
            if  (step - lastEnemySeen > 10 && false) {
                Object.assign(inputPacket, masterLook);
            } else {
                // Avoid aiming at the master if recently shooting...
                Object.assign(inputPacket, this.ai.lookAtAngle(masterLook, 180));

            }
            if (targetLook && masterLook && dot(unitVecDiff(this.ai.ownTank, masterLook), unitVecDiff(this.ai.ownTank, targetLook)) < 0.77) {
                lastEnemySeen = this.w.frame
                Object.assign(inputPacket, targetLook);
                if (this.attackOn) {
                    inputPacket.key |= data.keyInput.LEFT_MOUSE
                }
            }

            return [inputPacket]
        }
    }

    universalStrategy(inputPacket) {
        let oldKey = inputPacket.key || 0;
        let target = this.w.getLowestEntity(data.entityTypes.TANK, this.allies)
        let tankConfig = this.tankConfig;
        if (target) {
            if (this.tankConfig.ramming) {
                Object.assign(inputPacket, this.ai.ramInto(target, tankConfig.avgTankSpeed, tankConfig.maxTankSpeed, tankConfig.reverseShoot));
            } else {
                Object.assign(inputPacket, this.ai.huntDown(target, tankConfig.bulletProfile, tankConfig.avgTankSpeed, tankConfig.maxTankSpeed, tankConfig.keepDist));
            }
            if (this.attackOn) {
                inputPacket.key |= data.keyInput.LEFT_MOUSE
            }
        } else {
            inputPacket = this.noTargetStrategy(inputPacket)
        }
        inputPacket.key |= oldKey
        return [inputPacket]
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
            try {
                return this.buildManager.maybeGetInitPackets(this.w)
            } catch (e) {
                return this.reset()
            }
        }
        if (!this.w.checkAliveAndOk()) {
            return this.reset()
        }
        if (this.strategy) {
            return this.strategy(inputPacket)
        }
        return [inputPacket]

    }
}

module.exports = {Bot}