// Frequencies of the C major scale using just intonation with C as the fundamental
const frequencies = {
    "0": 0, // 0 means a rest
    "1": 261.62,
    "2": 294.32,
    "3": 327.02,
    "4": 348.83,
    "5": 392.43,
    "6": 436.03,
    "7": 490.54,
    "8": 523.24
}

// List of notes to play
let melody = []

// Info about the current user
let loggedIn = false,
    userID = null,
    username = null;

/**
 * Plays the specified note for 1 eighth note (0.25 seconds).
 * @param note Integer representing the note to play
 * @param callback Function to call once the note has finished playing
 */
function playNote(note, callback) {
    const audioContext = new AudioContext();
    const oscNode = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscNode.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscNode.frequency.value = frequencies[note];
    oscNode.type = 'triangle'
    oscNode.onended = callback // Used to play the next notes in the melody once this one's done

    // Make a nice envelope for each note to prevent popping at the end of notes
    gainNode.gain.value = 0
    gainNode.gain.linearRampToValueAtTime(0.3, 0.01)
    gainNode.gain.linearRampToValueAtTime(0, 0.25)

    oscNode.start()
    oscNode.stop(0.25)
}

/**
 * Plays all notes currently in the melody.
 */
function playMelody() {
    if (melody.length > 0) {
        document.getElementById("play").disabled = true
        for (let noteInput of document.getElementsByClassName('note-input')) {
            noteInput.disabled = true;
        }
        for (let loadButton of document.getElementsByClassName('coll-item-load')) {
            loadButton.disabled = true;
        }

        let note = melody.shift()
        playNote(note, playMelody)
    } else {
        document.getElementById("play").disabled = false
        for (let noteInput of document.getElementsByClassName('note-input')) {
            noteInput.disabled = false;
        }
        for (let loadButton of document.getElementsByClassName('coll-item-load')) {
            loadButton.disabled = false;
        }
    }
}

/**
 * Populates the melody with the form values.
 */
function makeMelody() {
    melody.length = 0 // Clear the melody
    for (let i = 0; i < 8; i++) {
        melody[i] = document.getElementById("note-input-" + i).value
    }
}

/**
 * Gets the specified melody from the server and loads it into the input fields.
 */
async function loadMelody(title) {
    const response = await fetch(`/collection/${title}`, {
        method: "GET"
    })
    const collItem = JSON.parse(await response.text())

    document.getElementById("title-input").value = collItem.title
    document.getElementById("composer-input").value = collItem.composer
    for (let i = 0; i < 8; i++) {
        document.getElementById("note-input-" + i).value = collItem.melody[i]
    }

    // Enable editing and submitting if the melody is the current user's, disable if it's someone else's
    if (collItem.composer === username) {
        for (let noteInput of document.getElementsByClassName('note-input')) {
            noteInput.disabled = false;
        }
        document.getElementById("title-input").disabled = false;
        document.getElementById("submit").disabled = false;
    } else {
        for (let noteInput of document.getElementsByClassName('note-input')) {
            noteInput.disabled = true;
        }
        document.getElementById("title-input").disabled = true;
        document.getElementById("submit").disabled = true;
    }

    makeMelody()
    playMelody()
}

/**
 * Called when the play button is pressed.
 */
function playButton(event) {
    event.preventDefault()
    makeMelody()
    playMelody()
}

/**
 * Called when the submit button is pressed.
 */
async function submitButton(event) {
    // stop form submission from trying to load
    // a new .html page for displaying results...
    // this was the original browser behavior and still
    // remains to this day
    event.preventDefault()

    makeMelody();
    const titleInput = document.getElementById("title-input"),
        composerInput = document.getElementById("composer-input");
    const json = {
        title: titleInput.value,
        composer: composerInput.value,
        melody: melody
    }
    const body = JSON.stringify(json)
    console.log("Body: " + body)

    const response = await fetch('/submit', {
        method:'POST',
        body: body
    })

    const text = await response.text()
    console.log('Response from server:', text)

    makeCollection()
}

function clearButton() {
    for (let noteInput of document.getElementsByClassName('note-input')) {
        noteInput.disabled = false;
        noteInput.value = 0;
    }
    document.getElementById("title-input").value = '';
    document.getElementById("title-input").disabled = false;
    document.getElementById("composer-input").value = loggedIn ? username : "log in to submit";
    if (loggedIn) {
        document.getElementById("submit").disabled = false;
    }
}

