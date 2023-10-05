module.exports = (attackerWeapon, attackerArmor, defenderUsername, defenderWeapon, defenderArmor) => {

    let damage = Math.floor(Math.random() * (attackerWeapon.maxDamage - attackerWeapon.minDamage + 1)) + attackerWeapon.minDamage
    let criticalChance = 0
    let lifeSteal = 0

    let defenderArmorValue = 0
    let defenderDodgeChance = 0

    for (let i = 0; i < defenderWeapon.effects.length; i++) {
        if (defenderWeapon.effects[i].effectName === "dodge") {
            const chance = Math.floor(Math.random() * 100)
            if (chance <= defenderWeapon.effects[i].chance) {
                defenderDodgeChance += defenderWeapon.effects[i].chance
            }
        }
    }

    if (defenderArmor) {
        defenderArmorValue = (Math.floor(Math.random() * (defenderArmor.maxArmor - defenderArmor.minArmor + 1)) + defenderArmor.minArmor) / 100

        for (let i = 0; i < defenderArmor.effects.length; i++) {
            if (defenderArmor.effects[i].effectName === "dodge") {
                const chance = Math.floor(Math.random() * 100)
                if (chance <= defenderArmor.effects[i].chance) {
                    defenderDodgeChance += defenderArmor.effects[i].chance
                }
            }
        }
    }

    if (attackerWeapon.effects) {
        for (let i = 0; i < attackerWeapon.effects.length; i++) {

            if (attackerWeapon.effects[i].effectName === "critical") {
                const chance = Math.floor(Math.random() * 100)
                if (chance <= attackerWeapon.effects[i].chance) {
                    criticalChance += attackerWeapon.effects[i].chance
                }
            }

            if (attackerWeapon.effects[i].effectName === "lifeSteal") {
                const chance = Math.floor(Math.random() * 100)
                if (chance <= attackerWeapon.effects[i].chance) {
                    lifeSteal += 1
                }
            }
        }
    }

    if (attackerArmor) {
        for (let i = 0; i < attackerArmor.effects.length; i++) {
            if (attackerArmor.effects[i].effectName === "critical") {
                const chance = Math.floor(Math.random() * 100)
                if (chance <= attackerArmor.effects[i].chance) {
                    criticalChance += attackerArmor.effects[i].chance
                }
            }

            if (attackerArmor.effects.effectName === "lifeSteal") {
                const chance = Math.floor(Math.random() * 100)
                if (chance <= attackerArmor.effects[i].chance) {
                    lifeSteal += 1
                }
            }
        }
    }

    const applyCriticalChance = Math.floor(Math.random() * 100)
    if (applyCriticalChance <= criticalChance) damage *= 2

    const applyDodge = Math.floor(Math.random() * 100)
    if (defenderDodgeChance > 0 && defenderDodgeChance <= applyDodge) {
        damage = 0
    }

    if (defenderArmorValue !== 0) {
        return Math.round(damage - (damage * defenderArmorValue))
    } else {
        return damage
    }
}