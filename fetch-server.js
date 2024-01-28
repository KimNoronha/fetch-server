const express = require("express");
const cors = require("cors");

const path = require("path");

let propertiesReader = require("properties-reader");
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);


let dbPprefix = properties.get("db.prefix");
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd"));
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");
const uri = dbPprefix + dbUsername + ":" + dbPwd + dbUrl + dbParams;




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const client = new MongoClient(uri, {
    serverApi: ServerApiVersion.v1
});

const morgan = require('morgan');

client.connect()
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
    });




let db = client.db(dbName);
let app = express();
app.set('json spaces', 3);

app.use(cors());
app.use(morgan("short"));
app.use(express.json());


app.param('collectionName', function (req, res, next, collectionName) {
    req.collection = db.collection(collectionName);
    return next();
});

// Serve static files from 'images' directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// Middleware to handle requests for non-existent images
app.use('/images', (req, res) => {
    res.status(404).send('Image not found');
  });

  
app.get("/", function (req, res, next) {
    res.send("Select a collection");
});

app.get("/collections/:collectionName", function (req, res, next) {
    req.collection.find({}).toArray(function (err, results) {
        if (err) {
            return next(err);
        }
        res.send(results);

    });

});




app.get('/collections/:collectionName/:id', function (req, res, next) {
    req.collection.findOne({ _id: new ObjectId(req.params.id) }, function (err, results) {
        if (err) {
            return next(err);
        }
        res.send(results);
    });
});

app.post('/collections/:collectionName'
    , function (req, res, next) {

        req.collection.insertOne(req.body, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send(results);
        });
    });

    // app.put('/collections/products/:id', function (req, res, next) {
    //     const lessonId = req.params.id;
    //     const expectedSpaces = req.body.spaces;
    //     const newSpaces = expectedSpaces - 1;
    
    
    //     db.collection('products').findOneAndUpdate(
    //         { _id: new ObjectId(lessonId), spaces: expectedSpaces },
    //         { $set: { spaces: newSpaces } },
    //         { returnDocument: 'after' } 
    //     )
    //     .then(updatedLesson => {
    //         if (updatedLesson) {
    //             console.log(`Spaces updated for lesson with id ${lessonId}: `, updatedLesson);
    //             res.json({ success: true });
    //         } else {
    //             console.error(`Spaces update failed for lesson with id ${lessonId}. Lesson not found or concurrency issue.`);
    //             res.status(400).json({ success: false, error: "Spaces update failed. Lesson not found or concurrency issue." });
    //         }
    //     })
    //     .catch(error => {
    //         console.error(`Error updating spaces for lesson with id ${lessonId}: `, error);
    //         res.status(500).json({ success: false, error: error.message });
    //     });
    // });


app.delete('/collections/:collectionName/:id'
    , function (req, res, next) {
        req.collection.deleteOne(
            { _id: new ObjectId(req.params.id) }, function (err, result) {
                if (err) {
                    return next(err);
                } else {
                    res.send((result.deletedCount === 1) ? { msg: "success" } : { msg: "error" });
                }
            }
        );
    });

app.put('/collections/:collectionName/:id'
    , function (req, res, next) {

        req.collection.updateOne({ _id: new ObjectId(req.params.id) },
            { $set: req.body },
            { safe: true, multi: false }, function (err, result) {
                if (err) {
                    return next(err);
                } else {
                    res.send((result.matchedCount === 1) ? { msg: "success" } : { msg: "error" });
                }
            }
        );
    });

app.post('/collections/orders', function (req, res, next) {
    req.collection.insertOne(req.body, function (err, result) {
        if (err) {
            return next(err);

        }
        res.send(result);
    });
});

app.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.term;
        console.log("Search Term:", searchTerm);
        const lessonsCollection = client.db(dbName).collection("products");
        console.log("Database Collection:", lessonsCollection.collectionName); // Add this log statement

        // Using regex for search
        const query = {
            $or: [
                { title: new RegExp(searchTerm, 'i') },
                { location: new RegExp(searchTerm, 'i') }
            ]
        };
        
       // 'i' for case-insensitive
        const searchResult = await lessonsCollection.find(query).toArray();

        res.json(searchResult);
    } catch (error) {
        console.error("Error during search:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.use(function (req, res) {
    res.status(404).send("Resource not found");
})


const port = process.env.PORT || 5502;
app.listen(port, function () {
    console.log("App started on port " + port);
})


