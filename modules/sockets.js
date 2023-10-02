const {Server} = require("socket.io")
const userDb = require("../schemas/userSchema")
const ShortUniqueId = require("short-unique-id");
const {randomUUID} = new ShortUniqueId({length: 10});
const weaponGenerator = require("../modules/weaponGenerator")
const armorGenerator = require("../modules/armorGenerator")
const potionGenerator = require("../modules/potionGenerator")

let onlineUsers = []
let battleRooms = []

let player1DodgeChance = 0

module.exports = (server) => {

    const io = new Server(server, {
        cors: {
            origin: "http://localhost:5173"
        }
    })

    io.on("connection", (socket) => {

        socket.on("userConnected", async (username) => {
            const user = await userDb.findOne({username}, {
                password: 0,
                _id: 0,
                tokens: 0,
                experience: 0,
                inventory: 0
            })

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

        socket.on("usedPotion", (username, roomId, battleData) => {
            if (username === battleData.player1.username) {
                battleData.player1.health += battleData.player1.inventory.potion.healing
                if (battleData.player1.health > 100) battleData.player1.health = 100
                battleData.player1.hasPotion = false
                battleData.turn = battleData.player2.username
            } else {
                battleData.player2.health += battleData.player2.inventory.potion.healing
                if (battleData.player2.health > 100) battleData.player2.health = 100
                battleData.player2.hasPotion = false
                battleData.turn = battleData.player1.username
            }
            io.to(roomId).emit("getResult", battleData)
        })

        socket.on("usedAttack", (username, roomId, battleData) => {
            const player1username = battleData.player1.username
            const player1weapon = battleData.player1.inventory.weapon
            const player1armor = battleData.player1.inventory.armor

            const player2username = battleData.player2.username
            const player2weapon = battleData.player2.inventory.weapon
            const player2armor = battleData.player2.inventory.armor

            let damage = 0
            let critChance = 0
            let lifeSteal = 0

            if (username === player1username) {
                if (player2armor) const player2armorValue = (Math.floor(Math.random() * (player2armor.maxArmor - player2armor.minArmor + 1)) + player2armor.minArmor) / 100

                let player2DodgeChance = 0
                for (let i = 0; i < player2weapon.effects.length; i++) {
                    if (player2weapon.effects[i].effectName === "dodge") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= player2weapon.effects[i].chance) {
                            player2DodgeChance += player2weapon.effects[i].chance
                        }
                    }
                }

                if (player2armor) {
                    for (let i = 0; i < player2armor.effects.length; i++) {
                        if (player2armor.effects[i].effectName === "dodge") {
                            const chance = Math.floor(Math.random() * 100)
                            if (chance <= player2armor.effects[i].chance) {
                                player2DodgeChance += player2armor.effects[i].chance
                            }
                        }
                    }
                }

                let weaponDamage = Math.floor(Math.random() * (player1weapon.maxDamage - player1weapon.minDamage + 1)) + player1weapon.minDamage
                damage += weaponDamage

                if (player1weapon.effects) {
                    for (let i = 0; i < player1weapon.effects.length; i++) {

                        if (player1weapon.effects[i].effectName === "critical") {
                            const chance = Math.floor(Math.random() * 100)
                            if (chance <= player1weapon.effects[i].chance) {
                                critChance += player1weapon.effects[i].chance
                            }
                        }

                        if (player1weapon.effects[i].effectName === "lifeSteal") {
                            const chance = Math.floor(Math.random() * 100)
                            if (chance <= player1weapon.effects[i].chance) {
                                lifeSteal += 1
                            }
                        }
                    }
                }

                if (player1armor) {
                    for (let i = 0; i < player1armor.effects.length; i++) {
                        if (player1armor.effects[i].effectName === "critical") {
                            const chance = Math.floor(Math.random() * 100)
                            if (chance <= player1armor.effects[i].chance) {
                                critChance += player1armor.effects[i].chance
                            }
                        }

                        if (player1armor.effects[i].effectName === "dodge") {
                            const chance = Math.floor(Math.random() * 100)
                            if (chance <= player1armor.effects[i].chance) {
                                player1DodgeChance += player1armor.effects[i].chance
                            }
                        }

                        if (player1armor.effects.effectName === "lifeSteal") {
                            const chance = Math.floor(Math.random() * 100)
                            if (chance <= player1armor.effects[i].chance) {
                                lifeSteal += 1
                            }
                        }
                    }
                }


                const applyCritChance = Math.floor(Math.random() * 100)
                if (applyCritChance <= critChance) damage *= 2

                const dodgedChance = Math.floor(Math.random() * 100)
                if (player2DodgeChance > 0 && player2DodgeChance <= dodgedChance) {
                    damage = 0
                }

                console.log("Player1" ,damage * player2armorValue)

                battleData.player2.health -= Math.floor(damage * player2armorValue)

                battleData.turn = player2username

            } else {
                let player1armorValue = 0
                let player1DodgeChance = 0

                for (let i = 0; i < player1weapon.effects.length; i++) {
                    if (player1weapon.effects[i].effectName === "dodge") {
                        const chance = Math.floor(Math.random() * 100)
                        if (chance <= player1weapon.effects[i].chance) {
                            player1DodgeChance += player1weapon.effects[i].chance
                        }
                    }
                }

                if (player1armor) {
                    player1armorValue = (Math.floor(Math.random() * (player1armor.maxArmor - player1armor.minArmor + 1)) + player1armor.minArmor) / 100
                    for (let i = 0; i < player1armor.effects.length; i++) {
                        if (player1armor.effects[i].effectName === "dodge") {
                            const chance = Math.floor(Math.random() * 100)
                            if (chance <= player1armor.effects[i].chance) {
                                player1DodgeChance += player1armor.effects[i].chance
                            }
                        }
                    }
                }

                let weaponDamage = Math.floor(Math.random() * (player2weapon.maxDamage - player2weapon.minDamage + 1)) + player2weapon.minDamage
                damage += weaponDamage

                if (player2weapon.effects) {
                    for (let i = 0; i < player2weapon.effects.length; i++) {
                        if (player2weapon.effects[i].effectName === "critical") {
                            const chance = Math.floor(Math.random() * 100)
                            if (chance <= player2weapon.effects[i].chance) {
                                critChance += player2weapon.effects[i].chance
                            }
                        }

                        if (player2weapon.effects[i].effectName === "lifeSteal") {
                            const chance = Math.floor(Math.random() * 100)
                            if (chance <= player2weapon.effects[i].chance) {
                                lifeSteal += 1
                            }
                        }
                    }
                }

                if (player2armor) {
                    for (let i = 0; i < player2armor.effects.length; i++) {
                        if (player2armor.effects[i].effectName === "critical") {
                            const chance = Math.floor(Math.random() * 100)
                            if (chance <= player2armor.effects[i].chance) {
                                critChance += player2armor.effects[i].chance
                            }
                        }

                        if (player2armor.effects[i].effectName === "lifeSteal") {
                            const chance = Math.floor(Math.random() * 100)
                            if (chance <= player2armor.effects[i].chance && lifeSteal === 0) {
                                lifeSteal += 1
                            }
                        }
                    }
                }

                const applyCritChance = Math.floor(Math.random() * 100)
                if (applyCritChance <= critChance) damage *= 2

                const dodgedChance = Math.floor(Math.random() * 100)
                if (player1DodgeChance > 0 && player1DodgeChance <= dodgedChance) {
                    damage = 0
                }

                console.log("Player2" ,damage * player1armorValue)

                battleData.player1.health -= Math.floor(damage * player1armorValue)

                battleData.turn = player1username
            }

            io.to(roomId).emit("getResult", battleData)

            if (battleData.player1.health <= 0 || battleData.player2.health <= 0) {
                return io.to(roomId).emit("fightFinish", "Fight finished")
            }
        })
    })
}