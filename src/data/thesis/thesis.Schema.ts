import { SchemaFactory, trimmedString } from '../base';
import { SchemaTypes } from 'mongoose';
import { THESIS_STATUS, THESIS_CHAPTER } from './thesis.model';
import s3 from '@app/server/services/s3/s3.service';
import env from '@app/common/config/env';

const ThesisSchema = SchemaFactory(
  {
    student: { ...trimmedString, ref: 'student', required: true },
    thesis_tracking_id: { ...trimmedString, required: true },
    thesis_level: {
      ...trimmedString,
      enum: ['pre_field', 'post_field', 'full_thesis', 'partial_thesis'],
      required: false
    },
    thesis_title: {
      ...trimmedString,
      required: true
    },
    thesis_status: {
      ...trimmedString,
      enum: Object.values(THESIS_STATUS),
      required: false
    },
    thesis_chapter: {
      type: [String],
      enum: Object.values(THESIS_CHAPTER),
      required: false
    },
    comment: { ...trimmedString },
    lecturer: { ...trimmedString, ref: 'lecturer' },
    methodology: { ...trimmedString, ref: 'methodology' },
    file_url: { ...trimmedString },
    student_upload_time_stamp: { type: SchemaTypes.Date },
    lecturer_review_time_stamp: { type: SchemaTypes.Date },
    methodology_review_time_stamp: { type: SchemaTypes.Date }
  },
  {
    toJSON: { virtuals: true }, // include virtuals when converting to JSON
    toObject: { virtuals: true } // include virtuals when using toObject()
  }
);

// ThesisSchema.pre('find', function () {
//   console.log('Pre-find hook called with populate:', this.getPopulatedPaths());
// });

// For fast student-specific queries (e.g., "find all theses by student X")
ThesisSchema.index({ student: 1 });

// Already unique, but ensure index exists for tracking ID lookups
ThesisSchema.index({ thesis_tracking_id: 1 }, { sparse: true });

// For lecturer-specific reviews (e.g., "find theses assigned to lecturer Y")
ThesisSchema.index({ lecturer: 1 });

// For methodology-specific queries (note: fix typo in ref: 'methodology')
ThesisSchema.index({ methodology: 1 });

// For recent student uploads (e.g., "theses submitted in last 30 days")
ThesisSchema.index({ student_upload_time_stamp: -1 }); // -1 = descending

// For methodology review analytics
ThesisSchema.index({ methodology_review_time_stamp: -1 });

// ThesisSchema.methods.getSignedDownloadUrl = async function (): Promise<string> {
//   console.log('this.file_key >>>>', this.file_url);

//   if (this.file_url) {
//     return await s3.getDownloadSignedUrl(env.thesis_bucket, this.file_url);
//   }
// };

ThesisSchema.virtual('download_url').get(function () {
  if (!this.file_url) return null;
  try {
    if (this.file_url.includes('res.cloudinary.com')) {
      return this.file_url;
    }
  } catch (err) {
    console.error('Error parsing file_url:', err);
  }
  const bucket = env.thesis_bucket;
  return s3.getDownloadSignedUrlSync(bucket, this.file_url, 3600);
});
export default ThesisSchema;
