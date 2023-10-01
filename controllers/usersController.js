const bcrypt = require("bcrypt")
const userDb = require("../schemas/userSchema")
const characters = require("../modules/characters")

function resSend(res, error, data, message) {
    res.send({error, data, message})
}

module.exports = {
    createUser: async (req, res) => {
        const {username, password, character} = req.body

        const hash = await bcrypt.hash(password, 10)

        const user = new userDb({
            username,
            password: hash,
            character,
        })

        await user.save()

        resSend(res, false, null, "Created")
    },
    loginUser: async (req, res) => {
        const {username, password} = req.body

        const foundUser = await userDb.findOne({username})

        if (!foundUser) return resSend(res, true, null, "Username not found")

        const passwordMatch = await bcrypt.compare(password, foundUser.password)

        if (!passwordMatch) return resSend(res, true, null, "Wrong password")

        const userData = await userDb.find({username}, {password: 0})

        resSend(res, false, userData, "Correct")

    },
    getCharacters: (req, res) => {
        resSend(res, false, characters, "")
    }
}