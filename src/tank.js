var data = require("./data.js")


const tankConfigTemplate = {
    bulletProfile: {
        max: 111,
        min: 64,
        range: 1500,
    },
    maxTankSpeed: 66,
    avgTankSpeed: 50,
    reverseShoot: false,
    ramming: false,
    keepDist: 800,

}


const sniperConfig = {
    bulletProfile: {
        max: 111,
        min: 64,
        range: 1500,
    },
    maxTankSpeed: 60,
    avgTankSpeed: 40,
    reverseShoot: false,
    ramming: false,
    stat: [5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 4, 4, 4, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8],
    seq: [80],
    keepDist: 1100,
}

const predatorConfig = {
    bulletProfile: {
        max: 111,
        min: 64,
        range: 1500,
    },
    maxTankSpeed: 60,
    avgTankSpeed: 40,
    reverseShoot: false,
    ramming: false,
    stat: [5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 4, 4, 4, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8],
    seq: [80, 122, 100],
    keepDist: 1100,
}


const dragonConfig = {
    bulletProfile: {
        max: 55,
        min: 55,
        range: 1500,
    },
    maxTankSpeed: 60,
    avgTankSpeed: 40,
    reverseShoot: false,
    ramming: false,
    stat: [5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 3, 2, 3, 2, 3],
    seq: [76, 78, 108],
    keepDist: 100,
}

const fighterConfig = {
    bulletProfile: {
        max: 55,
        min: 55,
        range: 1500,
    },
    maxTankSpeed: 60,
    avgTankSpeed: 40,
    reverseShoot: false,
    ramming: false,
    stat: [5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 4, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8],
    seq: [76, 78, 108],
    keepDist: 800,
}

const acConfig = {
    bulletProfile: {
        max: 121,
        min: 74,
        range: 2000,
    },
    maxTankSpeed: 60,
    avgTankSpeed: 40,
    reverseShoot: false,
    ramming: false,
    stat: [5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 4, 4, 4, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8],
    seq: [80, 74, 126],
    isAC: true,
    keepDist: 1500,
}

const aniRamConfig = {
    bulletProfile: {
        max: 30,
        min: 20,
        range: 500,
    },
    maxTankSpeed: 66,
    avgTankSpeed: 50,
    reverseShoot: true,
    ramming: true,
    stat: [2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 7, 7, 1, 1, 1, 1, 1],
    seq: [82, 72, 62],
}

function normAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle))
}

// All radians. Cant believe this hack...
function getUnknownIdsWithAngle(world, angle, tolerance) {
    let ids = []
    for (let key of Object.keys(world.entities)) {
        let ent = world.entities[key]
        if (ent.hasOwnProperty('objAngle')) {
            if (Math.abs(normAngle(ent.objAngle * Math.PI / 180. - angle)) < tolerance) {
                ids.push(key)

            }
        }
    }
    return ids
}

