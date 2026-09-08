const express = require('express')
const app = express(),
    defaultPort = 3000

// Collection of all the melodies that have been submitted
const collection = []

/**
 * Logs the URLs of incoming requests to the console.
 */
const middleware_logger = (request, response, next) => {
    console.log("Request to " + request.url)
    next()
}

/**
 * Returns the entire collection, or a specific item from the collection if one is requested.
 */
const middleware_get_collection = (request, response) => {
    const collItemTitle = decodeURI(request.url).slice(1); // Cuts "/" off the front
    if (collItemTitle.length > 0) {
        // Send the specified item from the collection
        let item = collection.find((item) => item.title === collItemTitle)

        if (item) {
            response.writeHead(200, "OK", {"Content-Type": "text/plain"})
            response.end(JSON.stringify(item))
        } else {
            response.writeHead(404, "Not Found")
            response.end('Item Not Found')
        }
    } else {
        // Send the full collection
        response.writeHead(200, "OK", { "Content-Type": "text/plain"})
        response.end(JSON.stringify(collection))
    }
}

const middleware_post = (request, response) => {
    console.log("Received POST request: " + request.url)
    let dataString = ''

    request.on('data', function(data) {
        dataString += data
    })

    request.on('end', function() {
        const dataJson = JSON.parse(dataString)

        // Calculates the "vibes" of the melody (the sum of all the note numbers) on a scale of sleepy (0) to flamin' hot (64)
        let vibes = 0
        dataJson.melody.forEach((note) => {
            vibes += parseInt(note)
        })
        dataJson.vibes = vibes

        // Check for any items with duplicate names and get rid of them
        let duplicate = collection.findIndex((item) => item.title === dataJson.title)
        if (duplicate !== -1) {
            collection.splice(duplicate, 1)
        }

        // Add the new item
        collection.push(dataJson)

        response.writeHead(200, "OK", {'Content-Type': 'text/plain' })
        response.end("Received melody \"" + dataJson.title + "\" by " + dataJson.composer)
    })
}

app.use(middleware_logger)
app.use(express.static("public"))
app.use("/collection", middleware_get_collection)
app.post("/submit", express.json(), middleware_post)

app.listen(process.env.PORT || defaultPort)