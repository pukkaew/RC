// Main JavaScript file for Organization Structure Management System

// Document ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initializeTooltips();
    initializeModals();
    initializeAjaxForms();
    initializeDynamicSelects();
    initializeConfirmDialogs();
    initializeFlashMessages();
    initializeDataTables();
});

// Initialize tooltips
function initializeTooltips() {
    // Add tooltip functionality if needed
}

// Initialize modals
function initializeModals() {
    // Close modal when clicking backdrop
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', function() {
            closeModal(this.dataset.modal);
        });
    });
}

// Show modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    const backdrop = document.querySelector(`[data-modal="${modalId}"]`);
    if (modal && backdrop) {
        modal.classList.remove('hidden');
        backdrop.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const backdrop = document.querySelector(`[data-modal="${modalId}"]`);
    if (modal && backdrop) {
        modal.classList.add('hidden');
        backdrop.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Initialize AJAX forms
function initializeAjaxForms() {
    document.querySelectorAll('form[data-ajax="true"]').forEach(form => {
        form.addEventListener('submit', handleAjaxFormSubmit);
    });
}

// Handle AJAX form submission
async function handleAjaxFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const method = form.method || 'POST';
    const action = form.action;
    
    try {
        showLoading();
        
        const response = await fetch(action, {
            method: method,
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('success', data.message);
            if (data.redirect) {
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 1000);
            }
        } else {
            showAlert('error', data.message || 'An error occurred');
        }
    } catch (error) {
        showAlert('error', 'Network error occurred');
    } finally {
        hideLoading();
    }
}

// Initialize dynamic selects (dependent dropdowns)
function initializeDynamicSelects() {
    // Company -> Branch select
    const companySelect = document.getElementById('company_code');
    const branchSelect = document.getElementById('branch_code');
    
    if (companySelect && branchSelect) {
        companySelect.addEventListener('change', async function() {
            const companyCode = this.value;
            
            if (!companyCode) {
                branchSelect.innerHTML = '<option value="">Select a company first</option>';
                branchSelect.disabled = true;
                return;
            }
            
            try {
                showLoadingOnSelect(branchSelect);
                
                const response = await fetch(`/divisions/ajax/company/${companyCode}/branches`);
                const data = await response.json();
                
                if (data.success) {
                    updateSelectOptions(branchSelect, data.data, 'branch_code', 'branch_name', 'No branch (Direct to company)');
                    branchSelect.disabled = false;
                }
            } catch (error) {
                console.error('Error loading branches:', error);
                showAlert('error', 'Failed to load branches');
            }
        });
    }
    
    // Similar for Division -> Department select
    const divisionSelect = document.getElementById('division_code');
    
    if (companySelect && divisionSelect) {
        companySelect.addEventListener('change', async function() {
            const companyCode = this.value;
            
            if (!companyCode) {
                divisionSelect.innerHTML = '<option value="">Select a company first</option>';
                divisionSelect.disabled = true;
                return;
            }
            
            try {
                showLoadingOnSelect(divisionSelect);
                
                const response = await fetch(`/departments/ajax/company/${companyCode}/divisions`);
                const data = await response.json();
                
                if (data.success) {
                    updateSelectOptions(divisionSelect, data.data, 'division_code', 'division_name');
                    divisionSelect.disabled = false;
                }
            } catch (error) {
                console.error('Error loading divisions:', error);
                showAlert('error', 'Failed to load divisions');
            }
        });
    }
}

// Update select options
function updateSelectOptions(selectElement, options, valueField, textField, emptyText = 'Select an option') {
    selectElement.innerHTML = `<option value="">${emptyText}</option>`;
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option[valueField];
        optionElement.textContent = option[textField];
        if (option.is_active === false) {
            optionElement.textContent += ' (Inactive)';
            optionElement.disabled = true;
        }
        selectElement.appendChild(optionElement);
    });
}

// Show loading on select
function showLoadingOnSelect(selectElement) {
    selectElement.innerHTML = '<option value="">Loading...</option>';
    selectElement.disabled = true;
}

// Initialize confirm dialogs
function initializeConfirmDialogs() {
    document.querySelectorAll('[data-confirm]').forEach(element => {
        element.addEventListener('click', function(e) {
            const message = this.dataset.confirm || 'Are you sure?';
            if (!confirm(message)) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    });
}

// Initialize flash messages auto-hide
function initializeFlashMessages() {
    document.querySelectorAll('.alert').forEach(alert => {
        setTimeout(() => {
            fadeOut(alert);
        }, 5000);
    });
}

// Initialize data tables with search
function initializeDataTables() {
    document.querySelectorAll('[data-table-search]').forEach(input => {
        input.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tableId = this.dataset.tableSearch;
            const table = document.getElementById(tableId);
            
            if (table) {
                const rows = table.querySelectorAll('tbody tr');
                
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            }
        });
    });
}

// Show loading overlay
function showLoading() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.classList.remove('hidden');
    }
}

// Hide loading overlay
function hideLoading() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.classList.add('hidden');
    }
}

// Show alert message
function showAlert(type, message) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alertClass = type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700';
    
    const alert = document.createElement('div');
    alert.className = `mb-4 ${alertClass} px-4 py-3 rounded relative fade-in`;
    alert.innerHTML = `
        <span class="block sm:inline">${message}</span>
        <span class="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onclick="this.parentElement.remove();">
            <i class="fas fa-times"></i>
        </span>
    `;
    
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        fadeOut(alert);
    }, 5000);
}

// Fade out element
function fadeOut(element) {
    element.classList.add('fade-out');
    setTimeout(() => {
        element.remove();
    }, 300);
}

// Copy to clipboard
function copyToClipboard(text, buttonElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = '<i class="fas fa-check"></i> Copied!';
        buttonElement.classList.add('bg-green-600');
        
        setTimeout(() => {
            buttonElement.innerHTML = originalText;
            buttonElement.classList.remove('bg-green-600');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        showAlert('error', 'Failed to copy to clipboard');
    });
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Debounce function
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

// Export functions for use in other scripts
window.OrgStructure = {
    showModal,
    closeModal,
    showAlert,
    showLoading,
    hideLoading,
    copyToClipboard,
    formatNumber,
    debounce
};