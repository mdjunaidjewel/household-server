require("dotenv").config();
const path = require("path");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// ---------------- MIDDLEWARES ----------------
app.use(cors());
app.use(express.json());

// ---------------- MONGODB SETUP ----------------
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

    // ---------------- API ROUTES ----------------

    // Basic API check
    app.get("/api", (req, res) => {
      res.send("Server API is Running!!!");
    });

    /** ---------------- SERVICES ---------------- */

    app.get("/services", async (req, res) => {
      try {
        const result = await servicesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching services", error });
      }
    });

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

    app.post("/services", async (req, res) => {
      try {
        const {
          service_name,
          price,
          category,
          description,
          image,
          provider_name,
          email,
          provider_contact,
        } = req.body;

        if (
          !service_name ||
          !price ||
          !category ||
          !description ||
          !image ||
          !provider_name ||
          !email ||
          !provider_contact
        ) {
          return res.status(400).send({ message: "All fields are required!" });
        }

        const newService = {
          service_name,
          category,
          price: "$" + price,
          description,
          image,
          provider_name,
          provider_email: email,
          provider_contact,
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

    app.put("/services/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { service_name, category, price, description } = req.body;

        const updated = await servicesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              service_name,
              category,
              price,
              description,
            },
          }
        );
        res.send(updated);
      } catch (error) {
        res.status(500).send({ message: "Error updating service", error });
      }
    });

    app.delete("/services/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const deleted = await servicesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(deleted);
      } catch (error) {
        res.status(500).send({ message: "Error deleting service", error });
      }
    });

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

    /** ---------------- BOOKINGS ---------------- */

    app.post("/bookings", async (req, res) => {
      try {
        const booking = req.body;
        const result = await bookingsCollection.insertOne(booking);
        res.send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ message: "Error saving booking", error });
      }
    });

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

    // ---------------- SERVE REACT APP ----------------
    const buildPath = path.join(__dirname, "dist");
    app.use(express.static(buildPath));

    // Only catch-all for non-API routes
    app.get(/^\/(?!api|services|bookings).*/, (req, res) => {
      res.sendFile(path.join(buildPath, "index.html"));
    });
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

// ---------------- START SERVER ----------------
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
