mini (but persistent) melodies - Assignment 3
===

### Lex Johnson

[https://a3-lexjohnson.onrender.com/](https://a3-lexjohnson.onrender.com/)

In this assignment, I brought several much-needed upgrades to my
"mini melodies" web app. I revamped the server to use Express, and
I implemented a persistent database using MongoDB so that all the
melodies aren't lost whenever Render decides to spin down. I also
used the Simple.css framework to make the front end of the site look
a little nicer. I opted for this framework because I intentionally
designed the UI to be very simplistic, so a more advanced framework
(e.g. Bootstrap) wouldn't have matched my vision. That being said, I
did have to write a bunch of CSS to design elements that Simple.css
doesn't cover, like the melody maker and the individual collection
items.

The most notable change I made was building an account system. Users
can create and log into accounts in order to link themselves to their
melodic creations. All users can load and listen to any melody in the
collection, but only the creator of a melody will have the ability to
edit and resubmit it. There's also an option to filter the collection
to only show melodies you've created, making it easier to find your
own work. I opted to do authentication with just a username/password
combo (with no hashing or anything), mostly because it was the only
option I could achieve with the time I had.

## Technical Achievements
- **Lighthouse Test**: This webpage gets 100% in all four categories on the Google Lighthouse test. To verify this, make sure to run the test in an incognito window; I've found that some browser extensions add additional code that fails the tests.
- **Web Audio API**: To play the melodies, I learned how to use the Web Audio API to build a simple synthesizer. I learned about connecting audio nodes to form a pipeline from an oscillator to the output, and I automated a gain node to make a nice-sounding envelope for each note. (I technically did the work for this in assignment 2, but since I didn't count it as a technical achievement before, I figured it's worth mentioning now.)