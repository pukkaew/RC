// Path: /public/js/main.js

// Flash message auto-hide
document.addEventListener('DOMContentLoaded', function() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.transition = 'opacity 0.5s ease-out';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    });
});

// Mobile menu toggle
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', function() {
        mobileMenu.classList.toggle('hidden');
    });
}

// Form validation enhancement
const forms = document.querySelectorAll('form[method="post"]');
forms.forEach(form => {
    form.addEventListener('submit', function(e) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('border-red-500');
                field.classList.remove('border-gray-300');
                
                // Add error message if not exists
                if (!field.nextElementSibling || !field.nextElementSibling.classList.contains('form-error')) {
                    const error = document.createElement('p');
                    error.classList.add('form-error');
                    error.textContent = 'This field is required';
                    field.parentNode.insertBefore(error, field.nextSibling);
                }
            } else {
                field.classList.remove('border-red-500');
                field.classList.add('border-gray-300');
                
                // Remove error message if exists
                if (field.nextElementSibling && field.nextElementSibling.classList.contains('form-error')) {
                    field.nextElementSibling.remove();
                }
            }
        });
        
        if (!isValid) {
            e.preventDefault();
        }
    });
});

// Auto-uppercase inputs
const uppercaseInputs = document.querySelectorAll('input.uppercase');
uppercaseInputs.forEach(input => {
    input.addEventListener('input', function(e) {
        e.target.value = e.target.value.toUpperCase();
    });
});

// Confirm dialog for destructive actions
function confirmAction(message) {
    return confirm(message || 'Are you sure you want to perform this action?');
}

// Table row click handler
const tableRows = document.querySelectorAll('tbody tr[data-href]');
tableRows.forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', function(e) {
        if (!e.target.closest('a') && !e.target.closest('button')) {
            window.location.href = row.dataset.href;
        }
    });
});

// Search debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Live search functionality
const searchInputs = document.querySelectorAll('input[type="search"], input[name="search"]');
searchInputs.forEach(input => {
    const form = input.closest('form');
    if (form && input.dataset.liveSearch !== 'false') {
        const debouncedSubmit = debounce(() => form.submit(), 500);
        input.addEventListener('input', debouncedSubmit);
    }
});

// Copy to clipboard functionality
function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.classList.add('text-success-600');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('text-success-600');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Format dates to locale string
const dateElements = document.querySelectorAll('[data-date]');
dateElements.forEach(el => {
    const date = new Date(el.dataset.date);
    el.textContent = date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Tooltips initialization
const tooltipElements = document.querySelectorAll('[title]');
tooltipElements.forEach(el => {
    el.classList.add('cursor-help');
});

// Print functionality
function printPage() {
    window.print();
}

// Export table to CSV
function exportTableToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    let csv = [];
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
        const cols = row.querySelectorAll('td, th');
        const rowData = Array.from(cols)
            .filter(col => !col.classList.contains('no-export'))
            .map(col => '"' + col.textContent.trim().replace(/"/g, '""') + '"');
        csv.push(rowData.join(','));
    });
    
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
    } else {
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Add loading state to forms
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function() {
            const submitButtons = form.querySelectorAll('button[type="submit"]');
            submitButtons.forEach(button => {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>' + button.textContent;
            });
        });
    });
});