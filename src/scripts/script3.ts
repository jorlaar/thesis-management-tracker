import mongoose from 'mongoose';
// import { v7 as uuidv7 } from 'uuid';
import { IStudentModel } from '@app/data/student/student.model';
import { IAdmin } from '@app/data/admin/admin.model';
import { ILecturerModel } from '@app/data/lecturer/lecturer.model';
import { IMethodology } from '@app/data/methodology/methodology.model';
import { studentSchema } from '@app/data/student';
import AdminSchema from '@app/data/admin/admin.Schema';
import LecturerSchema from '@app/data/lecturer/lecturer.schema';
import { MethodologySchema } from '@app/data/methodology';
import env from '@app/common/config/env';

// 1. Interfaces & Schema Definitions (Include all collections affected by the migration)
// interface IUser {
//   name: string;
//   email: string;
//   password?: string;
// }

// const UserSchema = new Schema<IUser>({
//   name: { type: String, required: true },
//   email: { type: String, required: true },
//   password: { type: String, required: true }
// });

// IMPORTANT: Import or define your actual application pre-save hook right here
// so Mongoose knows how to encrypt the text string.
// Example:
// UserSchema.pre('save', async function(next) {
//   if (this.isModified('password')) {
//     this.password = await bcrypt.hash(this.password, 10);
//   }
//   next();
// });

// Register models for each collection you need to fix
const Admin = mongoose.model<IAdmin>('Admin', AdminSchema, 'admins');
const Student = mongoose.model<IStudentModel>(
  'Student',
  studentSchema,
  'students'
);
const Lecturer = mongoose.model<ILecturerModel>(
  'Lecturer',
  LecturerSchema,
  'lecturers'
);
const Methodology = mongoose.model<IMethodology>(
  'Methodology',
  MethodologySchema,
  'methodologies'
);

export async function resetAllPasswordsScript() {
  const DEFAULT_PASSWORD = env.default_password;
  const targetModels = [Admin, Student, Lecturer, Methodology];

  console.log('🔄 Connecting to database to repair passwords...');
  //   await mongoose.connect('mongodb://localhost:27017/thesis');

  for (const rawModel of targetModels) {
    const Model = rawModel as any;
    console.log(`\n⏳ Processing collection: ${Model.collection.name}...`);

    // Fetch all documents. Do NOT use .lean() here, because we need
    // full Mongoose documents to trigger the save middleware hooks.
    const documents = await Model.find({}).select('+password');
    let resetCount = 0;

    for (const doc of documents) {
    console.log(`\n⏳ Processing doc: ${doc._id} in ${Model.collection.name}...`, doc);

      try {
        // Set the plain-text password.
        // Your schema's pre('save') hook will catch this and hash it cleanly.
        // doc.password = DEFAULT_PASSWORD;

        // doc.markModified('password');
        await doc.updatePassword(DEFAULT_PASSWORD);
        resetCount++;
      } catch (err) {
        console.error(`❌ Failed to reset password for ${doc.email}:`, err);
      }
    }

    console.log(
      `✅ Reset complete. Fixed ${resetCount} accounts in ${Model.collection.name}.`
    );
  }

  console.log('\n🎉 Password reset process completed successfully!');
  //   await mongoose.disconnect();
}

resetAllPasswordsScript().catch(console.error);
