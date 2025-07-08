const Lot = require('../models/Lot');
const Image = require('../models/Image');
const AdminUser = require('../models/AdminUser');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

class DashboardController {
    // Show dashboard
    static async index(req, res) {
        try {
            // Get statistics
            const stats = await Lot.getStatistics();
            
            // Get recent activity
            const recentActivity = await Lot.getRecentActivity(10);
            
            // Get upload statistics for last 7 days
            const uploadStats = await Image.getUploadStatistics(7);
            
            // Get active users count
            const activeUsersCount = await AdminUser.count({ is_active: true });
            
            // Format storage size
            const formatSize = (bytes) => {
                if (!bytes) return '0 B';
                const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(1024));
                return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
            };
            
            // Prepare chart data
            const chartLabels = [];
            const chartData = [];
            const today = moment().tz(process.env.TIMEZONE || 'Asia/Bangkok');
            
            for (let i = 6; i >= 0; i--) {
                const date = today.clone().subtract(i, 'days');
                chartLabels.push(date.format('DD/MM'));
                
                const dayData = uploadStats.find(stat => 
                    moment(stat.upload_date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
                );
                chartData.push(dayData ? dayData.count : 0);
            }
            
            res.render('dashboard/index', {
                title: req.t('dashboard:title'),
                stats: {
                    totalLots: stats.total_lots || 0,
                    totalImages: stats.total_images || 0,
                    imagesToday: stats.images_today || 0,
                    storageUsed: formatSize(stats.total_size || 0),
                    activeUsers: activeUsersCount
                },
                recentActivity,
                chartData: {
                    labels: chartLabels,
                    data: chartData
                },
                moment
            });
        } catch (error) {
            logger.error('Dashboard error:', error);
            res.status(500).render('errors/500');
        }
    }
    
    // Get dashboard statistics (AJAX)
    static async getStats(req, res) {
        try {
            const stats = await Lot.getStatistics();
            
            res.json({
                success: true,
                data: {
                    totalLots: stats.total_lots || 0,
                    totalImages: stats.total_images || 0,
                    imagesToday: stats.images_today || 0,
                    totalSize: stats.total_size || 0
                }
            });
        } catch (error) {
            logger.error('Get stats error:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.load_failed')
            });
        }
    }
    
    // Get recent activity (AJAX)
    static async getRecentActivity(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const recentActivity = await Lot.getRecentActivity(limit);
            
            res.json({
                success: true,
                data: recentActivity
            });
        } catch (error) {
            logger.error('Get recent activity error:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.load_failed')
            });
        }
    }
    
    // Get upload chart data (AJAX)
    static async getUploadChart(req, res) {
        try {
            const days = parseInt(req.query.days) || 7;
            const uploadStats = await Image.getUploadStatistics(days);
            
            const chartLabels = [];
            const chartData = [];
            const today = moment().tz(process.env.TIMEZONE || 'Asia/Bangkok');
            
            for (let i = days - 1; i >= 0; i--) {
                const date = today.clone().subtract(i, 'days');
                chartLabels.push(date.format('DD/MM'));
                
                const dayData = uploadStats.find(stat => 
                    moment(stat.upload_date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
                );
                chartData.push(dayData ? dayData.count : 0);
            }
            
            res.json({
                success: true,
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: req.t('dashboard:uploads_per_day'),
                        data: chartData,
                        backgroundColor: 'rgba(34, 197, 94, 0.2)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 2
                    }]
                }
            });
        } catch (error) {
            logger.error('Get upload chart error:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.load_failed')
            });
        }
    }
    
    // Get storage breakdown (AJAX)
    static async getStorageBreakdown(req, res) {
        try {
            const breakdown = await Image.getStorageBreakdown();
            
            const data = breakdown.map(item => ({
                lot_number: item.lot_number,
                size: item.total_size || 0,
                count: item.image_count || 0
            }));
            
            res.json({
                success: true,
                data: data.slice(0, 10) // Top 10 lots by storage
            });
        } catch (error) {
            logger.error('Get storage breakdown error:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.load_failed')
            });
        }
    }
    
    // System health check (AJAX)
    static async healthCheck(req, res) {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                database: 'connected'
            };
            
            // Test database connection
            try {
                await Lot.count();
            } catch (dbError) {
                health.database = 'disconnected';
                health.status = 'unhealthy';
            }
            
            res.json({
                success: true,
                data: health
            });
        } catch (error) {
            logger.error('Health check error:', error);
            res.status(500).json({
                success: false,
                message: 'System health check failed'
            });
        }
    }
}

module.exports = DashboardController;