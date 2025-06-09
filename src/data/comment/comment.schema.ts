import { trimmedString, SchemaFactory } from '../base';

const CommentSchema = SchemaFactory({
  thesis_id: { ...trimmedString, ref: 'thesis', required: true },
  comment: { ...trimmedString, required: true },
  lecturer_id: { ...trimmedString, ref: 'lecturer' },
  methodology_id: { ...trimmedString, ref: 'methodology' }
});

// Primary index: Fast lookup by thesis_id (most common query)
CommentSchema.index({ thesis_id: 1 }); 

// Unique compound index: Prevent duplicate comments on the same thesis
CommentSchema.index({ comment: 1, thesis_id: 1 }, { unique: true }); 

// For lecturer-specific comment tracking
CommentSchema.index({ lecturer_id: 1 }); 

// For methodology committee comment tracking
CommentSchema.index({ methodology_id: 1 });

// For queries like "show all comments by lecturer X on thesis Y"
CommentSchema.index({
  lecturer_id: 1,
  thesis_id: 1
});

// For methodology team: "comments by methodology reviewers on thesis Z"
CommentSchema.index({
  methodology_id: 1,
  thesis_id: 1
});
export default CommentSchema;
