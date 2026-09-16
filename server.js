require('dotenv').config();
const express = require('express'),
    {MongoClient, ObjectId} = require('mongodb')
const app = express(),
    defaultPort = 3000

// MongoDB setup
const mongo_uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PWD}@${process.env.MONGO_HOST}`
console.log("Mongo URI: " + mongo_uri)
const client = new MongoClient(mongo_uri)

// Collection of all the melodies that have been submitted
let db_collection = null

/**
 * Connects to the database and initializes `collection`.
 */
async function connect_to_db() {
    await client.connect()
    db_collection = await client.db("mini-melodies-main").collection("melodies")
}

/**
 * Logs the URLs of incoming requests to the console.
 */
const middleware_logger = (request, response, next) => {
    console.log("Request to " + request.url)
    next()
}

/**
 * Checks the connection to the database and return 503 if it failed.
 */
const middleware_db_check = (request, response, next) => {
    if(db_collection !== null) {
        next()
    } else {
        response.status(503).send()
    }
}

/**
 * Returns the entire collection, or a specific item from the collection if one is requested.
 */
const middleware_get_collection = async (request, response) => {
    const collItemID = decodeURI(request.url).slice(1); // Cuts "/" off the front
    if (collItemID.length > 0) {
        // Send the specified item from the collection
        const collItem = await db_collection.findOne(
            { _id: new ObjectId(collItemID)}
        )

        if (collItem) {
            response.json(collItem)
        } else {
            response.writeHead(404, "Not Found")
            response.end('Item Not Found')
        }
    } else {
        // Send the full collection
        const collection = await db_collection.find({}).toArray()
        response.json(collection)
    }
}

/**
 * Submits a new melody to the collection.
 */
const middleware_post = (request, response) => {
    console.log("Received POST request: " + request.url)
    let dataString = ''

    // Read data
    request.on('data', function(data) {
        dataString += data
    })

    // Once finished reading data, submit it to the database
    request.on('end', async function() {
        const dataJson = JSON.parse(dataString)

        // Calculates the "vibes" of the melody (the sum of all the note numbers) on a scale of sleepy (0) to flamin' hot (64)
        let vibes = 0
        dataJson.melody.forEach((note) => {
            vibes += parseInt(note)
        })
        dataJson.vibes = vibes

        // Add the new item
        const result = await db_collection.insertOne(dataJson)
        response.json(result)
    })
}

app.use(middleware_logger)
app.use(middleware_db_check)
app.use(express.static("public"))
app.use("/collection", middleware_get_collection)
app.post("/submit", express.json(), middleware_post)

connect_to_db().then(() =>
    app.listen(process.env.PORT || defaultPort)
)