require('dotenv').config();
const express = require('express'),
    {MongoClient, ObjectId} = require('mongodb'),
    cookie = require('cookie-session')
const app = express(),
    defaultPort = 3000

// MongoDB setup
const mongo_uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PWD}@${process.env.MONGO_HOST}`
console.log("Mongo URI: " + mongo_uri)
const client = new MongoClient(mongo_uri)

// Database collections of melodies and users
let melody_collection = null
let user_collection = null

/**
 * Connects to the database and initializes `collection`.
 */
async function connect_to_db() {
    await client.connect()
    melody_collection = await client.db("mini-melodies-main").collection("melodies")
    user_collection = await client.db("mini-melodies-main").collection("users")
}


// ================ General-purpose middleware ================
/**
 * Logs the URLs of incoming requests to the console.
 */
const middleware_logger = (request, response, next) => {
    console.log(request.method + " request to " + request.url)
    next()
}

/**
 * Checks the connection to the database and return 503 if it failed.
 */
const middleware_db_check = (request, response, next) => {
    if (melody_collection !== null && user_collection !== null) {
        next()
    } else {
        response.status(503).send()
    }
}

// ================ Middleware to access the melody collection ================

/**
 * Returns the entire collection, or a specific item from the collection if one is requested.
 */
const middleware_get_collection = async (request, response) => {
    const collItemID = decodeURI(request.url).slice(1); // Cuts "/" off the front
    if (collItemID.length > 0) {
        // Send the specified item from the collection
        const collItem = await melody_collection.findOne(
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
        const collection = await melody_collection.find({}).toArray()
        response.json(collection)
    }
}

/**
 * Returns every collection item that was composed by the given user.
 */
const middleware_get_user_collection = async (request, response) => {
    const username = decodeURI(request.url).slice(1); // Cuts "/" off the front

    const collection = await melody_collection.find({composer: username}).toArray()
    response.json(collection)
}
/**
 * Submits a new melody to the collection.
 */
const middleware_post_melody = (request, response) => {
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

        // Check for duplicates and remove them
        await melody_collection.deleteOne({
            title: dataJson.title,
            composer: dataJson.composer
        })

        // Add the new item
        const result = await melody_collection.insertOne(dataJson)
        response.json(result)
    })
}

// ================ Middleware to access the user collection ================

/**
 * Retrieves the user with the given ID or username, or returns 404 if the user doesn't exist.
 */
const middleware_get_user = async (request, response) => {
    const url = decodeURI(request.url);
    let user = null;

    if (url.startsWith("/id/")) {
        // Find the user by ID
        const userID = url.slice(4)
        user = await user_collection.findOne(
            {_id: new ObjectId(userID)}
        )
    } else if (url.startsWith("/username/")) {
        // Find the user by username
        const username = url.slice(10)
        user = await user_collection.findOne(
            {username: username}
        )
    }

    if (user) {
        response.json(user)
    } else {
        response.writeHead(404, "Not Found")
        response.end('Item Not Found')
    }
}

/**
 * Attempts to log a user in by verifying the submitted credentials.
 */
const middleware_validate_user = async (request, response) => {
    const user = await user_collection.findOne(
        {username: request.body.username},
    )

    if (user !== null && request.body.password === user.password) {
        request.session.loggedIn = true
        request.session.userID = user._id
        request.session.username = user.username
        response.redirect("/")
    } else {
        response.sendFile(__dirname + "/public/login.html")
    }
}

/**
 * Adds a new user to the database.
 */
const middleware_post_user = async (request, response) => {
    // Check if user already exists
    const user = await user_collection.findOne(
        {username: request.body.username},
    );

    if (user === null) {
        // Make new user
        const newUser = {
            username: request.body.username,
            password: request.body.password
        };
        await user_collection.insertOne(newUser);

        request.session.loggedIn = true;
        request.session.userID = await user_collection.findOne(
            {username: newUser.username}
        )._id;
        request.session.username = newUser.username;
        response.redirect("/");
    } else {
        response.sendFile(__dirname + "/public/create_account.html")
    }
}

/**
 * Returns JSON containing the ID and username of the user who's currently logged in.
 */
const middleware_get_current_user = function (request, response) {
    response.json({
        loggedIn: request.session.loggedIn,
        userID: request.session.userID,
        username: request.session.username
    })
}

// ================ Middleware for login/logout pages ================

const middleware_login_page = (request, response) => {
    response.sendFile(__dirname + "/public/login.html");
}

const middleware_create_account_page = (request, response) => {
    response.sendFile(__dirname + "/public/create_account.html");
}

const middleware_logout = (request, response) => {
    request.session.loggedIn = false;
    request.session.userID = null;
    request.session.username = null;
    response.redirect("/");
}

// ================ Set up and run the app ================

app.use(middleware_logger)
app.use(middleware_db_check)
app.use(cookie({
    name: "session",
    keys: [process.env.SESSION_KEY_1, process.env.SESSION_KEY_2]
}))

app.use(express.static("public"))

app.use("/collection", middleware_get_collection)
app.use("/user-collection", middleware_get_user_collection)
app.post("/submit", express.json(), middleware_post_melody)

app.use("/user", middleware_get_user)
app.use("/current-user", middleware_get_current_user)

app.use("/login", middleware_login_page)
app.post("/login-submit", express.urlencoded({extended: true}), middleware_validate_user)

app.use("/create-account", middleware_create_account_page)
app.post("/create-account-submit", express.urlencoded({extended: true}), middleware_post_user)

app.use("/logout", middleware_logout)


connect_to_db().then(() =>
    app.listen(process.env.PORT || defaultPort)
)