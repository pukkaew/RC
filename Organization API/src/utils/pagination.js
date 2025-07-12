// Pagination utility functions

// Get pagination parameters from request
const getPaginationParams = (req) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || parseInt(process.env.DEFAULT_PAGE_SIZE) || 20;
    const maxLimit = parseInt(process.env.MAX_PAGE_SIZE) || 100;
    
    // Ensure limit doesn't exceed maximum
    const finalLimit = Math.min(limit, maxLimit);
    
    return {
        page: Math.max(1, page),
        limit: finalLimit,
        offset: (Math.max(1, page) - 1) * finalLimit
    };
};

// Calculate pagination metadata
const calculatePagination = (total, page, limit) => {
    const pages = Math.ceil(total / limit);
    
    return {
        page: page,
        limit: limit,
        total: total,
        pages: pages,
        hasNext: page < pages,
        hasPrev: page > 1,
        nextPage: page < pages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
    };
};

// Generate pagination links
const generatePaginationLinks = (baseUrl, currentPage, totalPages, queryParams = {}) => {
    const links = {
        first: null,
        prev: null,
        next: null,
        last: null
    };
    
    // Remove page from query params
    const params = { ...queryParams };
    delete params.page;
    
    // Build query string
    const buildUrl = (page) => {
        const urlParams = new URLSearchParams({ ...params, page });
        return `${baseUrl}?${urlParams.toString()}`;
    };
    
    // Generate links
    if (totalPages > 0) {
        links.first = buildUrl(1);
        links.last = buildUrl(totalPages);
        
        if (currentPage > 1) {
            links.prev = buildUrl(currentPage - 1);
        }
        
        if (currentPage < totalPages) {
            links.next = buildUrl(currentPage + 1);
        }
    }
    
    return links;
};

// Get sort parameters from request
const getSortParams = (req, defaultField = 'created_date', defaultOrder = 'DESC') => {
    const sort = req.query.sort || defaultField;
    const order = (req.query.order || defaultOrder).toUpperCase();
    
    return {
        field: sort,
        order: order === 'DESC' ? 'DESC' : 'ASC'
    };
};

// Build ORDER BY clause for SQL
const buildOrderByClause = (sortField, sortOrder, fieldMapping = {}) => {
    // Map field names if mapping provided
    const actualField = fieldMapping[sortField] || sortField;
    
    // Validate order
    const order = sortOrder === 'DESC' ? 'DESC' : 'ASC';
    
    return `ORDER BY ${actualField} ${order}`;
};

// Get filter parameters from request
const getFilterParams = (req, allowedFilters = []) => {
    const filters = {};
    
    allowedFilters.forEach(filter => {
        if (req.query[filter] !== undefined) {
            filters[filter] = req.query[filter];
        }
    });
    
    return filters;
};

// Build WHERE clause conditions
const buildWhereConditions = (filters, fieldMapping = {}) => {
    const conditions = [];
    const params = {};
    
    Object.entries(filters).forEach(([key, value]) => {
        const field = fieldMapping[key] || key;
        
        if (value !== undefined && value !== null && value !== '') {
            if (typeof value === 'string' && value.includes('%')) {
                // LIKE query
                conditions.push(`${field} LIKE @${key}`);
                params[key] = value;
            } else if (Array.isArray(value)) {
                // IN query
                conditions.push(`${field} IN (${value.map((_, i) => `@${key}${i}`).join(', ')})`);
                value.forEach((v, i) => {
                    params[`${key}${i}`] = v;
                });
            } else {
                // Exact match
                conditions.push(`${field} = @${key}`);
                params[key] = value;
            }
        }
    });
    
    return {
        whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        params: params
    };
};

// Pagination helper for views
const getPaginationData = (currentPage, totalPages, maxVisible = 5) => {
    const pages = [];
    let startPage = 1;
    let endPage = totalPages;
    
    if (totalPages > maxVisible) {
        const halfVisible = Math.floor(maxVisible / 2);
        
        if (currentPage <= halfVisible) {
            endPage = maxVisible;
        } else if (currentPage + halfVisible >= totalPages) {
            startPage = totalPages - maxVisible + 1;
        } else {
            startPage = currentPage - halfVisible;
            endPage = currentPage + halfVisible;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        pages.push({
            number: i,
            active: i === currentPage
        });
    }
    
    return {
        pages,
        showFirst: startPage > 1,
        showLast: endPage < totalPages,
        showPrev: currentPage > 1,
        showNext: currentPage < totalPages
    };
};

module.exports = {
    getPaginationParams,
    calculatePagination,
    generatePaginationLinks,
    getSortParams,
    buildOrderByClause,
    getFilterParams,
    buildWhereConditions,
    getPaginationData
};