import { SchemaFactory, trimmedString } from '../base';
import { SchemaTypes } from 'mongoose';
import { THESIS_STATUS, THESIS_CHAPTER } from './thesis.model';

const ThesisSchema = SchemaFactory({
  student_id: { ...trimmedString, ref: 'student', required: true },
  thesis_tracking_id: { ...trimmedString, required: true },
  thesis_level: {
    ...trimmedString,
    enum: ['pre_field', 'post_field', "full_thesis"],
    required: false
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
  lecturer_id: { ...trimmedString, ref: 'lecturer' },
  methodology_id: { ...trimmedString, ref: 'methodology' },
  file_url: { ...trimmedString },
  student_upload_time_stamp: { type: SchemaTypes.Date },
  lecturer_review_time_stamp: { type: SchemaTypes.Date },
  methodology_review_time_stamp: { type: SchemaTypes.Date }
});

// ThesisSchema.pre('find', function () {
//   console.log('Pre-find hook called with populate:', this.getPopulatedPaths());
// });

// For fast student-specific queries (e.g., "find all theses by student X")
ThesisSchema.index({ student_id: 1 });

// Already unique, but ensure index exists for tracking ID lookups
ThesisSchema.index({ thesis_tracking_id: 1 }, { sparse: true });

// For lecturer-specific reviews (e.g., "find theses assigned to lecturer Y")
ThesisSchema.index({ lecturer_id: 1 });

// For methodology-specific queries (note: fix typo in ref: 'methodology')
ThesisSchema.index({ methodology_id: 1 });

// For recent student uploads (e.g., "theses submitted in last 30 days")
ThesisSchema.index({ student_upload_time_stamp: -1 }); // -1 = descending

// For methodology review analytics
ThesisSchema.index({ methodology_review_time_stamp: -1 });
export default ThesisSchema;
