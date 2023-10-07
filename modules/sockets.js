const {Server} = require("socket.io")
const userDb = require("../schemas/userSchema")
const ShortUniqueId = require("short-unique-id");
const {randomUUID} = new ShortUniqueId({length: 10});
const weaponGenerator = require("../modules/weaponGenerator")
const armorGenerator = require("../modules/armorGenerator")
const potionGenerator = require("../modules/potionGenerator")
const calculateDamage = require("../modules/calculateDamage")

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
                hasPotion: false,
                experienceGained: 0
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
            if (!equipment.weapon) return socket.emit("noWeapon", "You must wield a weapon into the fight. Go to inventory and equip one.")

            const playerObject = {
                username,
                inventory: equipment,
                health: 100,
                character,
                hasPotion: false,
                experienceGained: 0
            }

            if (equipment.potion) playerObject.hasPotion = true

            const roomIndex = battleRooms.findIndex(room => room.id === roomId)
            battleRooms[roomIndex].player2 = playerObject
            socket.join(roomId)

            io.to(roomId).emit("battleStart", battleRooms[roomIndex])
        })

        socket.on("usedPotion", (roomId) => {
            const foundUser = onlineUsers.find(user => user.id === socket.id)
            const roomIndex = battleRooms.findIndex(room => room.id === roomId)
            let battleData = battleRooms[roomIndex]

            if (foundUser.username === battleData.player1.username) {
                if (!battleData.player1.hasPotion) {
                    return socket.emit("noWeapon", "You don't have a potion")
                }
                battleData.player1.health += battleData.player1.inventory.potion.healing
                if (battleData.player1.health > 100) battleData.player1.health = 100
                battleData.player1.hasPotion = false
                battleData.player1.inventory.potion = null
                battleData.turn = battleData.player2.username
            } else {
                if (!battleData.player2.hasPotion) {
                    return socket.emit("noWeapon", "You don't have a potion")
                }
                battleData.player2.health += battleData.player2.inventory.potion.healing
                if (battleData.player2.health > 100) battleData.player2.health = 100
                battleData.player2.hasPotion = false
                battleData.player2.inventory.potion = null
                battleData.turn = battleData.player1.username
            }
            io.to(roomId).emit("getResult", battleData)
        })

        socket.on("usedAttack", async (roomId) => {
            const foundUser = onlineUsers.find(user => user.id === socket.id)
            const roomIndex = battleRooms.findIndex(room => room.id === roomId)
            let battleData = battleRooms[roomIndex]

            if (battleData.player1.username === foundUser.user.username) {
                const attackerUsername = battleData.player1.username
                const attackerWeapon = battleData.player1.inventory.weapon
                const attackerArmor = battleData.player1.inventory.armor

                const defenderUsername = battleData.player2.username
                const defenderWeapon = battleData.player2.inventory.weapon
                const defenderArmor = battleData.player2.inventory.armor

                const damage = calculateDamage(attackerWeapon, attackerArmor, defenderUsername, defenderWeapon, defenderArmor)

                battleData.player2.health -= damage
                battleData.player1.experienceGained += Math.round(damage / 2)
                if (battleData.player2.health <= 0) {
                    const wonUser = await userDb.findOne({username: attackerUsername})
                    const currentXP = wonUser.experience + battleData.player1.experienceGained
                    if (currentXP >= 100) {
                        const updatedXp = currentXP - 100
                        await userDb.findOneAndUpdate({username: attackerUsername}, {$inc: {tokens: +1}, $set: {experience: updatedXp}}, {new: true})
                    } else {
                        await userDb.findOneAndUpdate({username: attackerUsername}, {$set: {experience: currentXP}}, {new: true})
                    }
                    const userData = await userDb.find({username: attackerUsername}, {password: 0})
                    socket.emit("battleWon", `Congratulations you won the battle. You were awarded ${battleData.player1.experienceGained}XP for the Victory.`, userData)
                    const lostUser = onlineUsers.find(users => users.user.username === defenderUsername)
                    socket.to(lostUser.id).emit("battleLost", "Unfortunately you lost the battle.")
                    io.socketsLeave(roomId)
                    battleRooms = battleRooms.filter(room => room.id !== roomId)
                    return
                }
                battleData.turn = defenderUsername
            } else {
                const attackerUsername = battleData.player2.username
                const attackerWeapon = battleData.player2.inventory.weapon
                const attackerArmor = battleData.player2.inventory.armor

                const defenderUsername = battleData.player1.username
                const defenderWeapon = battleData.player1.inventory.weapon
                const defenderArmor = battleData.player1.inventory.armor

                const damage = calculateDamage(attackerWeapon, attackerArmor, defenderUsername, defenderWeapon, defenderArmor)

                battleData.player1.health -= damage
                battleData.player2.experienceGained += Math.round(damage / 2)
                if (battleData.player1.health <= 0) {
                    const wonUser = await userDb.findOne({username: attackerUsername})
                    const currentXP = wonUser.experience + battleData.player2.experienceGained
                    if (currentXP >= 100) {
                        const updatedXp = currentXP - 100
                        await userDb.findOneAndUpdate({username: attackerUsername}, {$inc: {tokens: +1}, $set: {experience: updatedXp}}, {new: true})
                    } else {
                        await userDb.findOneAndUpdate({username: attackerUsername}, {$set: {experience: currentXP}}, {new: true})
                    }
                    const userData = await userDb.find({username: attackerUsername}, {password: 0})
                    socket.emit("battleWon", `Congratulations you won the battle. You were awarded ${battleData.player1.experienceGained}XP for the Victory.`, userData)
                    const lostUser = onlineUsers.find(users => users.user.username === defenderUsername)
                    socket.to(lostUser.id).emit("battleLost", "Unfortunately you lost the battle.")
                    io.socketsLeave(roomId)
                    battleRooms = battleRooms.filter(room => room.id !== roomId)
                    return
                }
                battleData.turn = defenderUsername
            }

            io.to(roomId).emit("getResult", battleData)

        })
    })
}