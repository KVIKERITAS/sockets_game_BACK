const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    character: {
        type: {},
        required: true
    },
    experience: {
        type: Number,
        required: false,
        default: 0
    },
    tokens: {
        type: Number,
        required: false,
        default: 99
    },
    inventory: {
        type: [],
        required: false,
        default: [{
            category: "WEAPON",
            name: "Silverthorn",
            image: "https://i.ibb.co/hm7WbkK/daggers-1.png",
            minDamage: 1,
            maxDamage: 5,
            grade: "D",
            slots: 0,
            effects: []
        }]
    }
});

const user = mongoose.model("type16_users", userSchema);

module.exports = user;