const userDb = require("../schemas/userSchema")

function resSend (res, error, data, message) {
    res.send({error, data, message})
}

module.exports = {
    validateUser: async (req, res, next) => {
        const {username, password, character} = req.body

        const foundUser = await userDb.findOne({username})

        if (foundUser) return resSend(res, true, null, "Username already exists")

        next()
    }
}