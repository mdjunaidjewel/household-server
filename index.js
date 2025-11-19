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

    // MongoDB DB & Collections
    const servicesDB = client.db("servicesDB");
    const servicesCollection = servicesDB.collection("services");
    const bookingsCollection = servicesDB.collection("bookings");

    // Test connection
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");

    /** ---------------- SERVICES ROUTES ---------------- */

    // GET All Services
    app.get("/services", async (req, res) => {
      try {
        const result = await servicesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching services", error });
      }
    });

    // GET → Top 6 services by rating
    app.get("/services/top", async (req, res) => {
      try {
        const topServices = await servicesCollection
          .find() // সব service খুঁজবে
          .sort({ rating: -1 }) // rating descending
          .limit(6) // সর্বোচ্চ 6
          .toArray();

        res.send(topServices);
      } catch (error) {
        res.status(500).send({
          message: "Error fetching top rated services",
          error,
        });
      }
    });

    // GET Single Service by ID
    app.get("/services/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await servicesCollection.findOne(query);

        if (!result)
          return res.status(404).send({ message: "Service not found" });

        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Error fetching single service", error });
      }
    });

    // POST → Add New Service
    app.post("/services", async (req, res) => {
      try {
        const {
          service_name,
          category,
          price,
          description,
          image,
          provider_name,
          email,
        } = req.body;

        if (
          !service_name ||
          !category ||
          !price ||
          !description ||
          !image ||
          !provider_name ||
          !email
        ) {
          return res.status(400).send({ message: "All fields are required!" });
        }

        const newService = {
          service_name,
          category,
          price,
          description,
          image,
          provider_name,
          provider_email: email,
          createdAt: new Date(),
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

    // GET → My Services by provider email
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

    // PUT → Update service by ID
    app.put("/services/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;

        const result = await servicesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update service", error });
      }
    });

    // DELETE → Delete service by ID
    app.delete("/services/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await servicesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete service", error });
      }
    });

    /** ---------------- BOOKINGS ROUTES ---------------- */

    // POST → Add booking
    app.post("/bookings", async (req, res) => {
      try {
        const booking = req.body;

        const result = await bookingsCollection.insertOne(booking);
        res.send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ message: "Error saving booking", error });
      }
    });

    // GET → My Bookings by user email
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

    // DELETE → Delete a booking by ID
    app.delete("/bookings/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await bookingsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete booking", error });
      }
    });

    /** ---------------- SERVE REACT APP ---------------- */
    const buildPath = path.join(__dirname, "dist");
    app.use(express.static(buildPath));

    // Catch-all route to serve React index.html
    app.get("*", (req, res) => {
      res.sendFile(path.join(buildPath, "index.html"));
    });
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

// Default Route (optional, for API check)
app.get("/api", (req, res) => {
  res.send("Server API is Running!!!");
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
