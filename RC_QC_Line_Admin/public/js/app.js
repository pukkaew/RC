// RC QC Admin Dashboard - Main JavaScript

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('RC QC Admin Dashboard initialized');
});

// Image preview function
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Format bytes to human readable
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Copy to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            Swal.fire({
                icon: 'success',
                title: 'Copied!',
                text: 'Text copied to clipboard',
                timer: 1500,
                showConfirmButton: false
            });
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            Swal.fire({
                icon: 'success',
                title: 'Copied!',
                text: 'Text copied to clipboard',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (err) {
            console.error('Failed to copy:', err);
        }
        
        document.body.removeChild(textArea);
    }
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

// Image lazy loading
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Initialize lazy loading
if ('IntersectionObserver' in window) {
    lazyLoadImages();
}

// Handle image selection for bulk operations
class ImageSelector {
    constructor() {
        this.selectedImages = new Set();
        this.selectAllCheckbox = document.getElementById('selectAll');
        this.imageCheckboxes = document.querySelectorAll('.image-checkbox');
        this.selectedCount = document.getElementById('selectedCount');
        this.bulkActions = document.getElementById('bulkActions');
        
        this.init();
    }
    
    init() {
        // Select all handler
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                this.imageCheckboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                    if (isChecked) {
                        this.selectedImages.add(checkbox.value);
                    } else {
                        this.selectedImages.delete(checkbox.value);
                    }
                });
                this.updateUI();
            });
        }
        
        // Individual checkbox handlers
        this.imageCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedImages.add(e.target.value);
                } else {
                    this.selectedImages.delete(e.target.value);
                }
                this.updateUI();
            });
        });
    }
    
    updateUI() {
        // Update selected count
        if (this.selectedCount) {
            this.selectedCount.textContent = this.selectedImages.size;
        }
        
        // Show/hide bulk actions
        if (this.bulkActions) {
            if (this.selectedImages.size > 0) {
                this.bulkActions.classList.remove('hidden');
            } else {
                this.bulkActions.classList.add('hidden');
            }
        }
        
        // Update select all checkbox state
        if (this.selectAllCheckbox) {
            if (this.selectedImages.size === 0) {
                this.selectAllCheckbox.checked = false;
                this.selectAllCheckbox.indeterminate = false;
            } else if (this.selectedImages.size === this.imageCheckboxes.length) {
                this.selectAllCheckbox.checked = true;
                this.selectAllCheckbox.indeterminate = false;
            } else {
                this.selectAllCheckbox.checked = false;
                this.selectAllCheckbox.indeterminate = true;
            }
        }
    }
    
    getSelectedIds() {
        return Array.from(this.selectedImages);
    }
}

// Initialize image selector if on image management page
if (document.querySelector('.image-checkbox')) {
    window.imageSelector = new ImageSelector();
}

// Handle bulk delete
function bulkDeleteImages() {
    const selectedIds = window.imageSelector.getSelectedIds();
    
    if (selectedIds.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'No Selection',
            text: 'Please select at least one image'
        });
        return;
    }
    
    Swal.fire({
        title: 'Delete Images?',
        text: `Are you sure you want to delete ${selectedIds.length} image(s)?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete them!'
    }).then((result) => {
        if (result.isConfirmed) {
            Utils.showLoading('Deleting images...');
            
            $.ajax({
                url: '/images/bulk-delete',
                method: 'POST',
                data: { imageIds: selectedIds },
                success: function(response) {
                    Utils.hideLoading();
                    if (response.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: response.message,
                            timer: 2000
                        }).then(() => {
                            window.location.reload();
                        });
                    }
                },
                error: function(xhr) {
                    Utils.hideLoading();
                    Utils.error(xhr.responseJSON?.message || 'Delete failed');
                }
            });
        }
    });
}

// Handle bulk download
function bulkDownloadImages() {
    const selectedIds = window.imageSelector.getSelectedIds();
    
    if (selectedIds.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'No Selection',
            text: 'Please select at least one image'
        });
        return;
    }
    
    Utils.showLoading('Preparing download...');
    
    $.ajax({
        url: '/images/download-multiple',
        method: 'POST',
        data: { imageIds: selectedIds },
        success: function(response) {
            Utils.hideLoading();
            if (response.success && response.downloadUrl) {
                window.location.href = response.downloadUrl;
            }
        },
        error: function(xhr) {
            Utils.hideLoading();
            Utils.error(xhr.responseJSON?.message || 'Download failed');
        }
    });
}