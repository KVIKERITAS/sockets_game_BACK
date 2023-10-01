const express = require("express")
const router = express.Router()

const {
    validateUser,
} = require("../middleware/validators")

const {
    createUser,
    loginUser,
    getCharacters
} = require("../controllers/usersController")

router.post("/register", validateUser, createUser)
router.post("/login", loginUser)

router.get("/characters", getCharacters)

module.exports = router
