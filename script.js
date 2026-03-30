class StudentManager {
    constructor() {
        this.students = JSON.parse(localStorage.getItem('students')) || [];
        this.currentPage = 1;
        this.studentsPerPage = 10;
        this.filteredStudents = [...this.students];
        this.editingId = null;
        this.selectedStudents = [];
        this.currentTab = 'students';
        this.theme = localStorage.getItem('theme') || 'light';
        
        // Chart instances
        this.performanceChart = null;
        this.attendanceChart = null;
        this.gradeChart = null;
        
        this.init();
    }

    init() {
        this.setupTheme();
        this.bindEvents();
        this.populateClassFilter();
        this.render();
        this.updateStats();
        this.updateDashboard();
    }

    // ===== THEME SYSTEM =====
    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const btn = document.getElementById('themeToggle');
        if (this.theme === 'dark') {
            btn.innerHTML = '<i class="fas fa-sun"></i>';
            btn.title = 'Switch to Light Mode';
        } else {
            btn.innerHTML = '<i class="fas fa-moon"></i>';
            btn.title = 'Switch to Dark Mode';
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.theme);
        this.setupTheme();
        this.showToast(`Switched to ${this.theme === 'dark' ? 'Dark' : 'Light'} Mode`, 'success');
    }

    // ===== TOAST NOTIFICATIONS =====
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    bindEvents() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Form events
        document.getElementById('addBtn').addEventListener('click', () => this.openModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('studentForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Photo upload
        document.getElementById('photoUploadBtn').addEventListener('click', () => {
            document.getElementById('photoInput').click();
        });
        document.getElementById('photoInput').addEventListener('change', (e) => this.handlePhotoUpload(e));

        // Search & filters
        const searchInput = document.getElementById('searchInput');
        const searchBox = document.querySelector('.search-box');
        searchInput.addEventListener('input', (e) => this.searchStudents(e.target.value));
        searchInput.addEventListener('focus', () => searchBox.classList.add('focused'));
        searchInput.addEventListener('blur', () => searchBox.classList.remove('focused'));
        document.getElementById('filterToggle').addEventListener('click', () => this.toggleFilters());
        document.getElementById('classFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('resetFilters').addEventListener('click', () => this.resetFilters());

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Bulk actions
        document.getElementById('selectAllStudents').addEventListener('change', (e) => this.selectAllStudents(e.target.checked));
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => this.bulkDeleteStudents());

        // Table events with event delegation
        document.getElementById('studentsTableBody').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');
            const row = e.target.closest('tr');
            const checkbox = e.target.closest('input[type="checkbox"]');
            
            if (editBtn && row) {
                const studentId = row.dataset.studentId;
                this.editStudent(studentId);
            }
            
            if (deleteBtn && row) {
                const studentId = row.dataset.studentId;
                this.deleteStudent(studentId);
            }
            
            if (checkbox && row && checkbox !== document.getElementById('selectAllStudents')) {
                const studentId = row.dataset.studentId;
                if (checkbox.checked) {
                    this.selectedStudents.push(studentId);
                    row.classList.add('selected');
                } else {
                    this.selectedStudents = this.selectedStudents.filter(id => id !== studentId);
                    row.classList.remove('selected');
                }
                this.updateBulkActionButton();
            }
        });
    }

    toggleFilters() {
        const panel = document.getElementById('filtersPanel');
        panel.style.display = panel.style.display === 'none' ? 'grid' : 'none';
    }

    populateClassFilter() {
        const classes = [...new Set(this.students.map(s => s.class).filter(Boolean))];
        const classFilter = document.getElementById('classFilter');
        const currentValue = classFilter.value;
        classFilter.innerHTML = '<option value="">All Classes</option>';
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls;
            option.textContent = cls;
            classFilter.appendChild(option);
        });
        classFilter.value = currentValue;
    }

    applyFilters() {
        const classValue = document.getElementById('classFilter').value;
        const statusValue = document.getElementById('statusFilter').value;
        const searchValue = document.getElementById('searchInput').value.toLowerCase();

        this.filteredStudents = this.students.filter(student => {
            const matchClass = !classValue || student.class === classValue;
            const matchStatus = !statusValue || student.status === statusValue;
            const matchSearch = !searchValue || 
                student.name.toLowerCase().includes(searchValue) ||
                student.email.toLowerCase().includes(searchValue) ||
                student.rollNo.toLowerCase().includes(searchValue);
            return matchClass && matchStatus && matchSearch;
        });

        this.currentPage = 1;
        this.render();
    }

    resetFilters() {
        document.getElementById('classFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('searchInput').value = '';
        this.filteredStudents = [...this.students];
        this.currentPage = 1;
        this.selectedStudents = [];
        this.render();
        this.showToast('Filters reset', 'success');
    }

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        document.getElementById('studentsSection').style.display = tab === 'students' ? 'block' : 'none';
        document.getElementById('dashboardSection').style.display = tab === 'dashboard' ? 'block' : 'none';
        document.getElementById('performanceTab').style.display = tab === 'performance' ? 'block' : 'none';
        document.getElementById('attendanceTab').style.display = tab === 'attendance' ? 'block' : 'none';
        document.getElementById('filtersSection').style.display = tab === 'students' ? 'block' : 'none';

        // Render charts when performance tab is opened
        if (tab === 'performance') {
            setTimeout(() => this.renderPerformanceCharts(), 100);
        }
    }

    selectAllStudents(checked) {
        if (checked) {
            const visibleIds = this.getVisibleStudents().map(s => s.id);
            this.selectedStudents = visibleIds;
            document.querySelectorAll('#studentsTableBody tr').forEach(row => {
                row.classList.add('selected');
                const checkbox = row.querySelector('input[type="checkbox"]');
                if (checkbox) checkbox.checked = true;
            });
        } else {
            this.selectedStudents = [];
            document.querySelectorAll('#studentsTableBody tr').forEach(row => {
                row.classList.remove('selected');
                const checkbox = row.querySelector('input[type="checkbox"]');
                if (checkbox) checkbox.checked = false;
            });
        }
        this.updateBulkActionButton();
    }

    updateBulkActionButton() {
        const btn = document.getElementById('bulkDeleteBtn');
        if (this.selectedStudents.length > 0) {
            btn.style.display = 'inline-block';
            btn.textContent = `🗑️ Delete Selected (${this.selectedStudents.length})`;
        } else {
            btn.style.display = 'none';
        }
    }

    bulkDeleteStudents() {
        if (this.selectedStudents.length === 0) return;
        
        if (confirm(`Delete ${this.selectedStudents.length} student(s)? This action cannot be undone.`)) {
            this.students = this.students.filter(s => !this.selectedStudents.includes(s.id));
            this.filteredStudents = this.filteredStudents.filter(s => !this.selectedStudents.includes(s.id));
            this.selectedStudents = [];
            this.saveToStorage();
            this.render();
            this.updateStats();
            this.updateDashboard();
            document.getElementById('selectAllStudents').checked = false;
            this.showToast('Students deleted successfully', 'success');
        }
    }

    // ===== PHOTO HANDLING =====
    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const photoPreview = document.getElementById('photoPreview');
                photoPreview.innerHTML = `<img src="${event.target.result}" alt="Profile Photo">`;
                this.studentPhoto = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    // ===== MODAL HANDLING =====
    openModal(student = null) {
        const modal = document.getElementById('studentModal');
        const form = document.getElementById('studentForm');
        
        form.reset();
        document.getElementById('photoPreview').innerHTML = '<i class="fas fa-user-circle"></i>';
        this.studentPhoto = null;
        
        if (student) {
            document.getElementById('name').value = student.name || '';
            document.getElementById('email').value = student.email || '';
            document.getElementById('rollNo').value = student.rollNo || '';
            document.getElementById('phone').value = student.phone || '';
            document.getElementById('dob').value = student.dob || '';
            document.getElementById('gender').value = student.gender || '';
            document.getElementById('address').value = student.address || '';
            document.getElementById('parentName').value = student.parentName || '';
            document.getElementById('parentPhone').value = student.parentPhone || '';
            document.getElementById('className').value = student.class || '';
            document.getElementById('status').value = student.status || 'Active';
            
            if (student.photo) {
                document.getElementById('photoPreview').innerHTML = `<img src="${student.photo}" alt="Profile Photo">`;
                this.studentPhoto = student.photo;
            }
            
            document.getElementById('modalTitle').textContent = 'Edit Student';
            this.editingId = student.id;
        } else {
            document.getElementById('modalTitle').textContent = 'Add New Student';
            this.editingId = null;
        }
        
        modal.classList.add('active');
        document.getElementById('name').focus();
    }

    closeModal() {
        document.getElementById('studentModal').classList.remove('active');
        this.editingId = null;
        this.studentPhoto = null;
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const studentData = {
            id: this.editingId || Date.now().toString(),
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            rollNo: document.getElementById('rollNo').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            dob: document.getElementById('dob').value,
            gender: document.getElementById('gender').value,
            address: document.getElementById('address').value.trim(),
            parentName: document.getElementById('parentName').value.trim(),
            parentPhone: document.getElementById('parentPhone').value.trim(),
            class: document.getElementById('className').value.trim(),
            status: document.getElementById('status').value,
            photo: this.studentPhoto || null,
            createdAt: new Date().toISOString()
        };

        if (this.editingId) {
            const index = this.students.findIndex(s => s.id === this.editingId);
            if (index !== -1) {
                this.students[index] = { ...this.students[index], ...studentData };
            }
            this.showToast('Student updated successfully', 'success');
        } else {
            this.students.unshift(studentData);
            this.showToast('Student added successfully', 'success');
        }

        this.saveToStorage();
        this.populateClassFilter();
        this.filteredStudents = [...this.students];
        this.render();
        this.updateStats();
        this.updateDashboard();
        this.closeModal();
    }

    deleteStudent(id) {
        if (confirm('Are you sure you want to delete this student?')) {
            this.students = this.students.filter(student => student.id !== id);
            this.filteredStudents = this.filteredStudents.filter(student => student.id !== id);
            this.selectedStudents = this.selectedStudents.filter(sid => sid !== id);
            this.saveToStorage();
            this.render();
            this.updateStats();
            this.updateDashboard();
            this.showToast('Student deleted successfully', 'success');
        }
    }

    editStudent(id) {
        const student = this.students.find(s => s.id === id);
        if (student) {
            this.openModal(student);
        }
    }

    searchStudents(query) {
        this.applyFilters();
    }

    getVisibleStudents() {
        const startIndex = (this.currentPage - 1) * this.studentsPerPage;
        const endIndex = startIndex + this.studentsPerPage;
        return this.filteredStudents.slice(startIndex, endIndex);
    }

    getTotalPages() {
        return Math.ceil(this.filteredStudents.length / this.studentsPerPage);
    }

    goToPage(page) {
        if (page >= 1 && page <= this.getTotalPages()) {
            this.currentPage = page;
            this.render();
        }
    }

    saveToStorage() {
        localStorage.setItem('students', JSON.stringify(this.students));
    }

    updateStats() {
        const total = this.students.length;
        const active = this.students.filter(s => s.status === 'Active').length;
        const inactive = this.students.filter(s => s.status === 'Inactive').length;
        
        document.getElementById('totalStudents').textContent = total;
        document.getElementById('activeStudents').textContent = active;
        document.getElementById('inactiveStudents').textContent = inactive;
    }

    updateDashboard() {
        const total = this.students.length;
        const active = this.students.filter(s => s.status === 'Active').length;
        const inactive = this.students.filter(s => s.status === 'Inactive').length;
        const completionRate = total > 0 ? Math.round((active / total) * 100) : 0;
        
        document.getElementById('dashTotalStudents').textContent = total;
        document.getElementById('dashActiveStudents').textContent = active;
        document.getElementById('dashInactiveStudents').textContent = inactive;
        document.getElementById('dashCompletionRate').textContent = completionRate + '%';
    }

    render() {
        const tbody = document.getElementById('studentsTableBody');
        const emptyState = document.getElementById('emptyState');
        const pagination = document.getElementById('pagination');
        const visibleStudents = this.getVisibleStudents();

        if (this.filteredStudents.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.add('active');
            pagination.innerHTML = '';
            return;
        }

        emptyState.classList.remove('active');

        tbody.innerHTML = visibleStudents.map(student => `
            <tr data-student-id="${student.id}" class="${this.selectedStudents.includes(student.id) ? 'selected' : ''}">
                <td>
                    <input type="checkbox" ${this.selectedStudents.includes(student.id) ? 'checked' : ''}>
                </td>
                <td>
                    <div class="photo-preview" style="width:40px;height:40px;margin:0;border-radius:50%;flex-shrink:0;">
                        ${student.photo ? `<img src="${student.photo}" alt="${student.name}">` : '<i class="fas fa-user-circle" style="font-size:40px;"></i>'}
                    </div>
                </td>
                <td><strong>${this.escapeHtml(student.name)}</strong></td>
                <td>${this.escapeHtml(student.email || '-')}</td>
                <td><strong>${this.escapeHtml(student.rollNo)}</strong></td>
                <td>${this.escapeHtml(student.class || '-')}</td>
                <td>
                    <span class="status-badge status-${student.status.toLowerCase()}">
                        ${this.escapeHtml(student.status)}
                    </span>
                </td>
                <td>
                    <button class="action-btn edit-btn" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        this.renderPagination(pagination);
    }

    renderPagination(container) {
        const totalPages = this.getTotalPages();
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        paginationHTML += `
            <button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" title="Previous">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" title="Page ${i}">
                    ${i}
                </button>
            `;
        }

        paginationHTML += `
            <button class="pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}" title="Next">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        container.innerHTML = paginationHTML;
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.pagination-btn');
            if (!btn || btn.classList.contains('disabled')) return;
            
            const pageNum = parseInt(btn.textContent);
            if (!isNaN(pageNum)) {
                this.goToPage(pageNum);
            } else if (btn.innerHTML.includes('chevron-left')) {
                this.goToPage(this.currentPage - 1);
            } else if (btn.innerHTML.includes('chevron-right')) {
                this.goToPage(this.currentPage + 1);
            }
        });
    }

    renderPerformanceCharts() {
        const ctx1 = document.getElementById('performancePieChart')?.getContext('2d');
        const ctx2 = document.getElementById('attendancePieChart')?.getContext('2d');
        const ctx3 = document.getElementById('gradePieChart')?.getContext('2d');

        if (!ctx1 || !ctx2 || !ctx3) return;

        // Calculate data
        const total = this.students.length;
        const active = this.students.filter(s => s.status === 'Active').length;
        const inactive = this.students.filter(s => s.status === 'Inactive').length;
        
        // Attendance simulation
        const present = Math.ceil(total * 0.75);
        const absent = total - present;

        // Grade distribution simulation
        const excellent = Math.ceil(total * 0.2);
        const good = Math.ceil(total * 0.35);
        const average = Math.ceil(total * 0.3);
        const poor = total - excellent - good - average;

        // Colors
        const colors1 = ['#10b981', '#ef4444'];
        const colors2 = ['#3b82f6', '#f97316'];
        const colors3 = ['#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'];

        // Chart 1: Overall Performance
        if (this.performanceChart) this.performanceChart.destroy();
        this.performanceChart = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Inactive'],
                datasets: [{
                    data: [active, inactive],
                    backgroundColor: colors1,
                    borderColor: 'var(--bg-card)',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--text-primary)',
                            font: { size: 12, weight: 'bold' },
                            padding: 15,
                        }
                    }
                }
            }
        });

        // Chart 2: Attendance Distribution
        if (this.attendanceChart) this.attendanceChart.destroy();
        this.attendanceChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Absent'],
                datasets: [{
                    data: [present, absent],
                    backgroundColor: colors2,
                    borderColor: 'var(--bg-card)',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--text-primary)',
                            font: { size: 12, weight: 'bold' },
                            padding: 15,
                        }
                    }
                }
            }
        });

        // Chart 3: Grade Distribution
        if (this.gradeChart) this.gradeChart.destroy();
        this.gradeChart = new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: ['Excellent', 'Good', 'Average', 'Poor'],
                datasets: [{
                    data: [excellent, good, average, poor],
                    backgroundColor: colors3,
                    borderColor: 'var(--bg-card)',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--text-primary)',
                            font: { size: 12, weight: 'bold' },
                            padding: 15,
                        }
                    }
                }
            }
        });
    }

    escapeHtml(text) {
        const map = {'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#039;'};
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.studentManager = new StudentManager();
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.studentManager) {
        window.studentManager.closeModal();
    }
});