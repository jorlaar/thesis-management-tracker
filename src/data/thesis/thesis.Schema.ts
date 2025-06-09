import { SchemaFactory, trimmedString } from '../base';
import { SchemaTypes } from 'mongoose';
import { THESIS_STATUS, THESIS_CHAPTER } from './thesis.model';

const ThesisSchema = SchemaFactory({
  student_id: { ...trimmedString, ref: 'student', required: true },
  thesis_tracking_id: { ...trimmedString, unique: true, required: true },
  thesis_level: {
    ...trimmedString,
    required: true,
    enum: ['pre_field', 'post_field']
  },
  thesis_status: {
    ...trimmedString,
    required: true,
    enum: Object.values(THESIS_STATUS),
    validate: {
      validator: (statuses) => statuses.length > 1,
      message: 'Only one status is required'
    }
  },
  thesis_chapter: {
    ...trimmedString,
    required: true,
    enum: Object.values(THESIS_CHAPTER),
    validate: {
      validator: (chapters) => chapters.length > 0,
      message: 'At least one status is required'
    }
  },
  comment_id: { ...trimmedString, ref: 'comment' },
  lecturer_id: { ...trimmedString, ref: 'lecturer' },
  methodology_id: { ...trimmedString, ref: 'methodology' },
  file_url: { ...trimmedString },
  student_upload_time_stamp: { type: SchemaTypes.Date },
  lecturer_review_time_stamp: { type: SchemaTypes.Date },
  methodology_review_time_stamp: { type: SchemaTypes.Date }
});

// For fast student-specific queries (e.g., "find all theses by student X")
ThesisSchema.index({ student_id: 1 });

// Already unique, but ensure index exists for tracking ID lookups
ThesisSchema.index({ thesis_tracking_id: 1 }, { unique: true });

// For filtering by status (e.g., "find all APPROVED theses")
ThesisSchema.index({ thesis_status: 1 });

// For filtering by chapter (e.g., "find all CHAPTER_1 submissions")
ThesisSchema.index({ thesis_chapter: 1 });

// For lecturer-specific reviews (e.g., "find theses assigned to lecturer Y")
ThesisSchema.index({ lecturer_id: 1 });

// For methodology-specific queries (note: fix typo in ref: 'methodology')
ThesisSchema.index({ methodology_id: 1 });
// For student dashboard: "show my post-field theses under review"
ThesisSchema.index({
  student_id: 1,
  thesis_level: 1,
  thesis_status: 1
});

// For lecturers: "find pre-field theses needing review"
ThesisSchema.index({
  thesis_level: 1,
  thesis_status: 1,
  lecturer_id: 1
});

// For methodology committee: "find post-field theses awaiting methodology review"
ThesisSchema.index({
  thesis_level: 1,
  thesis_status: 1,
  methodology_id: 1
});
// For recent student uploads (e.g., "theses submitted in last 30 days")
ThesisSchema.index({ student_upload_time_stamp: -1 }); // -1 = descending

// For lecturer review backlog (e.g., "oldest unreviewed theses")
ThesisSchema.index({
  thesis_status: 1,
  lecturer_review_time_stamp: 1
});

// For methodology review analytics
ThesisSchema.index({ methodology_review_time_stamp: -1 });
export default ThesisSchema;
