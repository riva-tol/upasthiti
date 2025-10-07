document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. CONFIG & INITIALIZATION
    // =========================================================================

    const firebaseConfig = {
        apiKey: "AIzaSyCEvz2o1Axp4c-YZjnE383n0BsUNajSh5A",
        authDomain: "attendance-rivatol.firebaseapp.com",
        databaseURL: "https://attendance-rivatol-default-rtdb.firebaseio.com",
        projectId: "attendance-rivatol",
        storageBucket: "attendance-rivatol.appspot.com",
        messagingSenderId: "975043014376",
        appId: "1:975043014376:web:4c5a7091c38e4b4d9c235d"
    };
    
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const studentsRef = db.ref('students');

    // =========================================================================
    // 2. STATE VARIABLES
    // =========================================================================
    
    const STUDENT_COLORS = {
        '--dark-raisin': '#360f02',
        '--gold': '#F6AA1C',
        '--burgundy': '#621708',
        '--burnt-orange': '#BC3908'
    };
    const COLOR_NAMES = Object.keys(STUDENT_COLORS);

    let students = [];
    let currentStudentIndex = null;
    let currentDate = new Date();
    let clickedDateStr = '';

    // =========================================================================
    // 3. DOM ELEMENT SELECTORS
    // =========================================================================

    // --- Main App Selectors ---
    const addStudentBtn = document.getElementById('add-student-btn');
    const studentsPage = document.getElementById('students-page');
    const detailsPage = document.getElementById('details-page');
    const studentWheelContainer = document.getElementById('student-wheel-container');
    const studentWheel = document.getElementById('student-wheel');
    const selectedStudentHeader = document.getElementById('selected-student-header');
    const deleteStudentBtn = document.getElementById('delete-student-btn');
    const backToStudentsBtn = document.getElementById('back-to-students-btn');

    // --- Calendar & Months Selectors ---
    const monthsContainer = document.getElementById('months-container');
    const calendarContainer = document.getElementById('calendar-container');
    const monthYearLabel = document.getElementById('month-year-label');
    const calendarDatesGrid = document.getElementById('calendar-dates-grid');
    const backToMonthsBtn = document.getElementById('back-to-months-btn');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    
    // --- Attendance Modal Selectors ---
    const attendanceModal = document.getElementById('attendance-modal');
    const modalDateLabel = document.getElementById('modal-date-label');
    const showAddViewBtn = document.getElementById('show-add-view-btn');
    const showListViewBtn = document.getElementById('show-list-view-btn');
    const addEntryView = document.getElementById('add-entry-view');
    const viewEntriesView = document.getElementById('view-entries-view');
    const dailyEntriesList = document.getElementById('daily-entries-list');
    const hoursInput = document.getElementById('hours-input');
    const timeRangeInput = document.getElementById('time-range-input');
    const saveAttendanceBtn = document.getElementById('save-attendance-btn');
    const cancelAttendanceBtn = document.getElementById('cancel-attendance-btn');
    
    // --- Report & PDF Selectors ---
    const generateReportBtn = document.getElementById('generate-report-btn');
    const reportModal = document.getElementById('report-modal');
    const closeReportBtn = document.getElementById('close-report-btn');
    const reportTitle = document.getElementById('report-title');
    const reportTableContainer = document.getElementById('report-table-container');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');

    // =========================================================================
    // 4. HELPER & UTILITY FUNCTIONS
    // =========================================================================

    /** Returns the ordinal suffix for a day number (e.g., 1st, 2nd, 3rd). */
    function getOrdinalSuffix(day) {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    }

    /** Checks if a hex color is dark to determine if text should be light or dark. */
    function isColorDark(hexColor) {
        const rgb = parseInt(hexColor.substring(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
    }

    /** Saves the current 'students' array to the Firebase Realtime Database. */
    function saveData() {
        studentsRef.set(students).catch(error => console.error("Firebase write failed: ", error));
    }

    /** Hides all pages and shows the specified page. */
    function showPage(pageToShow) {
        [studentsPage, detailsPage].forEach(page => page.classList.toggle('hidden', page !== pageToShow));
    }

    // =========================================================================
    // 5. CORE APP FUNCTIONS
    // =========================================================================

    /** Applies a simple scaling animation to student tabs on scroll. */
    function updateWheelAnimation() {
        const containerCenter = studentWheelContainer.offsetWidth / 2;
        const scrollLeft = studentWheelContainer.scrollLeft;
        document.querySelectorAll('.student-tab').forEach(tab => {
            const tabCenter = tab.offsetLeft - scrollLeft + tab.offsetWidth / 2;
            const distanceFromCenter = tabCenter - containerCenter;
            const scale = 1 - Math.abs(distanceFromCenter / containerCenter) * 0.3;
            tab.style.transform = `scale(${Math.max(0.7, scale)})`;
            tab.style.opacity = '1';
        });
    }

    /** Renders the student tabs in the main wheel view. */
    function renderStudentTabs() {
        studentWheel.innerHTML = '';
        if (!students) return;
        students.forEach((student, index) => {
            if (!student) return;
            const tab = document.createElement('div');
            tab.className = 'student-tab';
            tab.textContent = student.name;
            const colorName = COLOR_NAMES[index % COLOR_NAMES.length];
            const colorHex = STUDENT_COLORS[colorName];
            tab.style.backgroundColor = `var(${colorName})`;
            tab.style.color = isColorDark(colorHex) ? '#f0f0f0' : '#2c2c2c';
            tab.dataset.index = index;
            tab.addEventListener('click', handleStudentTabClick);
            studentWheel.appendChild(tab);
        });
        setTimeout(updateWheelAnimation, 0);
    }

    /** Handles the click event on a student tab, animating it and showing the details page. */
    function handleStudentTabClick(event) {
        currentStudentIndex = parseInt(event.currentTarget.dataset.index);
        currentDate = new Date();
        const clickedTab = event.currentTarget;
        const startRect = clickedTab.getBoundingClientRect();
        const movingTab = clickedTab.cloneNode(true);
        movingTab.style.color = clickedTab.style.color;
        selectedStudentHeader.innerHTML = '';
        selectedStudentHeader.appendChild(movingTab);
        const endRect = movingTab.getBoundingClientRect();
        const dx = startRect.left - endRect.left;
        const dy = startRect.top - endRect.top;
        movingTab.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
            movingTab.style.transition = 'transform 0.5s ease-in-out';
            movingTab.style.transform = 'translate(0, 0)';
        });
        populateMonths();
        showPage(detailsPage);
        calendarContainer.style.display = 'none';
        monthsContainer.style.display = 'grid';
    }

    /** Populates the months view with buttons for each month of the current year. */
    function populateMonths() {
        monthsContainer.innerHTML = '';
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const year = currentDate.getFullYear();
        const studentData = students[currentStudentIndex]?.attendance || {};
        monthNames.forEach((month, index) => {
            const btn = document.createElement('button');
            btn.className = 'month-btn';
            btn.textContent = month;
            btn.addEventListener('click', () => { currentDate = new Date(year, index, 1); showCalendar(); });
            let totalMonthHours = 0;
            const daysInMonth = new Date(year, index + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(index + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                if (studentData[dateStr]?.length > 0) {
                    totalMonthHours += studentData[dateStr].reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
                }
            }
            if (totalMonthHours > 0) {
                const totalBadge = document.createElement('span');
                totalBadge.className = 'month-total-hours';
                totalBadge.classList.add(totalMonthHours < 10 ? 'single-digit' : 'double-digit');
                totalBadge.textContent = totalMonthHours;
                btn.appendChild(totalBadge);
            }
            monthsContainer.appendChild(btn);
        });
    }

    /** Hides the months view and shows the calendar view. */
    function showCalendar() {
        monthsContainer.style.display = 'none';
        calendarContainer.style.display = 'flex';
        renderCalendar();
    }

    /** Renders the calendar grid for the currently selected month and year. */
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthYearLabel.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
        calendarDatesGrid.innerHTML = '';
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDayOfMonth; i++) { calendarDatesGrid.appendChild(document.createElement('div')); }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateSquare = document.createElement('div');
            dateSquare.className = 'date-square';
            dateSquare.textContent = day;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dateSquare.dataset.date = dateStr;
            const studentData = students[currentStudentIndex]?.attendance || {};
            if (studentData[dateStr]) {
                const totalHours = studentData[dateStr].reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
                if (totalHours > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'total-hours-badge';
                    badge.textContent = totalHours;
                    dateSquare.appendChild(badge);
                }
            }
            dateSquare.addEventListener('click', () => openAttendanceModal(dateStr));
            calendarDatesGrid.appendChild(dateSquare);
        }
    }

    /** Opens the attendance modal for a specific date. */
    function openAttendanceModal(dateStr) {
        clickedDateStr = dateStr;
        const date = new Date(dateStr + 'T00:00:00');
        modalDateLabel.innerHTML = `${date.getDate()}<sup>${getOrdinalSuffix(date.getDate())}</sup> ${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
        dailyEntriesList.innerHTML = '';
        const entries = students[currentStudentIndex]?.attendance?.[dateStr];
        if (entries?.length > 0) {
            entries.forEach((entry, index) => {
                const entryContainer = document.createElement('div');
                entryContainer.className = 'attendance-entry';
                entryContainer.innerHTML = `<span><strong>${entry.hours} hours</strong> (${entry.timeRange || 'No time given'})</span>`;

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = "DELETE";
                deleteBtn.className = "delete-btn";


                deleteBtn.addEventListener('click', () => deleteEntry(dateStr, index));
                entryContainer.appendChild(deleteBtn);
                dailyEntriesList.appendChild(entryContainer);
            });
            showListViewBtn.click();
        } else {
            dailyEntriesList.innerHTML = '<p>No entries for this date.</p>';
            showAddViewBtn.click();
        }
        hoursInput.value = '';
        timeRangeInput.value = '';
        attendanceModal.style.display = 'flex';
    }

    /** Deletes a specific attendance entry for a student on a given date. */
    function deleteEntry(dateStr, entryIndex) {
        const entries = students[currentStudentIndex].attendance[dateStr];
        entries.splice(entryIndex, 1);
        if (entries.length === 0) {
            delete students[currentStudentIndex].attendance[dateStr];
        }
        saveData();
        renderCalendar();
        populateMonths();
        openAttendanceModal(dateStr);
    }

    /** Closes the attendance modal. */
    function closeAttendanceModal() {
        attendanceModal.style.display = 'none';
    }

    /** Handles the 'Enter' key press on modal inputs to save the entry. */
    function handleEnterKey(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveAttendanceBtn.click();
        }
    }
    
    // =========================================================================
    // 6. REPORTING & PDF FUNCTIONS
    // =========================================================================

    /** Collects all attendance for the current month and displays it in a table. */
    function generateMonthlyReport() {
        if (currentStudentIndex === null) return;
        const student = students[currentStudentIndex];
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthName = currentDate.toLocaleString('default', { month: 'long' });
        reportTitle.textContent = `Report for ${student.name} - ${monthName} ${year}`;
        const reportEntries = [];
        let totalHours = 0;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (student.attendance && student.attendance[dateStr]) {
                student.attendance[dateStr].forEach(entry => {
                    const formattedDate = `${day}/${month + 1}/${year}`;
                    reportEntries.push({ date: formattedDate, hours: parseFloat(entry.hours), time: entry.timeRange || 'N/A' });
                    totalHours += parseFloat(entry.hours);
                });
            }
        }
        if (reportEntries.length === 0) {
            reportTableContainer.innerHTML = '<p>No attendance entries for this month.</p>';
        } else {
            let tableHTML = `<table class="report-table"><thead><tr><th>Date</th><th>Hours</th><th>Time</th></tr></thead><tbody>`;
            reportEntries.forEach(entry => {
                tableHTML += `<tr><td>${entry.date}</td><td>${entry.hours}</td><td>${entry.time}</td></tr>`;
            });
            tableHTML += `</tbody><tfoot><tr><td><strong>Total</strong></td><td><strong>${totalHours}</strong></td><td></td></tr></tfoot></table>`;
            reportTableContainer.innerHTML = tableHTML;
        }
        reportModal.style.display = 'flex';
    }

    /** Downloads the content of the report modal as a styled PDF. */
    function downloadReportAsPDF() {
        const reportContent = document.querySelector('.report-modal-content');
        const studentName = students[currentStudentIndex].name.replace(' ', '_');
        const monthName = currentDate.toLocaleString('default', { month: 'long' });
        const year = currentDate.getFullYear();
        const fileName = `Report_${studentName}_${monthName}_${year}.pdf`;
        const options = { margin: 0.5, filename: fileName, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
        html2pdf().set(options).from(reportContent).save();
    }

    // =========================================================================
    // 7. EVENT LISTENERS
    // =========================================================================

    addStudentBtn.addEventListener('click', () => {
        const newName = prompt("Enter the new student's name:");
        if (newName && newName.trim()) {
            students.push({ name: newName.trim(), attendance: {} });
            saveData();
        }
    });

    deleteStudentBtn.addEventListener('click', () => {
        if (currentStudentIndex === null) return;
        const studentName = students[currentStudentIndex].name;
        if (confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
            students.splice(currentStudentIndex, 1);
            saveData();
            showPage(studentsPage);
        }
    });

    studentWheelContainer.addEventListener('scroll', updateWheelAnimation);
    backToStudentsBtn.addEventListener('click', () => showPage(studentsPage));
    selectedStudentHeader.addEventListener('click', () => showPage(studentsPage));
    backToMonthsBtn.addEventListener('click', () => { monthsContainer.style.display = 'grid'; calendarContainer.style.display = 'none'; });
    prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    
    // --- Attendance Modal Listeners ---
    showAddViewBtn.addEventListener('click', () => { addEntryView.classList.remove('hidden'); viewEntriesView.classList.add('hidden'); showAddViewBtn.classList.add('active'); showListViewBtn.classList.remove('active'); saveAttendanceBtn.style.display = 'inline-block'; });
    showListViewBtn.addEventListener('click', () => { addEntryView.classList.add('hidden'); viewEntriesView.classList.remove('hidden'); showAddViewBtn.classList.remove('active'); showListViewBtn.classList.add('active'); saveAttendanceBtn.style.display = 'none'; });
    cancelAttendanceBtn.addEventListener('click', closeAttendanceModal);
    attendanceModal.addEventListener('click', (event) => { if (event.target === attendanceModal) { closeAttendanceModal(); } });
    
    saveAttendanceBtn.addEventListener('click', () => {
        const hours = hoursInput.value;
        const timeRange = timeRangeInput.value;
        if (!hours || isNaN(hours)) { alert("Please enter a valid number for hours."); return; }
        if (!students[currentStudentIndex].attendance) { students[currentStudentIndex].attendance = {}; }
        const studentData = students[currentStudentIndex].attendance;
        if (!studentData[clickedDateStr]) { studentData[clickedDateStr] = []; }
        studentData[clickedDateStr].push({ hours: parseFloat(hours), timeRange });
        saveData();
        closeAttendanceModal();
        renderCalendar();
        populateMonths();
    });

    hoursInput.addEventListener('keydown', handleEnterKey);
    timeRangeInput.addEventListener('keydown', handleEnterKey);
    
    // --- Report Modal Listeners ---
    generateReportBtn.addEventListener('click', generateMonthlyReport);
    closeReportBtn.addEventListener('click', () => { reportModal.style.display = 'none'; });
    reportModal.addEventListener('click', (event) => { if (event.target === reportModal) { reportModal.style.display = 'none'; } });
    downloadPdfBtn.addEventListener('click', downloadReportAsPDF);

    // =========================================================================
    // 8. APP INITIALIZATION
    // =========================================================================

    /** Fetches initial data from Firebase and starts the app. */
    function initializeApp() {
        studentsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            students = data || [{ name: "First Student", attendance: {} }];
            renderStudentTabs();
        }, (error) => {
            console.error("Firebase read failed: " + error.code);
            alert("Could not connect to the database. Please check your connection and refresh.");
        });
    }

    initializeApp();

});
