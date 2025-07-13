// tests/unit/division.test.js
const Division = require('../../src/models/Division');
const { executeQuery, executeTransaction } = require('../../src/config/database');

// Mock the database module
jest.mock('../../src/config/database');

describe('Division Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all divisions with company and branch info', async () => {
            const mockDivisions = [
                {
                    division_code: 'IT',
                    division_name: 'ฝ่ายเทคโนโลยีสารสนเทศ',
                    company_code: 'ABC',
                    company_name: 'บริษัท เอบีซี จำกัด',
                    branch_code: 'ABC-HQ',
                    branch_name: 'สำนักงานใหญ่'
                }
            ];

            executeQuery.mockResolvedValue({
                recordset: mockDivisions
            });

            const result = await Division.findAll();

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('LEFT JOIN Branches b ON d.branch_code = b.branch_code'),
                {}
            );
            expect(result).toEqual(mockDivisions);
        });

        it('should handle divisions without branches', async () => {
            const mockDivisions = [
                {
                    division_code: 'HR',
                    division_name: 'ฝ่ายทรัพยากรบุคคล',
                    company_code: 'ABC',
                    branch_code: null,
                    branch_name: null
                }
            ];

            executeQuery.mockResolvedValue({
                recordset: mockDivisions
            });

            const result = await Division.findAll();

            expect(result[0].branch_code).toBeNull();
            expect(result[0].branch_name).toBeNull();
        });
    });

    describe('findByCompany', () => {
        it('should return all divisions for a company', async () => {
            executeQuery.mockResolvedValue({
                recordset: [
                    { division_code: 'IT', branch_code: 'ABC-HQ' },
                    { division_code: 'HR', branch_code: null }
                ]
            });

            const result = await Division.findByCompany('ABC');

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE d.company_code = @company_code'),
                { company_code: 'ABC' }
            );
            expect(result).toHaveLength(2);
        });
    });

    describe('findByBranch', () => {
        it('should return divisions for specific branch', async () => {
            executeQuery.mockResolvedValue({
                recordset: [
                    { division_code: 'IT-HQ', division_name: 'IT สำนักงานใหญ่' }
                ]
            });

            const result = await Division.findByBranch('ABC-HQ');

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE d.branch_code = @branch_code'),
                { branch_code: 'ABC-HQ' }
            );
        });
    });

    describe('create', () => {
        it('should create division with branch', async () => {
            const divisionData = {
                division_code: 'FIN',
                division_name: 'ฝ่ายการเงิน',
                company_code: 'ABC',
                branch_code: 'ABC-HQ'
            };

            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({ recordset: [divisionData] })
                };
                return await callback(mockRequest);
            });

            const result = await Division.create(divisionData, 'admin');

            expect(result).toEqual(divisionData);
        });

        it('should create division without branch (company-level)', async () => {
            const divisionData = {
                division_code: 'EXEC',
                division_name: 'ฝ่ายบริหาร',
                company_code: 'ABC',
                branch_code: null
            };

            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({ recordset: [divisionData] })
                };
                return await callback(mockRequest);
            });

            const result = await Division.create(divisionData, 'admin');

            expect(result.branch_code).toBeNull();
        });

        it('should validate company and branch relationship', async () => {
            const divisionData = {
                division_code: 'TEST',
                division_name: 'ทดสอบ',
                company_code: 'ABC',
                branch_code: 'XYZ-HQ' // Wrong company
            };

            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn().mockRejectedValue({
                        number: 547,
                        message: 'Foreign key constraint violation'
                    })
                };
                return await callback(mockRequest);
            });

            await expect(
                Division.create(divisionData, 'admin')
            ).rejects.toThrow('Branch does not belong to the specified company');
        });
    });

    describe('update', () => {
        it('should update division successfully', async () => {
            const updateData = {
                division_name: 'ฝ่ายไอทีและดิจิทัล'
            };

            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({ rowsAffected: [1] })
                        .mockResolvedValueOnce({ recordset: [updateData] })
                };
                return await callback(mockRequest);
            });

            const result = await Division.update('IT', updateData, 'admin');

            expect(result).toMatchObject(updateData);
        });
    });

    describe('moveToBranch', () => {
        it('should move division to another branch', async () => {
            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({ 
                            recordset: [{ company_code: 'ABC' }]
                        }) // Get division info
                        .mockResolvedValueOnce({
                            recordset: [{ company_code: 'ABC' }]
                        }) // Validate branch
                        .mockResolvedValueOnce({ rowsAffected: [1] }) // UPDATE
                        .mockResolvedValueOnce({
                            recordset: [{ branch_code: 'ABC-02' }]
                        })
                };
                return await callback(mockRequest);
            });

            const result = await Division.moveToBranch('IT', 'ABC-02', 'admin');

            expect(result.branch_code).toBe('ABC-02');
        });

        it('should prevent moving to branch of different company', async () => {
            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({
                            recordset: [{ company_code: 'ABC' }]
                        })
                        .mockResolvedValueOnce({
                            recordset: [{ company_code: 'XYZ' }]
                        })
                };
                return await callback(mockRequest);
            });

            await expect(
                Division.moveToBranch('IT', 'XYZ-HQ', 'admin')
            ).rejects.toThrow('Branch belongs to different company');
        });

        it('should allow moving to null branch (company-level)', async () => {
            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({
                            recordset: [{ company_code: 'ABC' }]
                        })
                        .mockResolvedValueOnce({ rowsAffected: [1] })
                        .mockResolvedValueOnce({
                            recordset: [{ branch_code: null }]
                        })
                };
                return await callback(mockRequest);
            });

            const result = await Division.moveToBranch('IT', null, 'admin');

            expect(result.branch_code).toBeNull();
        });
    });

    describe('delete', () => {
        it('should prevent deletion if departments exist', async () => {
            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({
                            recordset: [{ department_count: 5 }]
                        })
                };
                return await callback(mockRequest);
            });

            await expect(
                Division.delete('IT', 'admin')
            ).rejects.toThrow('Cannot delete division with existing departments');
        });

        it('should soft delete division without departments', async () => {
            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({
                            recordset: [{ department_count: 0 }]
                        })
                        .mockResolvedValueOnce({ rowsAffected: [1] })
                        .mockResolvedValueOnce({
                            recordset: [{ is_active: false }]
                        })
                };
                return await callback(mockRequest);
            });

            const result = await Division.delete('OLD', 'admin');

            expect(result.is_active).toBe(false);
        });
    });

    describe('findPaginated', () => {
        it('should support complex filtering', async () => {
            executeQuery.mockResolvedValue({
                recordset: [
                    {
                        division_code: 'IT',
                        division_name: 'ไอที',
                        total_count: 3
                    }
                ]
            });

            const result = await Division.findPaginated(1, 10, {
                company_code: 'ABC',
                branch_code: 'ABC-HQ',
                search: 'ไอที',
                is_active: true
            });

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('AND d.company_code = @company_code'),
                expect.objectContaining({
                    company_code: 'ABC',
                    branch_code: 'ABC-HQ',
                    search: '%ไอที%'
                })
            );
        });
    });

    describe('getStatistics', () => {
        it('should return division statistics', async () => {
            const mockStats = {
                total_divisions: 25,
                active_divisions: 20,
                inactive_divisions: 5,
                divisions_with_branch: 18,
                company_level_divisions: 7
            };

            executeQuery.mockResolvedValue({
                recordset: [mockStats]
            });

            const result = await Division.getStatistics();

            expect(result).toEqual(mockStats);
        });
    });

    describe('getDepartmentCount', () => {
        it('should count departments in division', async () => {
            executeQuery.mockResolvedValue({
                recordset: [{ count: 10 }]
            });

            const result = await Division.getDepartmentCount('IT');

            expect(result).toBe(10);
        });
    });

    describe('validateDivisionData', () => {
        it('should validate required fields', () => {
            expect(() => {
                Division.validateDivisionData({});
            }).toThrow('Division code is required');

            expect(() => {
                Division.validateDivisionData({
                    division_code: 'TEST',
                    division_name: 'Test'
                });
            }).toThrow('Company code is required');
        });

        it('should validate code format', () => {
            expect(() => {
                Division.validateDivisionData({
                    division_code: 'TEST-123',
                    division_name: 'Test',
                    company_code: 'ABC'
                });
            }).toThrow('Division code can only contain letters and numbers');
        });
    });
});

