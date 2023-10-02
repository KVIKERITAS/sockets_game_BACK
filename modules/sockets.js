const {Server} = require("socket.io")
const userDb = require("../schemas/userSchema")
const ShortUniqueId = require("short-unique-id");
const {randomUUID} = new ShortUniqueId({length: 10});
const weaponGenerator = require("../modules/weaponGenerator")
const armorGenerator = require("../modules/armorGenerator")
const potionGenerator = require("../modules/potionGenerator")

let onlineUsers = []
let battleRooms = []

module.exports = (server) => {

    const io = new Server(server, {
        cors: {
            origin: "http://localhost:5173"
        }
    })

    io.on("connection", (socket) => {

        socket.on("userConnected", async (username) => {
            const user = await userDb.findOne({username}, {password: 0, _id: 0, tokens: 0, experience: 0, inventory: 0})
            onlineUsers.push({
                id: socket.id,
                user
            })

            io.emit("onlineUsers", onlineUsers)
        })

        socket.on("generate", async (username) => {
            const user = await userDb.findOne({username})
            if (user.tokens > 0) {
                await userDb.findOneAndUpdate({username}, {$inc: {tokens: -1}}, {new: true})
                const userData = await userDb.find({username}, {password: 0})
                const weapons = [weaponGenerator(), armorGenerator(), potionGenerator()]
                io.to(socket.id).emit("weapons", weapons, userData)
            }
        })

        socket.on("takeItem", async (item, username) => {
            await userDb.findOneAndUpdate({username}, {$push: {inventory: item}})
            const userData = await userDb.find({username}, {password: 0})
            io.to(socket.id).emit("inventoryUpdate", userData)
        })

        socket.on("disconnect", () => {
            onlineUsers = onlineUsers.filter(user => user.id !== socket.id)
            io.emit("onlineUsers", onlineUsers)
        })

        socket.on("battleRequest", (sendToSocketId, senderUsername, equipment, senderCharacter) => {
            if (!equipment.weapon) return socket.emit("noWeapon", "You must wield a weapon into the fight. Go to inventory and equip one.")

            const roomId = randomUUID()

            const playerObject = {
                username: senderUsername,
                inventory: equipment,
                health: 100,
                character: senderCharacter,
                hasPotion: false
            }

            if (equipment.potion) playerObject.hasPotion = true

            const room = {
                id: roomId,
                player1: playerObject,
                player2: null,
                timer: null,
                turn: senderUsername
            }

            battleRooms.push(room)
            socket.join(roomId)

            io.to(sendToSocketId).emit("receiveBattleRequest", `${senderUsername} wants to battle with you`, roomId)
        })

        socket.on("acceptRequest", (roomId, username, character, equipment) => {
            const playerObject = {
                username,
                inventory: equipment,
                health: 100,
                character,
                hasPotion: false
            }

            if (equipment.potion) playerObject.hasPotion = true

            const roomIndex = battleRooms.findIndex(room => room.id === roomId)
            battleRooms[roomIndex].player2 = playerObject

            socket.join(roomId)

            io.to(roomId).emit("battleStart", battleRooms[roomIndex])
        })

        socket.on("usedAttack", (username, roomId, battleData) => {

            let damage = 0
            let critChance = 0
            let lifeSteal = 0

            let player1DodgeChance = 0
            let player2DodgeChance = 0

            if (username === battleData.player1.username) {
                let weaponDamage = Math.floor(Math.random() * (battleData.player1.inventory.weapon.maxDamage - battleData.player1.inventory.weapon.minDamage + 1)) + battleData.player1.inventory.weapon.minDamage
                damage += weaponDamage

                for (let i = 0; i < battleData.player1.inventory.weapon.effects.length; i++) {
                    // can try using filter

                    if (battleData.player1.inventory.weapon.effects[i].effectName === "critical") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= battleData.player1.inventory.weapon.effects[i].chance) {
                            critChance += battleData.player1.inventory.weapon.effects[i].chance
                        }
                    }

                    if (battleData.player1.inventory.weapon.effects[i].effectName === "dodge") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= battleData.player1.inventory.weapon.effects[i].chance) {
                            player1DodgeChance += battleData.player1.inventory.weapon.effects[i].chance
                        }
                    }

                    if (battleData.player1.inventory.weapon.effects[i].effectName === "lifeSteal") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= battleData.player1.inventory.weapon.effects[i].chance) {
                            lifeSteal += 1
                        }
                    }
                }

                for (let i = 0; i < battleData.player1.inventory.armor.effects.length; i++) {
                    if (battleData.player1.inventory.armor.effects[i].effectName === "critical") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= battleData.player1.inventory.armor.effects[i].chance) {
                            critChance += battleData.player1.inventory.armor.effects[i].chance
                        }
                    }

                    if (battleData.player1.inventory.armor.effects[i].effectName === "dodge") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= battleData.player1.inventory.armor.effects[i].chance) {
                            player1DodgeChance += battleData.player1.inventory.armor.effects[i].chance
                        }
                    }

                    if (battleData.player1.inventory.armor.effects[i].effectName === "lifeSteal") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= battleData.player1.inventory.armor.effects[i].chance && lifeSteal === 0) {
                            lifeSteal += 1
                        }
                    }
                }

                const applyCritChance = Math.floor(Math.random() * 100)
                if (applyCritChance <= critChance) damage *= 2

                const dodgedChance = Math.floor(Math.random() * 100)
                if (player2DodgeChance > 0 && player2DodgeChance <= dodgedChance) {
                    damage = 0
                    player2DodgeChance = 0
                    console.log("Player dodged", damage)
                }

                battleData.player2.health -= damage
                battleData.turn = battleData.player2.username

            } else {
                let weaponDamage = Math.floor(Math.random() * (battleData.player2.inventory.weapon.maxDamage - battleData.player2.inventory.weapon.minDamage + 1)) + battleData.player2.inventory.weapon.minDamage
                damage += weaponDamage

                for (let i = 0; i < battleData.player2.inventory.weapon.effects.length; i++) {
                    if (battleData.player2.inventory.weapon.effects[i].effectName === "critical") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= battleData.player2.inventory.weapon.effects[i].chance) {
                            critChance += battleData.player2.inventory.weapon.effects[i].chance
                        }
                    }

                    if (battleData.player2.inventory.weapon.effects[i].effectName === "dodge") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= battleData.player2.inventory.weapon.effects[i].chance) {
                            player1DodgeChance += battleData.player2.inventory.weapon.effects[i].chance
                        }
                    }

                    if (battleData.player2.inventory.weapon.effects[i].effectName === "lifeSteal") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= battleData.player2.inventory.weapon.effects[i].chance) {
                            lifeSteal += 1
                        }
                    }
                }

                for (let i = 0; i < battleData.player2.inventory.armor.effects.length; i++) {
                    if (battleData.player2.inventory.armor.effects[i].effectName === "critical") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= battleData.player2.inventory.armor.effects[i].chance) {
                            critChance += battleData.player2.inventory.armor.effects[i].chance
                        }
                    }

                    if (battleData.player2.inventory.armor.effects[i].effectName === "dodge") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= battleData.player2.inventory.armor.effects[i].chance) {
                            player1DodgeChance += battleData.player2.inventory.armor.effects[i].chance
                        }
                    }

                    if (battleData.player2.inventory.armor.effects[i].effectName === "lifeSteal") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= battleData.player2.inventory.armor.effects[i].chance && lifeSteal === 0) {
                            lifeSteal += 1
                        }
                    }
                }

                const applyCritChance = Math.floor(Math.random() * 100)
                if (applyCritChance <= critChance) damage *= 2

                const dodgedChance = Math.floor(Math.random() * 100)
                if (player1DodgeChance > 0 && player1DodgeChance <= dodgedChance) {
                    damage = 0
                    player1DodgeChance = 0
                }

                battleData.player1.health -= damage
                battleData.turn = battleData.player1.username
            }


            io.to(roomId).emit("getResult", battleData)
        })
    })
}