const TankBuildManager = class {
    constructor(tankConfig, sanboxMode = true) {
        this.config = tankConfig || dragonConfig
        if (this.config.stat.length !== 33) {
            throw "Specify 33 upgrade stat points."
        }
        this.sanboxMode = sanboxMode;
        this.reset()
    }

    reset() {
        this.initDone = false;

        this.lvlPacketsSent = 0
        this.initPacketsSent = 0
        this.stage = 0
        // Own tank detection, very hacky.
        this.possibleOwn = {}
        this.lastAngle = null
        this.lastStamp = -Infinity
        this.numSamles = 0
    }

    maybeGetInitPackets(world) {
        // console.log("Init stage", this.stage)

        switch (this.stage) {
            case 0:
                // determine own tank id...
                const kNumSamples = 33
                if (this.numSamles >= kNumSamples) {
                    let own = []
                    for (let id of Object.keys(this.possibleOwn)) {
                        // Very low chance this will happen randomly.
                        if (this.possibleOwn[id] >= kNumSamples / 3) {
                            own.push(id)
                        }
                    }
                    if (own.length !== 1) {
                        console.log("Could not find the own tank id, this is fatal!", own)
                        throw new Error("own tank inference...")
                    }
                    world.entities[own[0]].entityType = data.entityTypes.OWN_TANK
                    this.stage = this.sanboxMode ? 1 : 4;
                    return this.getLVLPacket();
                }
                if (world.stamp > this.lastStamp) {
                    if (this.lastAngle) {
                        let newCands = getUnknownIdsWithAngle(world, this.lastAngle, 15 * Math.PI / 180);
                        // console.log(`Possible own ids for angle ${normAngle(this.lastAngle) / Math.PI * 180}:`, newCands)
                        // if (world.entities['1#15']) {
                        //     console.log(normAngle(world.entities['1#15'].objAngle / 180 * Math.PI) * 180 / Math.PI)
                        //
                        // }
                        for (let cand of newCands) {
                            this.possibleOwn[cand] = (this.possibleOwn[cand] || 0) + 1
                        }
                        this.numSamles++
                        // console.log(this.possibleOwn)
                    }
                    this.lastStamp = world.stamp + 2
                    this.lastAngle = Math.random() * 2 * Math.PI
                    return [{
                        kind: data.outPacketKinds.INPUT,
                        key: this.sanboxMode ? data.keyInput.INSTANT_UPGRADE : 0,
                        x: Math.cos(this.lastAngle) * 1000000,
                        y: Math.sin(this.lastAngle) * 1000000,
                    }]
                } else {
                    return []
                }
            case 1:
                if (this.lvlPacketsSent > 121 - this.numSamles) {
                    this.stage++;
                }
                this.lvlPacketsSent++
                return this.getLVLPacket()
            case 2:
                this.stage++;
                return this.getStatUpdatePackets()
            case 3:
                this.stage++;
                return this.getTankUpdatePackets();
            case 4:
                if (this.initPacketsSent > 3) {
                    this.stage++;
                }
                this.initPacketsSent++
                return this.getInitPacket()

            default:
                this.initDone = true;
                return []
        }
    }

    getLVLPacket() {
        return [
            {
                kind: data.outPacketKinds.INPUT,
                key: data.keyInput.INSTANT_UPGRADE,
                x: 0,
                y: 0,
            }
        ]
    }

    getInitPacket() {
        return [
            {
                kind: data.outPacketKinds.INPUT,
                key: data.keyInput.LEFT | data.keyInput.UP,
                x: 0,
                y: 0,
            }
        ]
    }

    getStatUpdatePackets() {
        let cnts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0}
        let packets = []
        for (let stat of this.config.stat) {
            cnts[stat]++
            if (cnts[stat] > 7) {
                throw "this will not work :)"
            }
            packets.push(
                {
                    kind: data.outPacketKinds.UPDATE_STAT,
                    statId: 2 * data.statTable.find(stat),
                    upto: 2 * cnts[stat],
                }
            )
        }
        return packets
    }

    getTankUpdatePackets() {
        let packets = []
        for (let id of this.config.seq) {
            packets.push(
                {
                    kind: data.outPacketKinds.UPDATE_TANK,
                    tankId: id,
                }
            )
        }
        if (this.config.isAC) {
            packets.push(
                {
                    kind: data.outPacketKinds.INPUT,
                    key: data.keyInput.SWITCH_CLASS,
                    x: 0,
                    y: 0,
                }
            )
        }
        return packets
    }
}

const tankTypes = {
    dragon: dragonConfig,
    fighter: fighterConfig,
    sniper: sniperConfig,
    predator: predatorConfig,
    ram: aniRamConfig,
    ac: acConfig,
}

module.exports = {
    sniperConfig: sniperConfig,
    predatorConfig: predatorConfig,
    acConfig: acConfig,
    aniRamConfig: aniRamConfig,
    dragonConfig: dragonConfig,
    fighterConfig: fighterConfig,
    tankTypes: tankTypes,
    TankBuildManager: TankBuildManager,
}