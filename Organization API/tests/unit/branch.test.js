// tests/unit/branch.test.js
const Branch = require('../../src/models/Branch');
const { executeQuery, executeTransaction } = require('../../src/config/database');

// Mock the database module
jest.mock('../../src/config/database');

describe('Branch Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all branches with company info', async () => {
            const mockBranches = [
                {
                    branch_code: 'ABC-HQ',
                    branch_name: 'สำนักงานใหญ่',
                    company_code: 'ABC',
                    company_name: 'บริษัท เอบีซี จำกัด',
                    is_headquarters: true
                }
            ];

            executeQuery.mockResolvedValue({
                recordset: mockBranches
            });

            const result = await Branch.findAll();

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('JOIN Companies c ON b.company_code = c.company_code'),
                {}
            );
            expect(result).toEqual(mockBranches);
        });

        it('should filter by company code', async () => {
            executeQuery.mockResolvedValue({ recordset: [] });

            await Branch.findAll({ company_code: 'ABC' });

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('AND b.company_code = @company_code'),
                { company_code: 'ABC' }
            );
        });

        it('should filter by headquarters status', async () => {
            executeQuery.mockResolvedValue({ recordset: [] });

            await Branch.findAll({ is_headquarters: true });

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('AND b.is_headquarters = @is_headquarters'),
                { is_headquarters: true }
            );
        });
    });

    describe('findByCompany', () => {
        it('should return all branches for a company', async () => {
            const mockBranches = [
                { branch_code: 'ABC-HQ', is_headquarters: true },
                { branch_code: 'ABC-01', is_headquarters: false }
            ];

            executeQuery.mockResolvedValue({
                recordset: mockBranches
            });

            const result = await Branch.findByCompany('ABC');

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE b.company_code = @company_code'),
                { company_code: 'ABC' }
            );
            expect(result).toHaveLength(2);
        });
    });

    describe('create', () => {
        it('should create new branch successfully', async () => {
            const branchData = {
                branch_code: 'ABC-02',
                branch_name: 'สาขา 2',
                company_code: 'ABC',
                is_headquarters: false,
                address: '123 ถนนทดสอบ'
            };

            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({ recordset: [{ has_hq: 0 }] }) // Check HQ
                        .mockResolvedValueOnce({ recordset: [branchData] }) // INSERT
                };
                return await callback(mockRequest);
            });

            const result = await Branch.create(branchData, 'admin');

            expect(result).toEqual(branchData);
        });

        it('should prevent multiple headquarters for same company', async () => {
            const branchData = {
                branch_code: 'ABC-03',
                company_code: 'ABC',
                is_headquarters: true
            };

            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({ recordset: [{ has_hq: 1 }] }) // Already has HQ
                };
                return await callback(mockRequest);
            });

            await expect(
                Branch.create(branchData, 'admin')
            ).rejects.toThrow('Company already has a headquarters branch');
        });

        it('should set first branch as headquarters automatically', async () => {
            const branchData = {
                branch_code: 'XYZ-01',
                branch_name: 'สาขาแรก',
                company_code: 'XYZ',
                is_headquarters: false
            };

            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({ recordset: [{ has_hq: 0 }] }) // No HQ
                        .mockResolvedValueOnce({
                            recordset: [{
                                ...branchData,
                                is_headquarters: true // Auto set as HQ
                            }]
                        })
                };
                return await callback(mockRequest);
            });

            const result = await Branch.create(branchData, 'admin');

            expect(result.is_headquarters).toBe(true);
        });
    });

    describe('update', () => {
        it('should update branch successfully', async () => {
            const updateData = {
                branch_name: 'สาขาอัพเดท',
                address: 'ที่อยู่ใหม่'
            };

            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({ rowsAffected: [1] }) // UPDATE
                        .mockResolvedValueOnce({ recordset: [updateData] }) // SELECT
                };
                return await callback(mockRequest);
            });

            const result = await Branch.update('ABC-01', updateData, 'admin');

            expect(result).toMatchObject(updateData);
        });

        it('should handle headquarters transfer', async () => {
            const updateData = {
                is_headquarters: true
            };

            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({ 
                            recordset: [{ company_code: 'ABC' }]
                        }) // Get branch info
                        .mockResolvedValueOnce({ rowsAffected: [1] }) // Remove old HQ
                        .mockResolvedValueOnce({ rowsAffected: [1] }) // UPDATE
                        .mockResolvedValueOnce({ recordset: [updateData] }) // SELECT
                };
                return await callback(mockRequest);
            });

            const result = await Branch.update('ABC-02', updateData, 'admin');

            expect(result.is_headquarters).toBe(true);
        });
    });

    describe('delete', () => {
        it('should prevent deleting headquarters branch', async () => {
            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({
                            recordset: [{ is_headquarters: true }]
                        })
                };
                return await callback(mockRequest);
            });

            await expect(
                Branch.delete('ABC-HQ', 'admin')
            ).rejects.toThrow('Cannot delete headquarters branch');
        });

        it('should soft delete non-headquarters branch', async () => {
            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({
                            recordset: [{ is_headquarters: false }]
                        })
                        .mockResolvedValueOnce({ rowsAffected: [1] })
                        .mockResolvedValueOnce({
                            recordset: [{ is_active: false }]
                        })
                };
                return await callback(mockRequest);
            });

            const result = await Branch.delete('ABC-01', 'admin');

            expect(result.is_active).toBe(false);
        });
    });

    describe('findPaginated', () => {
        it('should return paginated results with filters', async () => {
            const mockBranches = [
                {
                    branch_code: 'ABC-HQ',
                    branch_name: 'สำนักงานใหญ่',
                    total_count: 5
                }
            ];

            executeQuery.mockResolvedValue({
                recordset: mockBranches
            });

            const result = await Branch.findPaginated(1, 10, {
                company_code: 'ABC',
                is_headquarters: true
            });

            expect(result).toEqual({
                data: [{
                    branch_code: 'ABC-HQ',
                    branch_name: 'สำนักงานใหญ่'
                }],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 5,
                    pages: 1
                }
            });
        });
    });

    describe('getStatistics', () => {
        it('should return branch statistics', async () => {
            const mockStats = {
                total_branches: 50,
                headquarters_count: 10,
                regular_branches: 40,
                active_branches: 45,
                inactive_branches: 5
            };

            executeQuery.mockResolvedValue({
                recordset: [mockStats]
            });

            const result = await Branch.getStatistics();

            expect(result).toEqual(mockStats);
        });
    });

    describe('exists', () => {
        it('should check if branch exists', async () => {
            executeQuery.mockResolvedValue({
                recordset: [{ exists: 1 }]
            });

            const result = await Branch.exists('ABC-HQ');

            expect(result).toBe(true);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT CASE WHEN EXISTS'),
                { branch_code: 'ABC-HQ' }
            );
        });
    });

    describe('validateBranchData', () => {
        it('should validate required fields', () => {
            expect(() => {
                Branch.validateBranchData({});
            }).toThrow('Branch code is required');

            expect(() => {
                Branch.validateBranchData({
                    branch_code: 'TEST'
                });
            }).toThrow('Branch name is required');

            expect(() => {
                Branch.validateBranchData({
                    branch_code: 'TEST',
                    branch_name: 'Test Branch'
                });
            }).toThrow('Company code is required');
        });

        it('should validate field lengths', () => {
            expect(() => {
                Branch.validateBranchData({
                    branch_code: 'A'.repeat(21),
                    branch_name: 'Test',
                    company_code: 'ABC'
                });
            }).toThrow('Branch code must not exceed 20 characters');
        });

        it('should validate phone number format', () => {
            expect(() => {
                Branch.validateBranchData({
                    branch_code: 'TEST',
                    branch_name: 'Test',
                    company_code: 'ABC',
                    phone: '123'
                });
            }).toThrow('Invalid phone number format');
        });
    });
});

describe('Branch Model - Complex Scenarios', () => {
    it('should handle division reassignment when branch is deleted', async () => {
        executeTransaction.mockImplementation(async (callback) => {
            const mockRequest = {
                input: jest.fn().mockReturnThis(),
                query: jest.fn()
                    .mockResolvedValueOnce({ recordset: [{ is_headquarters: false }] })
                    .mockResolvedValueOnce({ rowsAffected: [5] }) // Reassign divisions
                    .mockResolvedValueOnce({ rowsAffected: [1] }) // Delete branch
                    .mockResolvedValueOnce({ recordset: [{ is_active: false }] })
            };
            return await callback(mockRequest);
        });

        const result = await Branch.delete('ABC-01', 'admin');

        expect(result.is_active).toBe(false);
    });

    it('should count associated divisions and departments', async () => {
        executeQuery.mockResolvedValue({
            recordset: [{
                branch_code: 'ABC-HQ',
                branch_name: 'สำนักงานใหญ่',
                division_count: 5,
                department_count: 20
            }]
        });

        const result = await Branch.findByCodeWithStats('ABC-HQ');

        expect(result.division_count).toBe(5);
        expect(result.department_count).toBe(20);
    });
});