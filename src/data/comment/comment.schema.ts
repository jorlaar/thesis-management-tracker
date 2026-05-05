import { trimmedString, SchemaFactory } from '../base';

const CommentSchema = SchemaFactory({
  thesis: { ...trimmedString, ref: 'thesis', required: true },
  comment: { ...trimmedString, required: true },
  lecturer: { ...trimmedString, ref: 'lecturer' },
  methodology: { ...trimmedString, ref: 'methodology' },
  student: { ...trimmedString, ref: 'student' }
});

// Primary index: Fast lookup by thesis_id (most common query)
CommentSchema.index({ thesis: 1 });

// Unique compound index: Prevent duplicate comments on the same thesis
CommentSchema.index({ comment: 1, thesis: 1 }, { unique: true });

// For lecturer-specific comment tracking
CommentSchema.index({ lecturer: 1 });

// For methodology committee comment tracking
CommentSchema.index({ methodology: 1 });

// For queries like "show all comments by lecturer X on thesis Y"
CommentSchema.index({
  lecturer: 1,
  thesis: 1
});

// For methodology team: "comments by methodology reviewers on thesis Z"
CommentSchema.index({
  methodology: 1,
  thesis: 1
});
export default CommentSchema;