/**
 * Returns the corresponding adjective for a given vibes value, on a scale of sleepy to flamin' hot.
 */
function getVibesAdjective(vibes) {
    // |0| sleepy |4| chill |16| fresh |36| groovy |56| flamin' hot |64|
    if (vibes <= 4) {
        return "sleepy"
    } else if (vibes <= 16) {
        return "chill"
    } else if (vibes <= 36) {
        return "fresh"
    } else if (vibes <= 56) {
        return "groovy"
    } else {
        return "flamin' hot"
    }
}

/**
 * Retrieves the collection from the server and fills in the webpage with collection items.
 */
async function makeCollection() {
    // Gets the collection, either every item or just items composed by the current user
    const showUserCollection = document.getElementById("show-user-collection").checked;
    let collection = null
    if (showUserCollection) {
        const response = await fetch(`/user-collection/${username}`, {
            method: "GET"
        })
        collection = JSON.parse(await response.text())
    } else {
        const response = await fetch('/collection', {
            method: "GET"
        })
        collection = JSON.parse(await response.text())
    }

    // Puts the collection onto the page
    const collectionDiv = document.getElementById("collection")
    if (collection.length > 0) {
        collectionDiv.innerHTML = "" // Clear the div before repopulating it to avoid duplicates
        collection.reverse().forEach((collItem) => {
            // Calculate fields as strings
            let id = collItem._id.toString()
            let title = collItem.title
            let composer = collItem.composer
            let melody = ""
            collItem.melody.forEach((note) => {
                melody += (note + " ")
            })
            let vibes = collItem.vibes
            let vibesAdjective = getVibesAdjective(vibes)

            // Generate HTML element and add it to the page
            let collItemDiv = document.createElement("div")
            collItemDiv.className = "coll-item"
            collItemDiv.innerHTML =
                `<div class="coll-item-info">
                <p class="coll-item-description">${title} - by ${composer}</p>
                <p class="coll-item-melody">${melody}</p>
                <p class="coll-item-vibes">vibes: ${vibesAdjective} (${vibes})</p>
            </div>
            <button class="coll-item-load" onclick="loadMelody('${id}')">load</button>`
            collectionDiv.appendChild(collItemDiv)
        })
    } else {
        collectionDiv.innerHTML = "<p>nothing here yet...</p>"
    }
}

/**
 * Populates variables about the logged-in user (`loggedIn`, `userID`, and `username`).
 */
async function getCurrentUser() {
    const response = await fetch('/current-user', {
        method: "GET"
    })
    const current_user = JSON.parse(await response.text())

    loggedIn = current_user.loggedIn;
    userID = current_user.userID;
    username = current_user.username;
}

window.onload = function() {
    // Updates the page based on the logged-in user
    getCurrentUser().then(() => {
        if (loggedIn) {
            document.getElementById("logged-in-status").innerText = `logged in as ${username}`
            document.getElementById("logout").style = "visibility: visible";
            document.getElementById("composer-input").value = username;
        } else {
            document.getElementById("create-account").style = "visibility: visible";
            document.getElementById("login").style = "visibility: visible";
            document.getElementById("composer-input").value = "log in to submit"
            document.getElementById("submit").disabled = true;
            document.getElementById("show-user-collection").disabled = true;
        }
        makeCollection()
    })

    // Set button actions
    document.getElementById("play").onclick = playButton
    document.getElementById("submit").onclick = submitButton
    document.getElementById("clear").onclick = clearButton
    document.getElementById("show-user-collection").onclick = makeCollection

    // Generate the melody input fields
    let melodyInput = document.getElementById("melody")
    for (let i = 0; i < 8; i++) {
        let noteInput = document.createElement("input");
        noteInput.id = "note-input-" + i;
        noteInput.className = "note-input"
        noteInput.ariaLabel = "note " + i;
        noteInput.type = "number"
        noteInput.min = "0";
        noteInput.max = "8";
        noteInput.value = "0";
        noteInput.onchange = function() {
            playNote(noteInput.value)
        }
        melodyInput.appendChild(noteInput);
    }
}
