/**
 * Export data to Excel file using SheetJS
 */

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: (value: any) => string;
}

export async function exportToExcel(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string
) {
  // Dynamically import SheetJS since it's large
  const XLSX = await import('xlsx');

  // Create worksheet data
  const wsData: any[] = [
    columns.map(col => col.header), // Headers
    ...data.map(row =>
      columns.map(col => {
        const value = row[col.key];
        return col.format ? col.format(value) : value;
      })
    ),
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');

  // Write file
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
