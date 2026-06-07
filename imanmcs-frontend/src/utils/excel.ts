import * as XLSX from 'xlsx';

export interface ExcelData {
  [key: string]: any;
}

export const exportToExcel = (data: ExcelData[], filename: string, sheetName: string = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Auto-size columns
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const colWidths: number[] = [];
  
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        const cellLength = cell.v.toString().length;
        if (cellLength > maxWidth) {
          maxWidth = cellLength;
        }
      }
    }
    colWidths[C] = Math.min(maxWidth + 2, 50);
  }
  
  worksheet['!cols'] = colWidths.map(w => ({ width: w }));
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const importFromExcel = (file: File): Promise<ExcelData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

export const validateExcelData = (data: ExcelData[], requiredFields: string[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data || data.length === 0) {
    errors.push('Excel file is empty');
    return { isValid: false, errors };
  }
  
  // Check if all required fields are present
  const firstRow = data[0];
  const missingFields = requiredFields.filter(field => !(field in firstRow));
  
  if (missingFields.length > 0) {
    errors.push(`Missing required columns: ${missingFields.join(', ')}`);
  }
  
  // Validate each row
  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field] && row[field] !== 0) {
        errors.push(`Row ${index + 2}: Missing value for ${field}`);
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Template generators
export const generateContributionTemplate = () => {
  const template = [
    {
      psn: 'PSN001',
      name: 'John Doe',
      period: '2025-01',
      savings: 5000,
      investment: 3000,
      target_saving: 2000
    }
  ];
  
  exportToExcel(template, 'contribution_template', 'Contributions');
};

export const generateMemberTemplate = () => {
  const template = [
    {
      name: 'John Doe',
      psn: 'PSN001',
      email: 'john.doe@example.com',
      phone: '08012345678',
      facility_name: 'General Hospital Gombe',
      next_of_kin_name: 'Jane Doe',
      next_of_kin_phone: '08087654321',
      savings: 5000,
      investment: 3000,
      target_saving: 50000,
      target_period: 12
    }
  ];
  
  exportToExcel(template, 'member_template', 'Members');
};

export const generateLoanRepaymentTemplate = () => {
  const template = [
    {
      period: '2025-01',
      psn: 'PSN001',
      name: 'John Doe',
      principal: 50000,
      deducted_this_month: 5000,
      loan_deducted: 5000,
      balance: 45000,
      tenure_remaining: 9
    }
  ];
  
  exportToExcel(template, 'loan_repayment_template', 'Loan Repayments');
};
