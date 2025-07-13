// tests/unit/company.test.js
const Company = require('../../src/models/Company');
const { executeQuery, executeTransaction } = require('../../src/config/database');

// Mock the database module
jest.mock('../../src/config/database');

describe('Company Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all active companies when no filters provided', async () => {
            const mockCompanies = [
                { company_code: 'ABC', company_name_th: 'บริษัท เอบีซี จำกัด' },
                { company_code: 'XYZ', company_name_th: 'บริษัท เอ็กซ์วายแซด จำกัด' }
            ];

            executeQuery.mockResolvedValue({
                recordset: mockCompanies
            });

            const result = await Company.findAll();

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE c.is_active = 1'),
                {}
            );
            expect(result).toEqual(mockCompanies);
        });

        it('should apply search filter when provided', async () => {
            const mockCompanies = [
                { company_code: 'ABC', company_name_th: 'บริษัท เอบีซี จำกัด' }
            ];

            executeQuery.mockResolvedValue({
                recordset: mockCompanies
            });

            const result = await Company.findAll({ search: 'ABC' });

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('AND (c.company_code LIKE @search'),
                { search: '%ABC%' }
            );
            expect(result).toEqual(mockCompanies);
        });

        it('should include inactive companies when is_active is false', async () => {
            executeQuery.mockResolvedValue({
                recordset: []
            });

            await Company.findAll({ is_active: false });

            expect(executeQuery).toHaveBeenCalledWith(
                expect.not.stringContaining('WHERE c.is_active = 1'),
                {}
            );
        });
    });

    describe('findByCode', () => {
        it('should return company when exists', async () => {
            const mockCompany = {
                company_code: 'ABC',
                company_name_th: 'บริษัท เอบีซี จำกัด',
                company_name_en: 'ABC Company Limited'
            };

            executeQuery.mockResolvedValue({
                recordset: [mockCompany]
            });

            const result = await Company.findByCode('ABC');

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE c.company_code = @company_code'),
                { company_code: 'ABC' }
            );
            expect(result).toEqual(mockCompany);
        });

        it('should return null when company not found', async () => {
            executeQuery.mockResolvedValue({
                recordset: []
            });

            const result = await Company.findByCode('NOTEXIST');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should create new company successfully', async () => {
            const companyData = {
                company_code: 'NEW',
                company_name_th: 'บริษัทใหม่ จำกัด',
                company_name_en: 'New Company Limited',
                tax_id: '0105558123456',
                is_active: true
            };

            const mockResult = {
                company_code: 'NEW',
                company_name_th: 'บริษัทใหม่ จำกัด'
            };

            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn().mockResolvedValue({
                        recordset: [mockResult]
                    })
                };
                return await callback(mockRequest);
            });

            const result = await Company.create(companyData, 'admin');

            expect(result).toEqual(mockResult);
        });

        it('should throw error when duplicate company code', async () => {
            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn().mockRejectedValue({
                        number: 2627,
                        message: 'Violation of UNIQUE KEY constraint'
                    })
                };
                return await callback(mockRequest);
            });

            await expect(
                Company.create({ company_code: 'DUP' }, 'admin')
            ).rejects.toThrow('Company code already exists');
        });
    });

    describe('update', () => {
        it('should update company successfully', async () => {
            const updateData = {
                company_name_th: 'บริษัทอัพเดท จำกัด',
                company_name_en: 'Updated Company Limited'
            };

            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({ rowsAffected: [1] }) // UPDATE
                        .mockResolvedValueOnce({ recordset: [{ ...updateData }] }) // SELECT
                };
                return await callback(mockRequest);
            });

            const result = await Company.update('ABC', updateData, 'admin');

            expect(result).toMatchObject(updateData);
        });

        it('should throw error when company not found', async () => {
            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn().mockResolvedValue({ rowsAffected: [0] })
                };
                return await callback(mockRequest);
            });

            await expect(
                Company.update('NOTEXIST', {}, 'admin')
            ).rejects.toThrow('Company not found');
        });
    });

    describe('updateStatus', () => {
        it('should toggle company status', async () => {
            executeTransaction.mockImplementation(async (callback) => {
                const mockRequest = {
                    input: jest.fn().mockReturnThis(),
                    query: jest.fn()
                        .mockResolvedValueOnce({ recordset: [{ is_active: true }] }) // Current status
                        .mockResolvedValueOnce({ rowsAffected: [1] }) // UPDATE
                        .mockResolvedValueOnce({ recordset: [{ is_active: false }] }) // New status
                };
                return await callback(mockRequest);
            });

            const result = await Company.updateStatus('ABC', 'admin');

            expect(result.is_active).toBe(false);
        });
    });

    describe('exists', () => {
        it('should return true when company exists', async () => {
            executeQuery.mockResolvedValue({
                recordset: [{ exists: 1 }]
            });

            const result = await Company.exists('ABC');

            expect(result).toBe(true);
        });

        it('should return false when company not exists', async () => {
            executeQuery.mockResolvedValue({
                recordset: [{ exists: 0 }]
            });

            const result = await Company.exists('NOTEXIST');

            expect(result).toBe(false);
        });
    });

    describe('findPaginated', () => {
        it('should return paginated results', async () => {
            const mockCompanies = [
                { company_code: 'ABC', company_name_th: 'บริษัท เอบีซี จำกัด' }
            ];

            executeQuery.mockResolvedValue({
                recordset: [
                    ...mockCompanies,
                    { total_count: 10 }
                ]
            });

            const result = await Company.findPaginated(1, 20);

            expect(result).toEqual({
                data: mockCompanies,
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 10,
                    pages: 1
                }
            });
        });

        it('should handle empty results', async () => {
            executeQuery.mockResolvedValue({
                recordset: []
            });

            const result = await Company.findPaginated(1, 20);

            expect(result).toEqual({
                data: [],
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    pages: 0
                }
            });
        });
    });

    describe('getStatistics', () => {
        it('should return company statistics', async () => {
            const mockStats = {
                total_companies: 10,
                active_companies: 8,
                inactive_companies: 2
            };

            executeQuery.mockResolvedValue({
                recordset: [mockStats]
            });

            const result = await Company.getStatistics();

            expect(result).toEqual(mockStats);
        });
    });

    describe('getAuditTrail', () => {
        it('should return audit history for company', async () => {
            const mockAudit = [
                {
                    action: 'UPDATE',
                    field_name: 'company_name_th',
                    old_value: 'บริษัทเก่า',
                    new_value: 'บริษัทใหม่',
                    modified_date: new Date()
                }
            ];

            executeQuery.mockResolvedValue({
                recordset: mockAudit
            });

            const result = await Company.getAuditTrail('ABC');

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE table_name = \'Companies\''),
                { company_code: 'ABC' }
            );
            expect(result).toEqual(mockAudit);
        });
    });
});

