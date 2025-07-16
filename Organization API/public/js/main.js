// Path: /public/js/main.js

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize form validations
    initializeFormValidations();
    
    // Initialize dynamic filters
    initializeDynamicFilters();
    
    // Initialize notification system
    initializeNotifications();
    
    // Auto-hide flash messages
    autoHideFlashMessages();
});

// Initialize tooltips
function initializeTooltips() {
    const tooltips = document.querySelectorAll('[title]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', function() {
            // Add tooltip styling via Tailwind classes
            this.classList.add('relative');
        });
    });
}

// Initialize form validations
function initializeFormValidations() {
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('border-red-500');
                    field.classList.remove('border-gray-300');
                    
                    // Show error message
                    let errorMsg = field.nextElementSibling;
                    if (!errorMsg || !errorMsg.classList.contains('error-message')) {
                        errorMsg = document.createElement('p');
                        errorMsg.className = 'error-message text-red-500 text-xs mt-1';
                        errorMsg.textContent = 'This field is required';
                        field.parentNode.insertBefore(errorMsg, field.nextSibling);
                    }
                } else {
                    field.classList.remove('border-red-500');
                    field.classList.add('border-gray-300');
                    
                    // Remove error message
                    const errorMsg = field.nextElementSibling;
                    if (errorMsg && errorMsg.classList.contains('error-message')) {
                        errorMsg.remove();
                    }
                }
            });
            
            if (!isValid) {
                e.preventDefault();
            }
        });
    });
}

// Initialize dynamic filters for dependent dropdowns
function initializeDynamicFilters() {
    // Company -> Branch filter dependency
    const companyFilter = document.getElementById('company_code');
    const branchFilter = document.getElementById('branch_code');
    
    if (companyFilter && branchFilter) {
        companyFilter.addEventListener('change', async function() {
            const companyCode = this.value;
            
            // Clear branch options
            branchFilter.innerHTML = '<option value="">Loading...</option>';
            
            if (!companyCode) {
                branchFilter.innerHTML = '<option value="">All Branches</option>';
                return;
            }
            
            try {
                // Fetch branches for selected company
                const response = await fetch(`/api/companies/${companyCode}/branches`);
                const branches = await response.json();
                
                // Rebuild options
                branchFilter.innerHTML = '<option value="">All Branches</option>';
                branches.forEach(branch => {
                    const option = document.createElement('option');
                    option.value = branch.branch_code;
                    option.textContent = branch.branch_name;
                    branchFilter.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading branches:', error);
                branchFilter.innerHTML = '<option value="">Error loading branches</option>';
            }
        });
    }
    
    // Division -> Department filter dependency
    const divisionFilter = document.getElementById('division_code');
    const departmentFilter = document.getElementById('department_code');
    
    if (divisionFilter && departmentFilter) {
        divisionFilter.addEventListener('change', async function() {
            const divisionCode = this.value;
            
            // Clear department options
            departmentFilter.innerHTML = '<option value="">Loading...</option>';
            
            if (!divisionCode) {
                departmentFilter.innerHTML = '<option value="">All Departments</option>';
                return;
            }
            
            try {
                // Fetch departments for selected division
                const response = await fetch(`/api/divisions/${divisionCode}/departments`);
                const departments = await response.json();
                
                // Rebuild options
                departmentFilter.innerHTML = '<option value="">All Departments</option>';
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.department_code;
                    option.textContent = dept.department_name;
                    departmentFilter.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading departments:', error);
                departmentFilter.innerHTML = '<option value="">Error loading departments</option>';
            }
        });
    }
}

// Initialize notification system
function initializeNotifications() {
    // Check for new notifications every 30 seconds
    if (window.location.pathname === '/') {
        setInterval(checkNotifications, 30000);
    }
}

async function checkNotifications() {
    try {
        const response = await fetch('/api/notifications/unread');
        const data = await response.json();
        
        const notificationBell = document.querySelector('.fa-bell').parentElement;
        const badge = notificationBell.querySelector('.absolute');
        
        if (data.count > 0) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

// Auto-hide flash messages after 5 seconds
function autoHideFlashMessages() {
    const flashMessages = document.querySelectorAll('.bg-green-50, .bg-red-50');
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.style.transition = 'opacity 0.5s ease-out';
            message.style.opacity = '0';
            setTimeout(() => message.remove(), 500);
        }, 5000);
    });
}

// Utility function for confirming destructive actions
window.confirmAction = function(message) {
    return confirm(message || 'Are you sure you want to perform this action?');
};

// Search functionality with debouncing
let searchTimeout;
const searchInputs = document.querySelectorAll('input[name="search"]');
searchInputs.forEach(input => {
    input.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const form = this.closest('form');
        
        searchTimeout = setTimeout(() => {
            // Add loading indicator
            this.classList.add('opacity-50');
            
            // Submit form
            form.submit();
        }, 500); // 500ms debounce
    });
});

// Table row click handler
const tableRows = document.querySelectorAll('tbody tr[data-href]');
tableRows.forEach(row => {
    row.classList.add('cursor-pointer');
    row.addEventListener('click', function(e) {
        // Don't navigate if clicking on a button or link
        if (e.target.closest('a, button, form')) return;
        
        window.location.href = this.dataset.href;
    });
});

// Enhanced form submission with loading states
const forms = document.querySelectorAll('form');
forms.forEach(form => {
    form.addEventListener('submit', function() {
        const submitButton = this.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        }
    });
});

// Copy to clipboard functionality for API keys
window.copyToClipboard = function(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.classList.add('text-green-600');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('text-green-600');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
};

// Export functionality
window.exportData = function(format) {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('export', format);
    window.location.href = currentUrl.toString();
};

// Print functionality with better styling
window.printPage = function() {
    window.print();
};