require("dotenv").config();
const path = require("path");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

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
    const servicesDB = client.db("servicesDB");
    const servicesCollection = servicesDB.collection("services");
    const bookingsCollection = servicesDB.collection("bookings");

    console.log("Successfully connected to MongoDB!");

    /** ---------------- SERVICES ROUTES ---------------- */

    // Get all services
    app.get("/services", async (req, res) => {
      try {
        const result = await servicesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching services", error });
      }
    });

    // Get top 6 services by rating
    app.get("/services/top", async (req, res) => {
      try {
        const topServices = await servicesCollection
          .find()
          .sort({ rating: -1 })
          .limit(6)
          .toArray();
        res.send(topServices);
      } catch (error) {
        res.status(500).send({ message: "Error fetching top services", error });
      }
    });

    // Get service by id
    app.get("/services/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const service = await servicesCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!service)
          return res.status(404).send({ message: "Service not found" });
        res.send(service);
      } catch (error) {
        res.status(500).send({ message: "Error fetching service", error });
      }
    });

    // Add service
    app.post("/services", async (req, res) => {
      try {
        const {
          service_name,
          price,
          description,
          image,
          provider_name,
          email,
          provider_contact,
          duration,
        } = req.body;

        if (
          !service_name ||
          !price ||
          !description ||
          !image ||
          !provider_name ||
          !email ||
          !provider_contact ||
          !duration
        ) {
          return res.status(400).send({ message: "All fields are required!" });
        }

        const newService = {
          service_name,
          price: "$" + price,
          description,
          image,
          provider_name,
          provider_email: email,
          provider_contact,
          duration,
          createdAt: new Date(),
          rating: 0,
        };

        const result = await servicesCollection.insertOne(newService);
        res.status(201).send({
          message: "Service added successfully!",
          serviceId: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({ message: "Failed to add service", error });
      }
    });

    // Get services by provider email
    app.get("/my-services/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const services = await servicesCollection
          .find({ provider_email: email })
          .toArray();
        res.send(services);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Error fetching your services", error });
      }
    });

    // Update service rating
    app.patch("/services/:id/rating", async (req, res) => {
      try {
        const id = req.params.id;
        const { rating } = req.body;
        const result = await servicesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { rating: rating } }
        );
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Error updating service rating", error });
      }
    });

    /** ---------------- BOOKINGS ROUTES ---------------- */

    // Add booking
    app.post("/bookings", async (req, res) => {
      try {
        const booking = req.body;
        const result = await bookingsCollection.insertOne(booking);
        res.send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ message: "Error saving booking", error });
      }
    });

    // Get bookings (optional by userEmail)
    app.get("/bookings", async (req, res) => {
      try {
        const email = req.query.email;
        const query = email ? { userEmail: email } : {};
        const bookings = await bookingsCollection.find(query).toArray();
        res.send(bookings);
      } catch (error) {
        res.status(500).send({ message: "Error fetching bookings", error });
      }
    });

    // Delete booking
    app.delete("/bookings/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await bookingsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error deleting booking", error });
      }
    });

    // Rate booking
    app.patch("/bookings/:id/rate", async (req, res) => {
      try {
        const id = req.params.id;
        const { rating } = req.body;
        const result = await bookingsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { rating: rating } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error rating booking", error });
      }
    });

    /** ---------------- SERVE REACT APP ---------------- */
    const buildPath = path.join(__dirname, "dist");
    app.use(express.static(buildPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(buildPath, "index.html"));
    });
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

app.get("/api", (req, res) => {
  res.send("Server API is Running!!!");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
