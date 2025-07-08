const ExcelJS = require('exceljs');
const moment = require('moment-timezone');
const logger = require('../utils/logger');

class ExcelService {
    /**
     * Create Excel workbook with data
     */
    static async createWorkbook(options) {
        const workbook = new ExcelJS.Workbook();
        
        // Set workbook properties
        workbook.creator = 'RC QC Admin System';
        workbook.lastModifiedBy = options.metadata?.generatedBy || 'System';
        workbook.created = new Date();
        workbook.modified = new Date();
        
        // Add metadata sheet if provided
        if (options.metadata) {
            const metaSheet = workbook.addWorksheet('Metadata');
            metaSheet.addRow(['Report Information']);
            metaSheet.addRow(['']);
            
            Object.entries(options.metadata).forEach(([key, value]) => {
                const displayKey = key.split(/(?=[A-Z])/).join(' ');
                const capitalizedKey = displayKey.charAt(0).toUpperCase() + displayKey.slice(1);
                metaSheet.addRow([capitalizedKey + ':', value]);
            });
            
            // Style metadata sheet
            metaSheet.getColumn(1).width = 20;
            metaSheet.getColumn(2).width = 50;
            metaSheet.getRow(1).font = { bold: true, size: 14 };
            
            // Add border to metadata
            const lastRow = metaSheet.lastRow.number;
            for (let i = 1; i <= lastRow; i++) {
                metaSheet.getRow(i).eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }
        }
        
        // Process each sheet
        for (const sheetConfig of options.sheets) {
            const worksheet = workbook.addWorksheet(sheetConfig.name);
            
            // Add data
            if (sheetConfig.data && sheetConfig.data.length > 0) {
                // Add headers
                const headers = Object.keys(sheetConfig.data[0]);
                const headerRow = worksheet.addRow(headers);
                
                // Style headers
                headerRow.font = { bold: true };
                headerRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' }
                };
                
                // Add data rows
                sheetConfig.data.forEach(row => {
                    worksheet.addRow(Object.values(row));
                });
                
                // Set column properties
                if (sheetConfig.columns) {
                    worksheet.columns = sheetConfig.columns;
                } else {
                    // Auto-size columns
                    worksheet.columns.forEach((column, index) => {
                        let maxLength = headers[index].length;
                        
                        worksheet.eachRow((row, rowNumber) => {
                            if (rowNumber > 1) {
                                const cellValue = row.values[index + 1];
                                if (cellValue) {
                                    const cellLength = cellValue.toString().length;
                                    if (cellLength > maxLength) {
                                        maxLength = cellLength;
                                    }
                                }
                            }
                        });
                        
                        column.width = Math.min(maxLength + 2, 50);
                    });
                }
                
                // Add filters
                worksheet.autoFilter = {
                    from: { row: 1, column: 1 },
                    to: { row: 1, column: headers.length }
                };
                
                // Add borders
                const lastRow = worksheet.lastRow.number;
                const lastCol = worksheet.lastColumn.number;
                
                for (let row = 1; row <= lastRow; row++) {
                    for (let col = 1; col <= lastCol; col++) {
                        worksheet.getCell(row, col).border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    }
                }
                
                // Freeze header row
                worksheet.views = [{
                    state: 'frozen',
                    xSplit: 0,
                    ySplit: 1
                }];
                
                // Add chart if specified
                if (sheetConfig.chart) {
                    await this.addChart(worksheet, sheetConfig.chart);
                }
            }
        }
        
        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }
    
    /**
     * Add chart to worksheet
     */
    static async addChart(worksheet, chartConfig) {
        try {
            // Charts are not directly supported in ExcelJS
            // This is a placeholder for future implementation
            // You might need to use a different library or approach for charts
            logger.warn('Chart generation not implemented yet');
        } catch (error) {
            logger.error('Error adding chart:', error);
        }
    }
    
    /**
     * Read Excel file
     */
    static async readWorkbook(buffer) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        
        const data = {};
        
        workbook.eachSheet((worksheet) => {
            const sheetData = [];
            let headers = [];
            
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) {
                    headers = row.values.slice(1); // Remove first empty element
                } else {
                    const rowData = {};
                    row.values.slice(1).forEach((value, index) => {
                        rowData[headers[index]] = value;
                    });
                    sheetData.push(rowData);
                }
            });
            
            data[worksheet.name] = sheetData;
        });
        
        return data;
    }
    
    /**
     * Create a simple CSV file
     */
    static async createCSV(data, headers) {
        const rows = [];
        
        // Add headers
        rows.push(headers.join(','));
        
        // Add data
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                // Escape values containing commas or quotes
                if (value.toString().includes(',') || value.toString().includes('"')) {
                    return `"${value.toString().replace(/"/g, '""')}"`;
                }
                return value;
            });
            rows.push(values.join(','));
        });
        
        return Buffer.from(rows.join('\n'), 'utf-8');
    }
    
    /**
     * Generate lot summary Excel
     */
    static async generateLotSummary(lots) {
        const data = lots.map(lot => ({
            'Lot Number': lot.lot_number,
            'Total Images': lot.image_count,
            'Total Size (MB)': (lot.total_size / 1024 / 1024).toFixed(2),
            'Created Date': moment(lot.created_at).format('DD/MM/YYYY'),
            'Last Upload': lot.last_upload ? moment(lot.last_upload).format('DD/MM/YYYY HH:mm') : '-',
            'Status': lot.status === 'active' ? 'Active' : 'Deleted'
        }));
        
        return this.createWorkbook({
            sheets: [{
                name: 'Lot Summary',
                data: data
            }],
            metadata: {
                title: 'Lot Summary Report',
                generatedAt: moment().format('DD/MM/YYYY HH:mm'),
                totalLots: lots.length
            }
        });
    }
    
    /**
     * Generate image list Excel
     */
    static async generateImageList(images) {
        const data = images.map(img => ({
            'File Name': img.file_name,
            'Lot Number': img.lot_number,
            'Upload Date': moment(img.uploaded_at).format('DD/MM/YYYY HH:mm'),
            'Uploaded By': img.uploader_name || img.uploaded_by,
            'File Size': img.formatSize(),
            'Type': img.mime_type,
            'Status': img.status === 'active' ? 'Active' : 'Deleted'
        }));
        
        return this.createWorkbook({
            sheets: [{
                name: 'Image List',
                data: data
            }],
            metadata: {
                title: 'Image List Report',
                generatedAt: moment().format('DD/MM/YYYY HH:mm'),
                totalImages: images.length
            }
        });
    }
}

module.exports = ExcelService;