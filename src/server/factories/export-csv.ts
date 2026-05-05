import { ILecturerModel } from '@app/data/lecturer';
import { IMethodology } from '@app/data/methodology';
import { IStudentModel } from '@app/data/student';
import { IThesis } from '@app/data/thesis/thesis.model';
import { Response } from 'express';

function formatChapterLabel(raw: string): string {
  return `Chapter ${raw.charAt(0).toUpperCase() + raw.slice(1)}`;
}

export async function generateCsvFile(res: Response, thesis: IThesis[]) {
  const header =
    'Tracking ID,Title,Status,Department,Student Email,Lecturer Email,Methodology Email,Chapters,Upload Time\n';
  const name = new Date().toISOString().replace(/[:.]/g, '-');

  const rows = thesis
    .map((each) => {
      const columns = [
        each?.thesis_tracking_id ?? '',
        `"${each?.thesis_title ?? ''}"`, // quote title in case of commas
        each.thesis_status ?? '',
        (each?.student as IStudentModel)?.department ?? '',
        (each?.student as IStudentModel)?.email ?? '',
        (each?.lecturer as ILecturerModel)?.email ?? '',
        (each?.methodology as IMethodology)?.email ?? '',
        Array.isArray(each?.thesis_chapter)
          ? `"${each?.thesis_chapter.map(formatChapterLabel).join(', ')}"`
          : each?.thesis_chapter
            ? `"${formatChapterLabel(each.thesis_chapter)}"`
            : '',
        each.created_at ?? ''
      ];
      return columns.join(',');
    })
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=thesis_export_${name}.csv`
  );
  res.send(header + rows);
}