describe('Company Model - Database Error Handling', () => {
    it('should handle database connection errors', async () => {
        executeQuery.mockRejectedValue(new Error('Database connection failed'));

        await expect(Company.findAll()).rejects.toThrow('Database connection failed');
    });

    it('should handle SQL syntax errors', async () => {
        executeQuery.mockRejectedValue({
            number: 102,
            message: 'Incorrect syntax near WHERE'
        });

        await expect(Company.findAll()).rejects.toThrow('Database query error');
    });

    it('should handle foreign key constraint errors', async () => {
        executeTransaction.mockImplementation(async (callback) => {
            const mockRequest = {
                input: jest.fn().mockReturnThis(),
                query: jest.fn().mockRejectedValue({
                    number: 547,
                    message: 'The DELETE statement conflicted with the REFERENCE constraint'
                })
            };
            return await callback(mockRequest);
        });

        await expect(
            Company.delete('ABC', 'admin')
        ).rejects.toThrow('Cannot delete company with existing branches or divisions');
    });
});

describe('Company Model - Input Validation', () => {
    it('should validate required fields on create', async () => {
        await expect(
            Company.create({}, 'admin')
        ).rejects.toThrow('Company code is required');

        await expect(
            Company.create({ company_code: 'TEST' }, 'admin')
        ).rejects.toThrow('Company name (Thai) is required');
    });

    it('should validate field lengths', async () => {
        const longCode = 'A'.repeat(21);
        await expect(
            Company.create({ company_code: longCode }, 'admin')
        ).rejects.toThrow('Company code must not exceed 20 characters');
    });

    it('should validate tax ID format', async () => {
        await expect(
            Company.create({
                company_code: 'TEST',
                company_name_th: 'ทดสอบ',
                tax_id: '12345'
            }, 'admin')
        ).rejects.toThrow('Invalid tax ID format');
    });
});