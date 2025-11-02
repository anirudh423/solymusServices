const { MongoClient } = require('mongodb');
const { Server } = require('socket.io');
var express = require('express');
const cors = require('cors');
var http = require('http')

const url = 'mongodb://localhost:27017/'; 

const client = new MongoClient(url);
var app = express();    
app.use(express.json());

app.use(cors(
{
    origin: 'http://localhost:3000'
}));
const server = http.createServer(app);
const io = new Server(server);




async function dbConnect(dbName, tableName) {
    console.log("MongoDb connected")
    let result = await client.connect();
    let db = result.db(dbName)
    console.log("MongoDb connected", dbName, tableName)
    return db.collection(tableName)
}

async function dbClose() {
    await client.close()
}



module.exports = { dbConnect, dbClose };
