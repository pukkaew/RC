// Path: /src/services/organizationService.js
const { executeQuery, executeTransaction } = require('../config/database');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

class OrganizationService {
    /**
     * Get organization statistics
     */
    static async getOrganizationStats() {
        const cacheKey = 'org:stats:overall';
        const cached = await cache.get(cacheKey);
        if (cached) return cached;

        try {
            const query = `
                SELECT 
                    (SELECT COUNT(*) FROM Companies WHERE is_active = 1) as totalCompanies,
                    (SELECT COUNT(*) FROM Branches WHERE is_active = 1) as totalBranches,
                    (SELECT COUNT(*) FROM Divisions WHERE is_active = 1) as totalDivisions,
                    (SELECT COUNT(*) FROM Departments WHERE is_active = 1) as totalDepartments,
                    (SELECT COUNT(*) FROM Divisions WHERE is_active = 1) as active_divisions,
                    (SELECT COUNT(*) FROM Branches WHERE is_headquarters = 1 AND is_active = 1) as headquarters_count
            `;

            const result = await executeQuery(query);
            const stats = result.recordset[0];

            await cache.set(cacheKey, stats, 1800); // Cache for 30 minutes
            return stats;
        } catch (error) {
            logger.error('Error getting organization stats:', error);
            return {
                totalCompanies: 0,
                totalBranches: 0,
                totalDivisions: 0,
                totalDepartments: 0,
                active_divisions: 0,
                headquarters_count: 0
            };
        }
    }

    /**
     * Get recent activities
     */
    static async getRecentActivities(limit = 10) {
        try {
            // Simulated activities - in production, this would come from an audit log table
            const activities = [
                {
                    id: 1,
                    description: 'เพิ่มบริษัทใหม่ <span class="font-medium">บริษัท รุ่งชัย เทคโนโลยี จำกัด</span>',
                    user: 'admin@ruxchai.com',
                    time: '5 นาทีที่แล้ว',
                    icon: 'building',
                    color: 'ruxchai-blue',
                    status: 'สำเร็จ',
                    statusColor: 'ruxchai-green'
                },
                {
                    id: 2,
                    description: 'เปิดสาขาใหม่ <span class="font-medium">สาขาชลบุรี</span> ภายใต้ ABC Company',
                    user: 'manager@abc.com',
                    time: '1 ชั่วโมงที่แล้ว',
                    icon: 'code-branch',
                    color: 'ruxchai-green',
                    status: 'สำเร็จ',
                    statusColor: 'ruxchai-green'
                },
                {
                    id: 3,
                    description: 'API Key <span class="font-mono bg-gray-100 px-1 rounded">prod_xxx_2024</span> ถูกสร้างขึ้น',
                    user: 'สำหรับ Mobile App',
                    time: '2 ชั่วโมงที่แล้ว',
                    icon: 'key',
                    color: 'purple',
                    status: 'API',
                    statusColor: 'gray'
                },
                {
                    id: 4,
                    description: 'ปรับโครงสร้าง <span class="font-medium">ฝ่ายการตลาด</span> ย้ายไปอยู่ภายใต้สาขาใหม่',
                    user: 'hr@xyz.com',
                    time: '3 ชั่วโมงที่แล้ว',
                    icon: 'sitemap',
                    color: 'orange',
                    status: 'อัพเดท',
                    statusColor: 'orange'
                }
            ];

            return activities.slice(0, limit);
        } catch (error) {
            logger.error('Error getting recent activities:', error);
            return [];
        }
    }

    /**
     * Get organization chart data
     */
    static async getOrganizationChartData() {
        try {
            const stats = await this.getOrganizationStats();
            return {
                labels: ['บริษัท', 'สาขา', 'ฝ่าย', 'แผนก'],
                values: [
                    stats.totalCompanies,
                    stats.totalBranches,
                    stats.totalDivisions,
                    stats.totalDepartments
                ]
            };
        } catch (error) {
            logger.error('Error getting organization chart data:', error);
            return { labels: [], values: [] };
        }
    }

