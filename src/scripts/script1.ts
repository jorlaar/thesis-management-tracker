// import mongoose, { Schema } from 'mongoose';
import mongoose from 'mongoose';
import { v7 as uuidv7 } from 'uuid';
// import StudentSchema from '@app/data/student/student.schema';
// import IStudentModel from '@app/data/student/student.model';
// import thesisRepo from '@app/data/thesis/thesis.repo';
import adminRepo from '@app/data/admin/admin.repo';

// 1. Define your original schema structure
// Note: If you explicitly defined `_id: false`, make sure your schema type allows strings/buffers.
// interface IUser {
//   _id: string;
//   name: string;
//   created_at: Date;
// }

// const UserSchema = new Schema<IUser>({
//   _id: { type: String, required: true },
//   name: { type: String, required: true },
//   created_at: { type: Date, required: true }
// }, {
//   timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
// });

// const User = mongoose.model<IUser>('User', UserSchema);

/**
 * Generates a UUIDv7 tied to a specific historical Date object
 */
function generateUuidv7FromDate(date: Date): string {
  const timestampMs = date.getTime();

  // The standard uuid library accepts optional options object where you can supply a custom msecs timestamp
  return uuidv7({ msecs: timestampMs });
}

export async function singleUuidSchemaMigrateCollection() {
  const BATCH_SIZE = 500;
  let processedCount = 0;

  console.log('🚀 Starting UUIDv4 to UUIDv7 Migration...');

  // Connect to MongoDB (Adjust URI as needed)
  // await mongoose.connect('mongodb://localhost:27017/your_database');

  while (true) {
    // 2. Fetch a batch of old records.
    // We look for UUIDv4 format (using regex) to target only unconverted records.
    // UUIDv4 always has a '4' at the start of the 3rd block: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx
    const uuidv4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const oldDocuments = await adminRepo.model
      .find({ _id: uuidv4Regex })
      .select('+password')
      .limit(BATCH_SIZE)
      .lean();

    if (oldDocuments.length === 0) {
      break; // No more older records found!
    }

    console.log(`Processing batch of ${oldDocuments.length} records...`);

    for (const doc of oldDocuments) {
      // 3. Generate a UUIDv7 preserving the exact historical 'created_at' timestamp
      const oldId = doc._id;
      const newId = generateUuidv7FromDate(doc.created_at);

      // Deep clone the object and reassign the primary key
      const { _id, ...cleanData } = doc;
      const updatedDocument = { _id: newId, ...cleanData };

      // 4. Atomic Execution: Save new document first, then delete the old one
      // (Using a session/transaction here is highly recommended if you are on a replica set)
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // Remove the original UUIDv4 document
          await adminRepo.model.deleteOne({ _id: oldId }, { session });

          // Insert the copy with the new ID
          await adminRepo.model.insertOne(updatedDocument, { session });
        });
      } catch (err) {
        console.error(`❌ Failed to migrate document ${oldId}:`, err);
        // Continue with other documents even if one fails
      } finally {
        await session.endSession();
      }

      processedCount++;
    }

    console.log(`✅ Progress: Migrated ${processedCount} documents so far.`);
  }

  // 5. Post-migration cleanup: Compact the database storage to remove index fragments
  // console.log('🧹 Optimizing database indexes...');
  // await mongoose.connection.db?.command({ compact: 'theses', force: true }); // matches collection name
  // await mongoose.connection.db?.command({ compact: 'theses' }); // matches collection name

  console.log(
    `🎉 Migration complete! Successfully converted ${processedCount} records.`
  );
  // await mongoose.disconnect();
}

singleUuidSchemaMigrateCollection().catch(console.error);
