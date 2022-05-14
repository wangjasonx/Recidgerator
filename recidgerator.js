process.stdin.setEncoding("utf8");
const http = require("http");
const https = require('https');
const path = require("path");
const express = require("express"); /* Accessing express module */
const app = express(); /* app is a request handler function */
const bodyParser = require("body-parser");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') });

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const database = process.env.MONGO_DB_NAME;
const api_key = process.env.FOOD_API_KEY;

/* Our database and collection */
const databaseAndCollection = { db: "CMSC335_DB", collection: "food" };
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${userName}:${password}@cluster0.m72xx.mongodb.net/${database}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const portNumber = process.env.PORT || 3000;

// Express Server Code
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/templates'));

app.get("/", function (request, response) {
    response.render("index");
});

app.get("/addItem", function (request, response) {
    response.render("addItem");
});

app.post("/addItem", async (request, response) => {
    let { food, exp } = request.body;

    let newFood = {
        food: food,
        exp: exp
    }

    try {
        await client.connect();
        await insertApplication(client, databaseAndCollection, newFood);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    response.render("addItem");
});

app.get("/checkFood", async (request, response) => {

    let foods;

    try {
        await client.connect();
        foods = await getFoods(client, databaseAndCollection)
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    let foodTable = "<table border='1'>";
    foodTable += "<tr><th>Foods</th><th>Exp. Date</th></tr>"
    foods.forEach(element => foodTable += `<tr><td>${element.food}</td><td>${element.exp}</td></tr>`);
    foodTable += "</table>";

    let options = ``;

    foods.forEach(element => options += `<option value="${element.food}">${element.food}</option>`);

    let variables = {
        foodTable: foodTable,
        selectFoods: options
    }

    response.render("checkFood", variables);
});

app.post("/postFood", function (request, response) {
    let {foodsSelected} = request.body;

    let path = 'https://api.spoonacular.com';
    path += '/recipes/findByIngredients?ingredients='
    path += foodsSelected;
    path += `&apiKey=${api_key}`;

    console.log(path);

    https.get(path,(res) => {
        let body = "";
        var recipeTable = "<table border='1'>";
        recipeTable += "<tr><th>Recipes</th></tr>"

        res.on("data", (chunk) => {
            body += chunk;
        });
    
        res.on("end", () => {
            try {
                let json = JSON.parse(body);
                json.forEach(element => recipeTable += `<tr><td>${element.title}</td></tr>`);
                recipeTable += "</table>";

                let variables = {
                    recipes: recipeTable
                }
            
                response.render("postFood", variables);
            } catch (error) {
                console.error(error.message);
            };
        });
    
    }).on("error", (error) => {
        console.error(error.message);
    });
});

console.log(`Web server is running at http://localhost:${portNumber}`);
http.createServer(app).listen(portNumber);

process.stdout.write("Stop to shutdown the server: ");

process.stdin.on('readable', function () {
    let dataInput;
    while (dataInput = process.stdin.read()) {
        let command = dataInput.trim();
        if (command === "stop") {
            console.log("Shutting down the server");
            process.exit(0);
        } else {
            console.log(`Invalid command: ${command}`);
            process.stdout.write("Type stop to shutdown the server: ");
        }
    }
});

async function getFoods(client, databaseAndCollection) {
    let filter = {};
    const cursor = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).find(filter);
    const result = await cursor.toArray();
    return result;
}

async function insertApplication(client, databaseAndCollection, newApplicant) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newApplicant);
    console.log(`Applicant entry created with id ${result.insertedId}`);
};