var data = require("./data.js")

const config = {
    entityTTL: 200,
    deleteDead: true
}

function hasPosition(ent) {
    return ent.hasOwnProperty('x') && ent.hasOwnProperty('y')
}

const World = class {
    constructor() {
       this.clear();
    }

    clear() {
        this.entities = {}
        this.oldEntities = {}
        this.typeInference = {"1#0": data.entityTypes.LEADER_TANK}
        this.stamp = 0
        this.frame = 0;
    }
    checkAliveAndOk() {
        if (this.frame < 250) return true;
        let thisEnt = this.getLowestEntity(data.entityTypes.OWN_TANK)
        return thisEnt && this.stamp - thisEnt.stamp  < 100
    }

    eatUpdate(packet) {
        if (packet.kind !== data.inPacketKinds.UPDATE) return
        this.frame++;
        this.stamp = packet.updateId
        this.oldEntities = JSON.parse(JSON.stringify(this.entities))
        for (let upcreate of packet.upcreates) {
            const entityId = upcreate.entityId
            if (upcreate.updateKind === data.updateKinds.CREATE) {
                if (this.entities.hasOwnProperty(entityId)) {
                    Object.assign(this.entities[entityId], upcreate)
                } else {
                    this.entities[entityId] = upcreate
                }
                // save the type of the entity permanently for the future use if needed.
                this.typeInference[entityId] = upcreate.entityType
            } else if (upcreate.updateKind === data.updateKinds.UPDATE) {
                if (this.entities.hasOwnProperty(entityId)) {
                    Object.assign(this.entities[entityId], upcreate)
                } else {
                    this.entities[entityId] = upcreate
                    this.entities[entityId].entityType = this.typeInference.hasOwnProperty(entityId) ? this.typeInference[entityId] : data.entityTypes.UNKNOWN
                }
            } else {
                continue
            }
            this.entities[upcreate.entityId].stamp = this.stamp

        }
        for (let del of packet.deletes) {
            delete this.entities[del]
        }

        this.gardener()
    }

    getLowestEntity(entityType) {
        let id = this.getLowestEntityId(entityType)
        return id && this.entities[id]
    }

    getLowestEntityId(entityType) {
        let id = null
        for (let key of Object.keys(this.entities)) {
            if (this.entities[key].entityType === entityType) {
                id = !id || key < id ? key : id
            }
        }
        return id

    }

    gardener() {
        this.posUnify()
        this.inferTypes()
        this.deleteOld()
        this.inferMovement()
    }

    // Converts to the uniform position format x/y
    posUnify() {
        for (let key of Object.keys(this.entities)) {
            let ent = this.entities[key]
            let x = ent.objPosX || ent.agentPosX || ent.agentPosX2
            if (x) {
                ent.x = x
            }
            let y = ent.objPosY || ent.agentPosY || ent.agentPosY2
            if (y) {
                ent.y = y
            }
        }
    }

    // Infers types for unknown entities.
    inferTypes() {
        // if (!this.getLowestEntityId(data.entityTypes.OWN_TANK)) {
        //     this.inferOwnTank()
        // }
    }

    inferOwnTank() {
        let cands = []
        for (let key of Object.keys(this.entities)) {
            if (this.entities[key].entityType === data.entityTypes.UNKNOWN) {
                cands.push(key)
            }
        }
        let pairs = []
        for (let left of cands) {
            for (let right of cands) {
                if (left >= right) {
                    continue
                }
                if (Math.sqrt(Math.pow(this.entities[left].x - this.entities[right].x, 2) + Math.pow(this.entities[left].y - this.entities[right].y, 2)) < 10) {
                    pairs.push([left, right])
                }
            }
        }
        if (pairs.length !== 1) {
            console.log(`Could not infer own tank! ${pairs}`)
            console.log(JSON.stringify(this.entities))
            return
        }
        let id1 = pairs[0][0]
        let id2 = pairs[0][1]
        this.entities[id1].entityType = data.entityTypes.OWN_TANK
        this.entities[id2].entityType = data.entityTypes.OWN_TANK
    }

    deleteOld() {
        for (let entityId of Object.keys(this.entities)) {
            let ent = this.entities[entityId]
            if (ent.stamp + config.entityTTL < this.stamp) {
                delete this.entities[entityId]
            } else if (config.config && ent.health === 0) {
                delete this.entities[entityId]
            }
        }
    }

    inferMovement() {
        for (let key of Object.keys(this.entities)) {
            if (!this.oldEntities.hasOwnProperty(key)) {
                continue
            }
            let oldEnt = this.oldEntities[key]
            let ent = this.entities[key]

            if (!hasPosition(oldEnt) || !hasPosition(ent)) {
                continue
            }
            let dt = ent.stamp - oldEnt.stamp + 1e-5
            // 0.5 is the smoothing by default - averaging from 2 frames basically. smoothing drops to 0 for higher dt (at dt==6 smoothing is 0).
            let smoothing = 0 //1 - Math.min(0.4 + 0.11*dt, 1.)

            let dx = (ent.x - oldEnt.x) / dt
            let oldDx = ent.dx || dx
            ent.dx = (1 - smoothing) * dx + oldDx * smoothing

            let dy = (ent.y - oldEnt.y) / dt
            let oldDy = ent.dy || dy
            ent.dy = (1 - smoothing) * dy + oldDy * smoothing

            ent.speed = Math.sqrt(Math.pow(ent.dx, 2) + Math.pow(ent.dy, 2))
        }
    }
}


let a = {"1#15":{"entityId":"1#15","updateKind":2,"objAngle":25,"entityType":"UNKNOWN","stamp":251,"objPosY":456,"unk_vu_53":1,"y":456,"objPosX":-1030,"x":-1030,"dx":0,"dy":0,"speed":0,"expPointsOthert":25,"maxHealth":54,"health":45.986595153808594,"fade":51.005001068115234},"1#14":{"entityId":"1#14","updateKind":2,"agentPosY2":456.77587890625,"entityType":"UNKNOWN","stamp":223,"y":456.77587890625,"agentPosX2":-1030.7730712890625,"x":-1030.7730712890625,"dx":0,"dy":0,"speed":0,"tankMass":2,"unk_float_26":0.5445544719696045,"unk_float_27":11.133333206176758,"tankSpeed":2.4751875400543213,"tankLevel":3,"expPointsThis":25,"unk_float_59":14.98133373260498}}
let w = new World()
w.entities = a
w.inferOwnTank()
module.exports = {World: World}