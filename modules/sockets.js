const {Server} = require("socket.io")
const userDb = require("../schemas/userSchema")
const weaponGenerator = require("../modules/weaponGenerator")
const armorGenerator = require("../modules/armorGenerator")
const potionGenerator = require("../modules/potionGenerator")

let onlineUsers = []

module.exports = (server) => {

    const io = new Server(server, {
        cors: {
            origin: "http://localhost:5173"
        }
    })

    io.on("connection", (socket) => {

        socket.on("userConnected", async (username) => {
            const user = await userDb.findOne({username},{password:0, _id:0, tokens:0, experience:0, inventory:0})
            onlineUsers.push({
                id: socket.id,
                user
            })
            io.emit("onlineUsers", onlineUsers)
        })

        socket.on("generate", async (username) => {
            const user = await userDb.findOne({username})
            if (user.tokens > 0) {
                await userDb.findOneAndUpdate({username}, { $inc: {tokens: -1}}, {new: true})
                const userData = await userDb.find({username}, {password: 0})
                const weapons = [weaponGenerator(), armorGenerator(), potionGenerator()]
                io.to(socket.id).emit("weapons", weapons, userData)
            }
        })

        socket.on("takeItem", async (item, username) => {
            await userDb.findOneAndUpdate({username}, { $push: {inventory: item}})
            const userData = await userDb.find({username}, {password: 0})
            io.to(socket.id).emit("inventoryUpdate", userData)
        })

        socket.on("disconnect", () => {
            onlineUsers = onlineUsers.filter(user => user.id !== socket.id)
            io.emit("onlineUsers", onlineUsers)
        })

        socket.on("battleRequest", (sendToSocketId, senderUsername) => {
            io.to(sendToSocketId).emit("receiveBattleRequest", `${senderUsername} wants to battle with you`)
        })
    })
}