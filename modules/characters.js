const ShortUniqueId = require("short-unique-id");
const { randomUUID } = new ShortUniqueId({ length: 10 });

module.exports = [
    {
        id: randomUUID(),
        image: "https://i.ibb.co/gzDJQPQ/Character1-face1.png",
        bigImage: "https://i.ibb.co/c2yT8Y4/Character1-face1.png"
    },
    {
        id: randomUUID(),
        image: "https://i.ibb.co/0sjXMBc/Character2-face1.png",
        bigImage: "https://i.ibb.co/80VcQk5/Character2-face1.png"
    },
    {
        id: randomUUID(),
        image: "https://i.ibb.co/16vzdDB/Character3-face1.png",
        bigImage: "https://i.ibb.co/D9k56LH/Character3-face1.png"
    },
    {
        id: randomUUID(),
        image: "https://i.ibb.co/8cs3NP3/Character4-face1.png",
        bigImage: "https://i.ibb.co/0KWV6y8/Character4-face1.png"
    },
    {
        id: randomUUID(),
        image: "https://i.ibb.co/CbbzRJF/Character5-face1.png",
        bigImage: "https://i.ibb.co/2tFVmhg/Character5-face1.png"
    },
    {
        id: randomUUID(),
        image: "https://i.ibb.co/VDGH3z4/Character6-face1.png",
        bigImage: "https://i.ibb.co/C8YFBpm/Character6-face1.png"
    },
    {
        id: randomUUID(),
        image: "https://i.ibb.co/9cF4NLx/Character7-face1.png",
        bigImage: "https://i.ibb.co/CmkFpMV/Character7-face1.png"
    },
    {
        id: randomUUID(),
        image: "https://i.ibb.co/NFFv93b/Character8-face1.png",
        bigImage: "https://i.ibb.co/dWLrb2Z/Character8-face1.png"
    },
]