    /**
     * Get full organization tree
     */
    static async getOrganizationTree(companyCode = null) {
        try {
            let query = `
                SELECT 
                    c.company_code,
                    c.company_name_th,
                    c.company_name_en,
                    c.is_active as company_active,
                    b.branch_code,
                    b.branch_name,
                    b.is_headquarters,
                    b.is_active as branch_active,
                    d.division_code,
                    d.division_name,
                    d.is_active as division_active,
                    dp.department_code,
                    dp.department_name,
                    dp.is_active as department_active
                FROM Companies c
                LEFT JOIN Branches b ON c.company_code = b.company_code
                LEFT JOIN Divisions d ON c.company_code = d.company_code 
                    AND (b.branch_code IS NULL OR b.branch_code = d.branch_code)
                LEFT JOIN Departments dp ON d.division_code = dp.division_code
                WHERE c.is_active = 1
            `;

            const inputs = {};
            if (companyCode) {
                query += ' AND c.company_code = @company_code';
                inputs.company_code = companyCode;
            }

            query += ' ORDER BY c.company_code, b.branch_code, d.division_code, dp.department_code';

            const result = await executeQuery(query, inputs);
            return this.transformToTree(result.recordset);
        } catch (error) {
            logger.error('Error getting organization tree:', error);
            return [];
        }
    }

    /**
     * Transform flat data to hierarchical tree structure
     */
    static transformToTree(flatData) {
        const tree = {};

        flatData.forEach(row => {
            // Company level
            if (!tree[row.company_code]) {
                tree[row.company_code] = {
                    company_code: row.company_code,
                    company_name_th: row.company_name_th,
                    company_name_en: row.company_name_en,
                    is_active: row.company_active,
                    branches: {},
                    divisions: {} // For divisions without branches
                };
            }

            const company = tree[row.company_code];

            // Branch level
            if (row.branch_code) {
                if (!company.branches[row.branch_code]) {
                    company.branches[row.branch_code] = {
                        branch_code: row.branch_code,
                        branch_name: row.branch_name,
                        is_headquarters: row.is_headquarters,
                        is_active: row.branch_active,
                        divisions: {}
                    };
                }
            }

            // Division level
            if (row.division_code) {
                const divisionContainer = row.branch_code 
                    ? company.branches[row.branch_code].divisions 
                    : company.divisions;

                if (!divisionContainer[row.division_code]) {
                    divisionContainer[row.division_code] = {
                        division_code: row.division_code,
                        division_name: row.division_name,
                        is_active: row.division_active,
                        departments: {}
                    };
                }

                // Department level
                if (row.department_code) {
                    divisionContainer[row.division_code].departments[row.department_code] = {
                        department_code: row.department_code,
                        department_name: row.department_name,
                        is_active: row.department_active
                    };
                }
            }
        });

        // Convert objects to arrays
        return Object.values(tree).map(company => ({
            ...company,
            branches: Object.values(company.branches).map(branch => ({
                ...branch,
                divisions: Object.values(branch.divisions).map(division => ({
                    ...division,
                    departments: Object.values(division.departments)
                }))
            })),
            divisions: Object.values(company.divisions).map(division => ({
                ...division,
                departments: Object.values(division.departments)
            }))
        }));
    }

    /**
     * Clone organization structure
     */
    static async cloneStructure(sourceCompanyCode, targetCompanyCode, options = {}) {
        const {
            includeBranches = true,
            includeDivisions = true,
            includeDepartments = true,
            createdBy = 'system'
        } = options;

        try {
            return await executeTransaction(async (transaction) => {
                const results = {
                    branches: 0,
                    divisions: 0,
                    departments: 0
                };

                // Implementation would go here...
                logger.info(`Structure cloned from ${sourceCompanyCode} to ${targetCompanyCode}`);
                return results;
            });
        } catch (error) {
            logger.error('Error cloning structure:', error);
            throw error;
        }
    }
}

module.exports = OrganizationService;