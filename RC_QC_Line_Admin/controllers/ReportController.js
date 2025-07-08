const Lot = require('../models/Lot');
const Image = require('../models/Image');
const AuditLog = require('../models/AuditLog');
const ExcelService = require('../services/ExcelService');
const ReportService = require('../services/ReportService');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

class ReportController {
    // Report dashboard
    static async index(req, res) {
        try {
            // Get date range from query or default to last 30 days
            const endDate = req.query.end_date ? moment(req.query.end_date) : moment();
            const startDate = req.query.start_date ? moment(req.query.start_date) : moment().subtract(30, 'days');
            
            // Get summary statistics
            const summary = await ReportService.getSummaryStats(startDate.toDate(), endDate.toDate());
            
            // Get top lots by image count
            const topLots = await ReportService.getTopLots(10);
            
            // Get upload trends
            const uploadTrends = await ReportService.getUploadTrends(startDate.toDate(), endDate.toDate());
            
            res.render('reports/index', {
                title: req.t('reports:title'),
                summary,
                topLots,
                uploadTrends,
                filters: {
                    start_date: startDate.format('YYYY-MM-DD'),
                    end_date: endDate.format('YYYY-MM-DD')
                }
            });
        } catch (error) {
            logger.error('Error loading reports:', error);
            req.flash('error_msg', req.t('common:errors.load_failed'));
            res.redirect('/');
        }
    }
    
    // Daily report
    static async daily(req, res) {
        try {
            const date = req.query.date ? moment(req.query.date) : moment();
            const report = await ReportService.getDailyReport(date.toDate());
            
            res.render('reports/daily', {
                title: req.t('reports:daily.title'),
                report,
                date: date.format('YYYY-MM-DD')
            });
        } catch (error) {
            logger.error('Error loading daily report:', error);
            req.flash('error_msg', req.t('common:errors.load_failed'));
            res.redirect('/reports');
        }
    }
    
