/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// const {setGlobalOptions} = require("firebase-functions");
// const {onRequest} = require("firebase-functions/https");
// const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
// setGlobalOptions({ maxInstances: 10 });

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Test Firestore read
exports.getCenters = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  try {
    const snapshot = await admin.firestore().collection("centers").get();
    const centers = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    res.status(200).json(centers);
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

// Create reservation
exports.createReservation = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const {centerId, date, hour, status, userId} = req.body;

    if (!centerId || !date || !hour || !userId) {
      res.status(400).json({success: false, error: "Missing required fields"});
      return;
    }

    // Helper function to check if two hours overlap (including adjacent hours)
    const hoursOverlap = (hour1, hour2) => {
      const h1 = parseInt(hour1.split(":")[0]);
      const h2 = parseInt(hour2.split(":")[0]);
      // Check if hours are the same or adjacent (overlap by at least 1 hour)
      return Math.abs(h1 - h2) <= 1;
    };

    // Check if user already has a reservation on the same date that overlaps
    const userReservationsOnDate = await admin.firestore()
        .collection("reservations")
        .where("userId", "==", userId)
        .where("date", "==", date)
        .where("status", "in", ["pending", "confirmed"])
        .get();

    if (!userReservationsOnDate.empty) {
      // Check for overlapping hours
      for (const doc of userReservationsOnDate.docs) {
        const existingReservation = doc.data();
        if (hoursOverlap(existingReservation.hour, hour)) {
          const existingHour = existingReservation.hour;
          res.status(400).json({
            success: false,
            error: `You already have a reservation at ${existingHour} ` +
              `on this date. Reservations cannot overlap or be adjacent.`,
          });
          return;
        }
      }
    }

    // Check if this specific time slot is already reserved by someone else
    const existingReservations = await admin.firestore()
        .collection("reservations")
        .where("centerId", "==", String(centerId))
        .where("date", "==", date)
        .where("hour", "==", hour)
        .where("status", "in", ["pending", "confirmed"])
        .get();

    if (!existingReservations.empty) {
      res.status(400).json({
        success: false,
        error: "This time slot is already reserved",
      });
      return;
    }

    // Create reservation
    const reservationData = {
      centerId: String(centerId),
      date: date,
      hour: hour,
      status: status || "pending",
      userId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await admin.firestore()
        .collection("reservations")
        .add(reservationData);

    res.status(200).json({
      success: true,
      id: docRef.id,
      ...reservationData,
    });
  } catch (error) {
    console.error("Error creating reservation:", error);
    res.status(500).json({success: false, error: error.toString()});
  }
});

// Get reservations by user
exports.getUserReservations = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  try {
    const userId = req.query.userId;

    if (!userId) {
      res.status(400).json({error: "userId is required"});
      return;
    }

    const snapshot = await admin.firestore()
        .collection("reservations")
        .where("userId", "==", userId)
        .get();

    const reservations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(reservations);
  } catch (error) {
    console.error("Error getting reservations:", error);
    res.status(500).json({error: error.toString()});
  }
});

// Get reservations by center, date, and hour
exports.getReservationsByCenterAndDateTime =
  functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  try {
    const {centerId, date, hour} = req.query;

    if (!centerId || !date || !hour) {
      res.status(400).json({error: "centerId, date, and hour are required"});
      return;
    }

    const snapshot = await admin.firestore()
        .collection("reservations")
        .where("centerId", "==", String(centerId))
        .where("date", "==", date)
        .where("hour", "==", hour)
        .where("status", "in", ["pending", "confirmed"])
        .get();

    const reservations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(reservations);
  } catch (error) {
    console.error("Error getting reservations:", error);
    res.status(500).json({error: error.toString()});
  }
});

// Cancel reservation
exports.cancelReservation = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST, PUT");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST" && req.method !== "PUT") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const {reservationId, userId} = req.body;

    if (!reservationId || !userId) {
      res.status(400).json({success: false, error: "reservationId and userId are required"});
      return;
    }

    // Verify the reservation belongs to the user
    const reservationRef = admin.firestore().collection("reservations").doc(reservationId);
    const reservationDoc = await reservationRef.get();

    if (!reservationDoc.exists) {
      res.status(404).json({success: false, error: "Reservation not found"});
      return;
    }

    const reservationData = reservationDoc.data();
    if (reservationData.userId !== userId) {
      res.status(403).json({success: false, error: "You can only cancel your own reservations"});
      return;
    }

    if (reservationData.status === "cancelled") {
      res.status(400).json({success: false, error: "Reservation is already cancelled"});
      return;
    }

    // Update reservation status to cancelled
    await reservationRef.update({
      status: "cancelled",
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      message: "Reservation cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    res.status(500).json({success: false, error: error.toString()});
  }
});


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
