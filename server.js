const express = require("express")
const app = express()
const usersRouter = require("./routes/usersRouter")
const mongoose = require("mongoose")
const cors = require("cors")
const {createServer} = require("node:http")
require("dotenv").config()

const server = createServer(app)
require("./modules/sockets")(server)

mongoose.connect(process.env.DB_TOKEN)
    .then(() => {
        console.log("CONNECTION SUCCESS")
    }).catch(e => {
    console.log("ERROR", e)
})


app.use(cors())
app.use(express.json())
app.use("/users", usersRouter)

const port = 8000

server.listen(port)