const http = require('http'),
    fs   = require('fs'),
    // IMPORTANT: you must run `npm install` in the directory for this assignment
    // to install the mime library if you're testing this on your local machine.
    // On Render, make sure `npm install` is your build command.
    mime = require('mime'),
    dir  = 'public/',
    port = 3000

// Collection of all the melodies that have been submitted
const collection = []

const server = http.createServer(function(request,response) {
    if (request.method === 'GET') {
        handleGet(request, response)
    } else if (request.method === 'POST') {
        handlePost(request, response)
    }
})

const handleGet = function(request, response) {
    console.log("Received GET request: " + request.url);

    if (request.url === '/') {
        sendFile(response, 'public/index.html');
    } else if (request.url.startsWith('/collection')) {
        const collItemTitle = request.url.slice(12); // Cuts "/collection/" off the front
        if (collItemTitle.length > 0) {
            sendCollectionItem(response, collItemTitle);
        } else {
            sendFullCollection(response);
        }
    } else {
        const filename = dir + request.url.slice(1);
        sendFile(response, filename);
    }
}

const handlePost = function(request, response) {
    console.log("Received POST request: " + request.url)
    let dataString = ''

    request.on('data', function(data) {
        dataString += data
    })

    request.on('end', function() {
        let dataJson = JSON.parse(dataString)

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

const sendFile = function(response, filename) {
    const type = mime.getType(filename)

    fs.readFile(filename, function(err, content) {

        // if the error = null, then we've loaded the file successfully
        if (err === null) {

            // status code: https://httpstatuses.com
            response.writeHeader(200, { 'Content-Type': type })
            response.end(content)

        } else {

            // file not found, error code 404
            response.writeHeader(404)
            response.end('404 Error: File Not Found')

        }
    })
}

/**
 * Stringifies and sends the specified item from the collection to the client.
 */
const sendCollectionItem = function (response, title) {
    let item = collection.find((item) => item.title === title)

    if (item) {
        let content = JSON.stringify(item)
        response.writeHead(200, "OK", {"Content-Type": "text/plain"})
        response.end(content)
    } else {
        response.writeHead(404, "Not Found")
        response.end('Item Not Found')
    }
}

/**
 * Stringifies and sends the full collection to the client.
 */
const sendFullCollection = function (response) {
    let content = JSON.stringify(collection)

    response.writeHead(200, "OK", { "Content-Type": "text/plain"})
    response.end(content)
}

server.listen(process.env.PORT || port)
