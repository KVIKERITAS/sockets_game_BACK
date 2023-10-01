const potion = {
    category: "POTIONS",
    name: "Healing Salve",
    image: "https://i.ibb.co/Vp3BqYR/potions-4.png"
}

const randomNumber = (max) => {
    return Math.floor(Math.random() * max + 1);
}


module.exports = () => {

    return {
        ...potion,
        grade: null,
        slots: null,
        minDamage: null,
        maxDamage: null,
        minArmor: null,
        maxArmor: null,
        effects: [],
        healing: randomNumber(99)
    }
}