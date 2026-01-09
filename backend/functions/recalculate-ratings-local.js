// Local script to recalculate center ratings
// Run with: node recalculate-ratings-local.js

const admin = require('firebase-admin');

// Initialize Firebase Admin with your service account
// You need to download the service account key from Firebase Console
// and place it in the backend/functions directory
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function recalculateRatings() {
  try {
    console.log('🔄 Starting to recalculate center ratings...');

    // Get all reviews
    const reviewsSnapshot = await admin.firestore()
      .collection('comments')
      .get();

    console.log(`📊 Found ${reviewsSnapshot.size} reviews`);

    // Group reviews by centerId
    const reviewsByCenter = {};
    reviewsSnapshot.docs.forEach((doc) => {
      const review = doc.data();
      const centerId = String(review.centerId);

      if (!reviewsByCenter[centerId]) {
        reviewsByCenter[centerId] = [];
      }
      reviewsByCenter[centerId].push(review.rating);
    });

    console.log(`🏢 Found ${Object.keys(reviewsByCenter).length} centers with reviews`);

    // Update each center with calculated rating
    const updatePromises = [];
    for (const [centerId, ratings] of Object.entries(reviewsByCenter)) {
      const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

      console.log(`  → Center ${centerId}: ${averageRating.toFixed(2)} stars (${ratings.length} reviews)`);

      updatePromises.push(
        admin.firestore()
          .collection('centers')
          .doc(centerId)
          .update({
            rating: averageRating,
            reviewCount: ratings.length,
          })
      );
    }

    await Promise.all(updatePromises);

    console.log('✅ Successfully updated all center ratings!');
    console.log(`📈 Total centers updated: ${Object.keys(reviewsByCenter).length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error recalculating ratings:', error);
    process.exit(1);
  }
}

recalculateRatings();
