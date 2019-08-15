var data = require("./data.js")


function l2(vec) {
    return Math.sqrt(Math.pow(vec.x, 2) + Math.pow(vec.y, 2)) + 1e-5
}

function dot(vec1,vec2) {
    return vec1.x*vec2.x + vec1.y*vec2.y
}

function toUnit(vec) {
    let len = l2(vec)
    return toVec(vec.x / len, vec.y / len)
}

function diff(start, end) {
    return toVec(end.x - start.x, end.y - start.y)
}

function dist(a, b) {
    return l2(diff(a, b))
}


function unitVecDiff(start, end) {
    return toUnit(diff(start, end))
}

function velocity(posObj) {
    return toVec(posObj.dx, posObj.dy)
}

function toVec(x, y) {
    return {x: x, y: y}
}

function dbgVec(vec) {
    return `[${vec.x.toFixed(2)} ${vec.y.toFixed(2)}]`
}

AI = class {
    constructor(world) {
        this.w = world
    }

    get ownTank() {
        let ownTank = this.w.getLowestEntity(data.entityTypes.OWN_TANK)
        if (!ownTank) {
            console.log("Cannot find own tank")
            return null
        }
        return ownTank
    }


    getTarget(aim) {
        let bestScore = 0
        let ownTank = this.ownTank;
        if (!ownTank) return null;
        let direction = unitVecDiff(ownTank, aim)
        // the range where aiming is hard so we should always choose tanks in this range
        let kDangerRange = 300 // 6 grids
        let target = null
        for (let key of Object.keys(this.w.entities)) {
            let score = 0
            let obj = this.w.entities[key]
            let d = diff(ownTank, obj)
            let heading = unitVecDiff(ownTank, obj)
            let angle = Math.acos(0.9999 * dot(heading, direction)) * 180 / 3.14
            if (d < kDangerRange && obj.entityType === data.entityTypes.TANK) {
                score = 10000000 - d
            } else if (angle > 30) {
                continue;
            } else if (obj.entityType === data.entityTypes.TANK) {
                score = 100000 - angle
            } else if (obj.entityType === data.entityTypes.UNKNOWN) {
                score = 10000 - angle
            } else if (obj.entityType === data.entityTypes.SHAPE) {
                score = 1000 - angle
            } else {
                continue
            }
            if (score > bestScore) {
                bestScore = score;
                target = key
            }
        }
        return target
    }

    // Looks at target and then rotates the look by provided number of degrees clockwise.
    // Returns the fixation point to achieve the final look.
    lookAtAngle(target, rotationDegrees, fixationDistance = 2500) {
        let ownTank = this.ownTank
        if (!ownTank) return null;
        if (!target) return null;
        let unitDirection  = unitVecDiff(ownTank, target)
        const rotation = rotationDegrees /180 * Math.PI
        // Counterclockwise since y axis if flipped
        let x = dot(toVec(Math.cos(rotation), -Math.sin(rotation)), unitDirection)
        let y = dot(toVec(Math.sin(rotation), Math.cos(rotation)), unitDirection)
        if (isNaN(x) || isNaN(y)) {
            console.log("No position data for target")
            return null
        }
        return toVec(ownTank.x + x*fixationDistance, ownTank.y + y*fixationDistance)
    }

    // Smart aim that takes into the account the own bullet/tank speed and the velocity/distance of the target.
    // Can be also used to ram somebody with a tank body (combine with goto).
    aimAt(bulletProfile, entity) {
        let ownTank = this.ownTank
        if (!ownTank) return null;
        let delta = diff(ownTank, entity)
        let deltaL2 = l2(delta)
        // linear interpolation
        let bs = bulletProfile.min + (bulletProfile.max - bulletProfile.min) * Math.max(1 - deltaL2 / bulletProfile.range, 0)
        let unitDeltaPerp = toVec(delta.y / deltaL2, -delta.x / deltaL2)
        let entPerpComponent = dot(unitDeltaPerp, velocity(entity))
        if (entPerpComponent > bs * 0.9) {
            // impossible to hit the entity with the provided bullet speed
            console.log('hit impossible')
            return null
        }
        let directComponent = Math.sqrt(Math.pow(bs, 2) - Math.pow(entPerpComponent, 2))
        let offset = entPerpComponent / directComponent * deltaL2
        let res = {
            x: entity.x + offset * unitDeltaPerp.x,
            y: entity.y + offset * unitDeltaPerp.y,
        }
        if (isNaN(res.x) || isNaN(res.y)) {
            console.log("No position data for target")
            return null
        }
        console.log(`DIS: ${deltaL2.toFixed(2)} BS ${bs.toFixed(2)} ES ${entity.speed.toFixed(2)} PS ${entPerpComponent.toFixed(2)} EV ${[entity.dx.toFixed(2), entity.dy.toFixed(2)]} PV ${[unitDeltaPerp.x.toFixed(2), unitDeltaPerp.y.toFixed(2)]} O: ${offset.toFixed(2)}`)
        return res;
    }

    // Smart goto with a feedback loop. The allowOvershoot can be set to false if we want to stop exactly at the target.
    // Otherwise, the tank may pass through the target due to momentum.
    goto(target, desiredSpeed = 55, allowOvershoot = true) {
        if (!target) return null;
        let ownTank = this.ownTank
        if (!ownTank) return null;
        //
        // console.log(`${dbgVec(ownTank)} ->  ${dbgVec(target)} @ SPEED ${ownTank.speed.toFixed(2)}`)

        let direction = diff(ownTank, target)
        let dist = l2(direction)
        let directionUnit = toUnit(direction)
        // if no overshoot allowed, use proportional controller, start slowing down at 10 grid away (500)
        let speedFactor = allowOvershoot ? 1 : Math.min(dist / 500, 1)
        let speed = speedFactor*desiredSpeed;
        let targetVelocity = toVec(speed*directionUnit.x, speed*directionUnit.y)
        let deltaVelocityRequest = diff(velocity(ownTank), targetVelocity)
        if (isNaN(deltaVelocityRequest.x) || isNaN(deltaVelocityRequest.y)) {
            console.log("No position for target")
            return null
        }
        // just select the direction that has the highest dot product with the delta velocity request
        let bestCosine = 0
        let bestDirection = null
        for (let direction of Object.keys(data.directionAccelerations)) {
            let cosine = dot(data.directionAccelerations[direction], deltaVelocityRequest)
            if (cosine > bestCosine) {
                bestCosine = cosine
                bestDirection = direction
            }
        }
        return {
            key: data.directionKeys[bestDirection],
        }
    }

    ramInto(target, avgTankSpeed = 50, maxTankSpeed=66, reverseLook = true) {
        if (!target) return null;
        let ownTank = this.ownTank
        if (!ownTank) return null;
        // Point that we want to hit.
        let point = this.aimAt({max: avgTankSpeed, min: avgTankSpeed, range: 10}, target)
        // How to get to this point ASAP?
        let movement = this.goto(point, maxTankSpeed, true)
        let fixation = this.lookAtAngle(point, reverseLook ? 180 : 0)

        let result = {}
        Object.assign(result, movement)
        Object.assign(result, fixation)
        return result
    }

    huntDown(target, bulletProfile, avgTankSpeed, maxTankSpeed, keepDistance) {
        if (!target) return null;
        let ownTank = this.ownTank
        if (!ownTank) return null;

        // Point that we want to hit with a bullet.
        let hitPoint = this.aimAt(bulletProfile, target)

        // Point where we want to walk to with tank.
        let walkPoint = this.aimAt({max: avgTankSpeed, min: avgTankSpeed, range: 10}, target)
        if (!walkPoint) {
            // try to approach even if not feasible
            walkPoint = target
        }
        let distance = dist(target, ownTank)
        walkPoint = this.lookAtAngle(walkPoint, 0, distance - keepDistance)
        let movement = this.goto(walkPoint, maxTankSpeed, false)

        let result = {}
        Object.assign(result, movement)
        Object.assign(result, hitPoint)
        return result
    }

    dodgeBullets() {

    }
}

module.exports = {AI: AI}