    // Export lot summary
    static async exportLotSummary(req, res) {
        try {
            const { start_date, end_date, format } = req.body;
            
            const startDate = start_date ? moment(start_date).toDate() : moment().subtract(30, 'days').toDate();
            const endDate = end_date ? moment(end_date).toDate() : moment().toDate();
            
            const data = await ReportService.getLotSummary(startDate, endDate);
            
            // Format data for Excel
            const excelData = data.map(lot => ({
                'Lot Number': lot.lot_number,
                'Total Images': lot.image_count,
                'Total Size (MB)': (lot.total_size / 1024 / 1024).toFixed(2),
                'Created Date': moment(lot.created_at).format('DD/MM/YYYY'),
                'Last Upload': lot.last_upload ? moment(lot.last_upload).format('DD/MM/YYYY HH:mm') : '-',
                'Status': lot.status
            }));
            
            const buffer = await ExcelService.createWorkbook({
                sheets: [{
                    name: 'Lot Summary',
                    data: excelData,
                    columns: [
                        { header: 'Lot Number', key: 'Lot Number', width: 20 },
                        { header: 'Total Images', key: 'Total Images', width: 15 },
                        { header: 'Total Size (MB)', key: 'Total Size (MB)', width: 15 },
                        { header: 'Created Date', key: 'Created Date', width: 15 },
                        { header: 'Last Upload', key: 'Last Upload', width: 20 },
                        { header: 'Status', key: 'Status', width: 10 }
                    ]
                }],
                metadata: {
                    title: 'Lot Summary Report',
                    dateRange: `${moment(startDate).format('DD/MM/YYYY')} - ${moment(endDate).format('DD/MM/YYYY')}`,
                    generatedBy: req.session.user.full_name,
                    generatedAt: moment().format('DD/MM/YYYY HH:mm')
                }
            });
            
            // Log the action
            await AuditLog.logReportExport(
                req.session.user.admin_id,
                'lot_summary',
                { start_date, end_date },
                req.ip,
                req.get('user-agent')
            );
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=lot_summary_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);
            res.send(buffer);
        } catch (error) {
            logger.error('Error exporting lot summary:', error);
            req.flash('error_msg', req.t('common:errors.export_failed'));
            res.redirect('/reports');
        }
    }
    
    // Export image details
    static async exportImageDetails(req, res) {
        try {
            const { lot_id, start_date, end_date } = req.body;
            
            const filters = {
                status: 'active'
            };
            
            if (lot_id) filters.lot_id = lot_id;
            if (start_date) filters.startDate = moment(start_date).toDate();
            if (end_date) filters.endDate = moment(end_date).toDate();
            
            const images = await Image.findAll(filters);
            
            const excelData = images.map(img => ({
                'File Name': img.file_name,
                'Lot Number': img.lot_number,
                'Upload Date': moment(img.uploaded_at).format('DD/MM/YYYY HH:mm'),
                'Uploaded By': img.uploader_name || img.uploaded_by,
                'File Size': img.formatSize(),
                'Type': img.mime_type
            }));
            
            const buffer = await ExcelService.createWorkbook({
                sheets: [{
                    name: 'Image Details',
                    data: excelData
                }],
                metadata: {
                    title: 'Image Details Report',
                    filters: filters,
                    generatedBy: req.session.user.full_name,
                    generatedAt: moment().format('DD/MM/YYYY HH:mm')
                }
            });
            
            // Log the action
            await AuditLog.logReportExport(
                req.session.user.admin_id,
                'image_details',
                filters,
                req.ip,
                req.get('user-agent')
            );
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=image_details_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);
            res.send(buffer);
        } catch (error) {
            logger.error('Error exporting image details:', error);
            req.flash('error_msg', req.t('common:errors.export_failed'));
            res.redirect('/reports');
        }
    }
    
    // Export daily upload report
    static async exportDailyUploads(req, res) {
        try {
            const { start_date, end_date } = req.body;
            
            const startDate = start_date ? moment(start_date).toDate() : moment().subtract(30, 'days').toDate();
            const endDate = end_date ? moment(end_date).toDate() : moment().toDate();
            
            const data = await ReportService.getDailyUploads(startDate, endDate);
            
            const excelData = data.map(day => ({
                'Date': moment(day.upload_date).format('DD/MM/YYYY'),
                'Total Uploads': day.upload_count,
                'Total Size (MB)': (day.total_size / 1024 / 1024).toFixed(2),
                'Unique Uploaders': day.unique_uploaders,
                'Lots Updated': day.lots_updated
            }));
            
            const buffer = await ExcelService.createWorkbook({
                sheets: [{
                    name: 'Daily Uploads',
                    data: excelData,
                    chart: {
                        type: 'line',
                        data: {
                            categories: excelData.map(d => d.Date),
                            series: [{
                                name: 'Total Uploads',
                                values: excelData.map(d => d['Total Uploads'])
                            }]
                        }
                    }
                }],
                metadata: {
                    title: 'Daily Upload Report',
                    dateRange: `${moment(startDate).format('DD/MM/YYYY')} - ${moment(endDate).format('DD/MM/YYYY')}`,
                    generatedBy: req.session.user.full_name,
                    generatedAt: moment().format('DD/MM/YYYY HH:mm')
                }
            });
            
            // Log the action
            await AuditLog.logReportExport(
                req.session.user.admin_id,
                'daily_uploads',
                { start_date, end_date },
                req.ip,
                req.get('user-agent')
            );
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=daily_uploads_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);
            res.send(buffer);
        } catch (error) {
            logger.error('Error exporting daily uploads:', error);
            req.flash('error_msg', req.t('common:errors.export_failed'));
            res.redirect('/reports');
        }
    }
    
    // Storage usage report
    static async storageReport(req, res) {
        try {
            const storageData = await ReportService.getStorageAnalysis();
            
            res.render('reports/storage', {
                title: req.t('reports:storage.title'),
                storageData
            });
        } catch (error) {
            logger.error('Error loading storage report:', error);
            req.flash('error_msg', req.t('common:errors.load_failed'));
            res.redirect('/reports');
        }
    }
    
    // User activity report (Admin only)
    static async userActivity(req, res) {
        try {
            const { start_date, end_date } = req.query;
            
            const startDate = start_date ? moment(start_date).toDate() : moment().subtract(7, 'days').toDate();
            const endDate = end_date ? moment(end_date).toDate() : moment().toDate();
            
            const activityData = await ReportService.getUserActivity(startDate, endDate);
            
            res.render('reports/user-activity', {
                title: req.t('reports:user_activity.title'),
                activityData,
                filters: {
                    start_date: moment(startDate).format('YYYY-MM-DD'),
                    end_date: moment(endDate).format('YYYY-MM-DD')
                }
            });
        } catch (error) {
            logger.error('Error loading user activity:', error);
            req.flash('error_msg', req.t('common:errors.load_failed'));
            res.redirect('/reports');
        }
    }
    
    // Generate custom report
    static async customReport(req, res) {
        try {
            const { report_type, filters } = req.body;
            
            let data;
            let filename;
            
            switch (report_type) {
                case 'lot_analysis':
                    data = await ReportService.getLotAnalysis(filters);
                    filename = 'lot_analysis';
                    break;
                    
                case 'upload_trends':
                    data = await ReportService.getUploadTrends(
                        moment(filters.start_date).toDate(),
                        moment(filters.end_date).toDate()
                    );
                    filename = 'upload_trends';
                    break;
                    
                case 'user_statistics':
                    data = await ReportService.getUserStatistics(filters);
                    filename = 'user_statistics';
                    break;
                    
                default:
                    throw new Error('Invalid report type');
            }
            
            const buffer = await ExcelService.createWorkbook({
                sheets: [{
                    name: 'Report Data',
                    data: data
                }],
                metadata: {
                    reportType: report_type,
                    filters: filters,
                    generatedBy: req.session.user.full_name,
                    generatedAt: moment().format('DD/MM/YYYY HH:mm')
                }
            });
            
            // Log the action
            await AuditLog.logReportExport(
                req.session.user.admin_id,
                report_type,
                filters,
                req.ip,
                req.get('user-agent')
            );
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);
            res.send(buffer);
        } catch (error) {
            logger.error('Error generating custom report:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.export_failed')
            });
        }
    }
}

module.exports = ReportController;