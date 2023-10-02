const armors = require("./armors")

const randomNumber = (max) => {
    return Math.floor(Math.random() * max);
}

const armorGenerator = () => {
    return armors[randomNumber(8)]
}

const gradeGenerator = () => {
    if (randomNumber(3) === 0) return "A"
    if (randomNumber(3) === 1) return "B"
    return "C"
}

const minArmorGenerator = (grade) => {
    if (grade === "A") return 20
    if (grade === "B") return 10
    return 5
}

const maxArmorGenerator = (grade) => {
    if (grade === "A") return 40
    if (grade === "B") return 20
    return 10
}

const slotsGenerator = (grade) => {
    if (grade === "A") return randomNumber(3) + 1
    if (grade === "B") return randomNumber(1) + 1
    return 0
}

function generateEffects(allEffects, slotsAmount) {
    const result = []

    const generateSingleEffect = (effectName) => {
        return {
            effectName,
            chance: effectName === "dodge" ? randomNumber(39) + 1 : randomNumber(49) + 1
        }
    }
    if (slotsAmount === 3) {
        for (let i = 0; i < 3; i++) {
            if(randomNumber(100) > 50) {
                result.push(generateSingleEffect(allEffects[i]))
            }
        }
    }
    if (slotsAmount === 2) {
        let effectsNames = [...allEffects]
        let selected = []
        const firstIndex = randomNumber(effectsNames.length-1)
        selected.push(effectsNames[firstIndex])
        effectsNames = effectsNames.filter((x, i) => i !== firstIndex)
        const secondIndex = randomNumber(effectsNames.length-1)
        selected.push(effectsNames[secondIndex])

        selected.map(x => {
            if(randomNumber(100) > 50) {
                result.push(generateSingleEffect(x))
            }
        })
    }
    if (slotsAmount === 1) {
        if(randomNumber(100) > 50) {
            const index = randomNumber(allEffects.length-1)
            result.push(generateSingleEffect(allEffects[index]))
        }
    }
    return result
}

module.exports = () => {
    const effectsArr = ["critical", "dodge", "lifeSteal"]

    const armor = armorGenerator()
    const grade = gradeGenerator()
    const slots = slotsGenerator(grade)
    const minArmor = minArmorGenerator(grade)
    const maxArmor = maxArmorGenerator(grade)
    const effects = generateEffects(effectsArr, slots)

    return {
        ...armor,
        grade,
        slots,
        minDamage: null,
        maxDamage: null,
        minArmor,
        maxArmor,
        effects,
        healing: null
    }
}