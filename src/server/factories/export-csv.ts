import { ILecturerModel } from '@app/data/lecturer';
import { IMethodology } from '@app/data/methodology';
import { IStudentModel } from '@app/data/student';
import { IThesis } from '@app/data/thesis/thesis.model';
import { Response } from 'express';


import { Parser } from '@json2csv/plainjs';

function formatChapterLabel(raw: string): string {
  return `Chapter ${raw.charAt(0).toUpperCase() + raw.slice(1)}`;
}

// export async function generateCsvFile(res: Response, thesis: IThesis[]) {
//   const header =
//     'Tracking ID,Title,Status,Department,Student Email,Lecturer Email,Methodology Email,Chapters,Upload Time\n';
//   const name = new Date().toISOString().replace(/[:.]/g, '-');

//   const rows = thesis
//     .map((each) => {
//       const columns = [
//         each?.thesis_tracking_id ?? '',
//         `"${each?.thesis_title ?? ''}"`, // quote title in case of commas
//         each.thesis_status ?? '',
//         (each?.student as IStudentModel)?.department ?? '',
//         (each?.student as IStudentModel)?.email ?? '',
//         (each?.lecturer as ILecturerModel)?.email ?? '',
//         (each?.methodology as IMethodology)?.email ?? '',
//         Array.isArray(each?.thesis_chapter)
//           ? `"${each?.thesis_chapter.map(formatChapterLabel).join(', ')}"`
//           : each?.thesis_chapter
//             ? `"${formatChapterLabel(each.thesis_chapter)}"`
//             : '',
//         each.created_at ?? ''
//       ];
//       return columns.join(',');
//     })
//     .join('\n');
//   res.setHeader('Content-Type', 'text/csv');
//   res.setHeader(
//     'Content-Disposition',
//     `attachment; filename=thesis_export_${name}.csv`
//   );
//   res.send(header + rows);
// }

// const parser = new Parser({
//   fields: [
//     { value: 'trackingId', label: 'Tracking ID' },
//     { value: 'title', label: 'Title' },
//     // ...
//   ],
// });

// Helper to flatten each thesis record into a plain object
function flattenThesis(thesis: IThesis) {
  return {
    tracking_id: thesis.thesis_tracking_id ?? '',
    title: thesis.thesis_title ?? '',
    status: thesis.thesis_status ?? '',
    department: (thesis.student as IStudentModel)?.department ?? '',
    student_email: (thesis.student as IStudentModel)?.email ?? '',
    lecturer_email: (thesis.lecturer as ILecturerModel)?.email ?? '',
    methodology_email: (thesis.methodology as IMethodology)?.email ?? '',
    chapters: Array.isArray(thesis.thesis_chapter)
      ? thesis.thesis_chapter.map(formatChapterLabel).join(', ')
      : thesis.thesis_chapter
        ? formatChapterLabel(thesis.thesis_chapter as string)
        : '',
    upload_time: thesis.created_at ?? '',
  };
}

export async function generateCsvStream(
  res: Response,
  thesisList: IThesis[]
): Promise<void> {
  const filename = `thesis_export_${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.csv`;

  // Configure the parser
  const parser = new Parser({
    fields: [
      'tracking_id',
      'title',
      'status',
      'department',
      'student_email',
      'lecturer_email',
      'methodology_email',
      'chapters',
      'upload_time',
    ],
    // Explicitly set the header names (optional – if you want different column titles)
    header: true,
    // Use `withBOM: false` unless your audience requires Excel BOM for UTF‑8
  });

  // Flatten all records
  const flatData = thesisList.map(flattenThesis);

  // Parse the whole array – for very large datasets you could stream, but this is fine for < 10k rows
  const csv = parser.parse(flatData);

  // Set headers and send
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${filename}`
  );
  res.send(csv);
}
