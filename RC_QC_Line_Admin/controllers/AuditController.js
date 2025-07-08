const AuditLog = require('../models/AuditLog');
const ExcelService = require('../services/ExcelService');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

class AuditController {
    // List audit logs
    static async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const admin_id = req.query.admin_id || '';
            const action_type = req.query.action_type || '';
            const entity_type = req.query.entity_type || '';
            const start_date = req.query.start_date || '';
            const end_date = req.query.end_date || '';
            const search = req.query.search || '';
            
            const filters = {
                page,
                limit
            };
            
            if (admin_id) filters.admin_id = admin_id;
            if (action_type) filters.action_type = action_type;
            if (entity_type) filters.entity_type = entity_type;
            if (start_date) filters.startDate = moment(start_date).startOf('day').toDate();
            if (end_date) filters.endDate = moment(end_date).endOf('day').toDate();
            if (search) filters.search = search;
            
            // Get audit logs
            const logs = await AuditLog.findAll(filters);
            const totalCount = await AuditLog.count(filters);
            const totalPages = Math.ceil(totalCount / limit);
            
            // Get available action types and entity types for filters
            const actionTypes = await AuditLog.getActionTypes();
            const entityTypes = await AuditLog.getEntityTypes();
            
            res.render('audit/index', {
                title: req.t('audit:title'),
                logs,
                actionTypes,
                entityTypes,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                filters: {
                    admin_id,
                    action_type,
                    entity_type,
                    start_date,
                    end_date,
                    search
                }
            });
        } catch (error) {
            logger.error('Error listing audit logs:', error);
            req.flash('error_msg', req.t('common:errors.load_failed'));
            res.redirect('/');
        }
    }
    
    // View audit log details (AJAX)
    static async view(req, res) {
        try {
            const logId = req.params.id;
            const log = await AuditLog.findById(logId);
            
            if (!log) {
                return res.status(404).json({
                    success: false,
                    message: req.t('audit:errors.not_found')
                });
            }
            
            res.json({
                success: true,
                data: log.toJSON()
            });
        } catch (error) {
            logger.error('Error viewing audit log:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.load_failed')
            });
        }
    }
    
    // Export audit logs
    static async export(req, res) {
        try {
            const { admin_id, action_type, entity_type, start_date, end_date } = req.body;
            
            const filters = {};
            if (admin_id) filters.admin_id = admin_id;
            if (action_type) filters.action_type = action_type;
            if (entity_type) filters.entity_type = entity_type;
            if (start_date) filters.startDate = moment(start_date).startOf('day').toDate();
            if (end_date) filters.endDate = moment(end_date).endOf('day').toDate();
            
            // Get all logs without pagination
            const logs = await AuditLog.findAll(filters);
            
            // Format data for Excel
            const excelData = logs.map(log => {
                const actionDisplay = log.getActionTypeDisplay();
                return {
                    'Date/Time': moment(log.created_at).format('DD/MM/YYYY HH:mm:ss'),
                    'User': log.admin_name || 'System',
                    'Employee ID': log.admin_employee_id || '-',
                    'Action': actionDisplay.text,
                    'Entity Type': log.entity_type || '-',
                    'Entity ID': log.entity_id || '-',
                    'Description': log.description || '-',
                    'IP Address': log.ip_address || '-',
                    'Old Value': log.old_value || '-',
                    'New Value': log.new_value || '-'
                };
            });
            
            const buffer = await ExcelService.createWorkbook({
                sheets: [{
                    name: 'Audit Logs',
                    data: excelData,
                    columns: [
                        { header: 'Date/Time', key: 'Date/Time', width: 20 },
                        { header: 'User', key: 'User', width: 20 },
                        { header: 'Employee ID', key: 'Employee ID', width: 15 },
                        { header: 'Action', key: 'Action', width: 20 },
                        { header: 'Entity Type', key: 'Entity Type', width: 15 },
                        { header: 'Entity ID', key: 'Entity ID', width: 10 },
                        { header: 'Description', key: 'Description', width: 40 },
                        { header: 'IP Address', key: 'IP Address', width: 15 },
                        { header: 'Old Value', key: 'Old Value', width: 30 },
                        { header: 'New Value', key: 'New Value', width: 30 }
                    ]
                }],
                metadata: {
                    title: 'Audit Log Export',
                    filters: filters,
                    exportedBy: req.session.user.full_name,
                    exportedAt: moment().format('DD/MM/YYYY HH:mm')
                }
            });
            
            // Log the export action
            await AuditLog.create({
                admin_id: req.session.user.admin_id,
                action_type: 'AUDIT_LOG_EXPORT',
                entity_type: 'audit',
                description: `Exported ${logs.length} audit logs`,
                new_value: JSON.stringify(filters),
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);
            res.send(buffer);
        } catch (error) {
            logger.error('Error exporting audit logs:', error);
            req.flash('error_msg', req.t('common:errors.export_failed'));
            res.redirect('/audit');
        }
    }
    
    // Get statistics (AJAX)
    static async getStats(req, res) {
        try {
            const { start_date, end_date } = req.query;
            
            const startDate = start_date ? moment(start_date).toDate() : moment().subtract(7, 'days').toDate();
            const endDate = end_date ? moment(end_date).toDate() : moment().toDate();
            
            // Get action statistics
            const actionStats = await AuditLog.getActionStatistics(startDate, endDate);
            
            // Get user activity statistics
            const userStats = await AuditLog.getUserStatistics(startDate, endDate);
            
            // Get entity statistics
            const entityStats = await AuditLog.getEntityStatistics(startDate, endDate);
            
            res.json({
                success: true,
                data: {
                    actionStats,
                    userStats,
                    entityStats,
                    dateRange: {
                        start: moment(startDate).format('YYYY-MM-DD'),
                        end: moment(endDate).format('YYYY-MM-DD')
                    }
                }
            });
        } catch (error) {
            logger.error('Error getting audit statistics:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.load_failed')
            });
        }
    }
    
    // Cleanup old logs (Admin only)
    static async cleanup(req, res) {
        try {
            const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90;
            const deletedCount = await AuditLog.cleanup(retentionDays);
            
            // Log the cleanup action
            await AuditLog.create({
                admin_id: req.session.user.admin_id,
                action_type: 'AUDIT_LOG_CLEANUP',
                entity_type: 'audit',
                description: `Cleaned up ${deletedCount} audit logs older than ${retentionDays} days`,
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
            
            res.json({
                success: true,
                message: req.t('audit:messages.cleanup_success', { count: deletedCount })
            });
        } catch (error) {
            logger.error('Error cleaning up audit logs:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.operation_failed')
            });
        }
    }
}

module.exports = AuditController;