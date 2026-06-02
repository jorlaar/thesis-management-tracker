// import mongoose, { Schema } from 'mongoose';
// import { v7 as uuidv7 } from 'uuid';

import mongoose from 'mongoose';
import { v7 as uuidv7 } from 'uuid';
// import studentRepo from '@app/data/student/student.repo';
import thesisRepo from '@app/data/thesis/thesis.repo';
// import lecturerRepo from '@app/data/lecturer/lecturer.repo';
import methodologyRepo from '@app/data/methodology/methodology.repo';

// 1. SCHEMAS
// interface IUser { _id: string; name: string; created_at: Date; }
// interface IPost { _id: string; title: string; author_id: string; }

// const UserSchema = new Schema<IUser>({
//   _id: { type: String, required: true },
//   name: { type: String, required: true },
//   created_at: { type: Date, required: true }
// });
// const User = mongoose.model<IUser>('User', UserSchema);

// const PostSchema = new Schema<IPost>({
//   _id: { type: String, required: true },
//   title: { type: String, required: true },
//   author_id: { type: String, required: true, ref: 'User' } // Foreign Key Relation
// });
// const Post = mongoose.model<IPost>('Post', PostSchema);

// Helper to preserve historic time window
function generateUuidv7FromDate(date: Date): string {
  return uuidv7({ msecs: date.getTime() });
}

// 2. MIGRATION RUNNER
export async function migrateWithRelations() {
  const BATCH_SIZE = 200;
  let processedCount = 0;

  //   console.log('🚀 Connecting and executing relational migration...');
  //   await mongoose.connect('mongodb://localhost:27017/your_database');

  // Identifies standard UUIDv4 formatted string keys
  const uuidv4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  while (true) {
    const oldMethodologies = await methodologyRepo.model
      .find({ _id: uuidv4Regex })
      .select('+password')
      .hint({ $natural: 1 })
      .limit(BATCH_SIZE)
      .lean();
    if (oldMethodologies.length === 0) break;

    for (const methodology of oldMethodologies) {
      const oldId = methodology._id;
      const newId = generateUuidv7FromDate(methodology.created_at);

      const { _id, ...cleanUserData } = methodology;
      const newUserDoc = { _id: newId, ...cleanUserData };

      // ACID Transaction to prevent detached references if database loses connection mid-execution
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // C. Delete old UUIDv4 user document
          await methodologyRepo.model.deleteOne({ _id: oldId }, { session });

          // A. Clone user document with UUIDv7
          await methodologyRepo.model.insertOne(newUserDoc, { session });

          // B. Cascade update all Foreign Keys in 'thesis' pointing to this methodology
          // also update this for methodology and methodology also
          await thesisRepo.model.updateMany(
            { methodology: oldId },
            { $set: { methodology: newId } },
            { session }
          );
        });
        processedCount++;
      } catch (err) {
        console.error(`❌ Transaction aborted for User ID ${oldId}:`, err);
      } finally {
        await session.endSession();
      }
    }
    console.log(`Processed ${processedCount} users...`);
  }

  // 3. STORAGE COMPACTING (Optimizes fragmented B-trees)
//   console.log('🧹 Compacting structural indexes...');
//   await mongoose.connection.db?.command({ compact: 'methodology', force: true  });
//   await mongoose.connection.db?.command({ compact: 'theses', force: true });

  console.log(
    `🎉 Relational migration completed on ${processedCount} identities.`
  );
  await mongoose.disconnect();
}

migrateWithRelations().catch(console.error);
