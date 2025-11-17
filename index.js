require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // MongoDB DB & Collection
    const servicesDB = client.db("servicesDB");
    const servicesCollection = servicesDB.collection("services");

    // Test the connection
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");

    // GET All Services
    app.get("/services", async (req, res) => {
      try {
        const result = await servicesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching services", error });
      }
    });
  } catch (err) {
    console.error(err);
  }
}
run().catch(console.dir);

// Default Route
app.get("/", (req, res) => {
  res.send("Server is Running!!!");
});

// Start server
app.listen(port, () => {
  console.log(`Household server is running on port: ${port}`);
});