describe('Division Model - Business Rules', () => {
    it('should handle cascading status changes', async () => {
        executeTransaction.mockImplementation(async (callback) => {
            const mockRequest = {
                input: jest.fn().mockReturnThis(),
                query: jest.fn()
                    .mockResolvedValueOnce({ recordset: [{ is_active: true }] })
                    .mockResolvedValueOnce({ rowsAffected: [5] }) // Update departments
                    .mockResolvedValueOnce({ rowsAffected: [1] }) // Update division
                    .mockResolvedValueOnce({ recordset: [{ is_active: false }] })
            };
            return await callback(mockRequest);
        });

        const result = await Division.updateStatus('IT', 'admin');

        expect(result.is_active).toBe(false);
    });

    it('should get organization hierarchy', async () => {
        executeQuery.mockResolvedValue({
            recordset: [{
                division_code: 'IT',
                division_name: 'ฝ่ายไอที',
                company_code: 'ABC',
                company_name: 'บริษัท เอบีซี จำกัด',
                branch_code: 'ABC-HQ',
                branch_name: 'สำนักงานใหญ่',
                departments: [
                    { department_code: 'IT-DEV', department_name: 'พัฒนาระบบ' },
                    { department_code: 'IT-INFRA', department_name: 'โครงสร้างพื้นฐาน' }
                ]
            }]
        });

        const result = await Division.getHierarchy('IT');

        expect(result.departments).toHaveLength(2);
    });
});