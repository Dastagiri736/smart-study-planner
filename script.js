const STORAGE_KEY = 'studyPlanner_data';
const AUTH_KEY = 'studyPlanner_auth';
let tasks = [];
let currentUser = null;
let currentCalendarDate = new Date(); 
const plannerContainer = document.getElementById('planner-container');
const authModalEl = document.getElementById('auth-modal');
const taskModalEl = document.getElementById('task-modal');
const authMessageEl = document.getElementById('auth-message');
const taskForm = document.getElementById('task-form');
const taskListEl = document.getElementById('task-list');
const calendarEl = document.getElementById('calendar');
const progressBarEl = document.getElementById('progress-bar');
const welcomeMessageEl = document.getElementById('welcome-message');
const importFileEl = document.getElementById('import-file');
const calendarStartDateEl = document.getElementById('calendar-start-date');
const loadingSpinnerEl = document.getElementById('loading-spinner');
const editingTaskIdEl = document.getElementById('editing-task-id');
const addTaskSubmitBtn = document.getElementById('add-task-submit');
const editTaskActionsDiv = document.getElementById('edit-task-actions');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const updateBtn = document.getElementById("update-task-submit");
const addBtn = document.getElementById("add-task-submit");
const editingTaskIdInput = document.getElementById("editing-task-id");
updateBtn.addEventListener("click", function (e) {
    e.preventDefault();
    const taskId = editingTaskIdInput.value;
    if (!taskId) return;
    const subject = document.getElementById("subject").value.trim();
    const taskDesc = document.getElementById("task").value.trim();
    const startDate = document.getElementById("start-date").value;
    const dueDate = document.getElementById("due-date").value;
    const priority = document.getElementById("priority").value;
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks = tasks.map(task => {
        if (task.id === taskId) {
            return { ...task, subject, task: taskDesc, startDate, dueDate, priority };
        }
        return task;
    });
    localStorage.setItem("tasks", JSON.stringify(tasks));
    renderTaskList();
    taskForm.reset();
    editingTaskIdInput.value = "";
    updateBtn.style.display = "none";
    addBtn.style.display = "block";
    cancelEditBtn.style.display = "none";
    showToast("Task updated successfully!");
});

cancelEditBtn.addEventListener("click", function () {
    taskForm.reset();
    editingTaskIdInput.value = "";
    updateBtn.style.display = "none";
    addBtn.style.display = "block";
    cancelEditBtn.style.display = "none";
});
const authModal = new bootstrap.Modal(authModalEl);
const taskModal = new bootstrap.Modal(taskModalEl);

let currentEditingTaskId = null;
function showToast(title, body, type = 'success') {
    const toastEl = document.getElementById('toast');
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-body').innerHTML = body;
    toastEl.className = 'toast';
    toastEl.classList.add(`text-bg-${type}`);
    new bootstrap.Toast(toastEl).show();
}

function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
}

function toggleSpinner(isVisible) {
    loadingSpinnerEl.style.display = isVisible ? 'block' : 'none';
}

function loadData() {
    const storedAuth = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
    const storedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return { auth: storedAuth, tasks: storedTasks };
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function saveAuth(authData) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
}

function initializeData() {
    const { tasks: loadedTasks, auth } = loadData();
    tasks = loadedTasks.map(task => ({
        ...task,
        dueDate: new Date(task.dueDate), 
        startDate: new Date(task.startDate),
        id: task.id || Date.now() + Math.random(),
    }));

    const loggedInUser = localStorage.getItem('currentUser');
    if (loggedInUser && auth[loggedInUser]) {
        currentUser = loggedInUser;
        showPlanner();
    } else {
        showAuth();
    }
}

function handleSignUp() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!username || !password) { authMessageEl.textContent = 'Username and password are required.'; return; }

    const { auth } = loadData();
    if (auth[username]) { authMessageEl.textContent = 'Username already exists. Please login.'; return; }

    const hashedPassword = CryptoJS.SHA256(password).toString();
    auth[username] = { passwordHash: hashedPassword };
    saveAuth(auth);
    authMessageEl.textContent = 'Sign up successful! Please log in.';
    showToast('Success', 'Account created! Please log in.', 'success');
}

function handleLogin() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!username || !password) { authMessageEl.textContent = 'Username and password are required.'; return; }

    const { auth } = loadData();
    const userData = auth[username];
    if (!userData) { authMessageEl.textContent = 'User not found.'; return; }

    const hashedPassword = CryptoJS.SHA256(password).toString();
    if (hashedPassword === userData.passwordHash) {
        currentUser = username;
        localStorage.setItem('currentUser', username);
        showPlanner();
        showToast('Welcome!', `Logged in as ${currentUser}`, 'success');
    } else {
        authMessageEl.textContent = 'Invalid password.';
    }
}

function showAuth() {
    plannerContainer.style.display = 'none';
    authModal.show();
}

function showPlanner() {
    authModal.hide();
    plannerContainer.style.display = 'block';
    welcomeMessageEl.textContent = `Hello, ${currentUser}! Time to plan your studies.`;
    renderTasks();
    renderProgress();
    renderCalendar();
    setFormDateLimits();
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    tasks = [];
    saveTasks();
    showToast('Goodbye!', 'You have been logged out.', 'info');
    setTimeout(() => location.reload(), 500);
}

function setFormDateLimits() {
    const today = formatDate(new Date());
    document.getElementById('start-date').min = today;
    document.getElementById('due-date').min = today;
}

function handleTaskSubmit(e) {
    e.preventDefault();
    const subject = document.getElementById('subject').value.trim();
    const description = document.getElementById('task').value.trim();
    const startDate = new Date(document.getElementById('start-date').value);
    const dueDate = new Date(document.getElementById('due-date').value);
    const priority = document.getElementById('priority').value;

    if (dueDate < startDate) { showToast('Error', 'Due date cannot be before the start date.', 'danger'); return; }

    const taskId = editingTaskIdEl.value;
    if (taskId) {
        const taskIndex = tasks.findIndex(t => t.id.toString() === taskId);
        if (taskIndex > -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], subject, description, startDate, dueDate, priority };
            showToast('Task Updated', `Task "${subject}" saved successfully.`, 'success');
        }
        resetFormState();
    } else {
        tasks.push({ id: Date.now() + Math.random(), subject, description, startDate, dueDate, priority, completed: false });
        taskForm.reset();
        showToast('Task Added', `"${subject}" task created successfully.`, 'success');
    }
    saveTasks();
    renderTasks();
    renderProgress();
    renderCalendar(currentCalendarDate);
}

function handleEditTask() {
    if (!currentEditingTaskId) return;
    const task = tasks.find(t => t.id === currentEditingTaskId);
    if (!task) return;

    document.getElementById('subject').value = task.subject;
    document.getElementById('task').value = task.description;
    document.getElementById('start-date').value = formatDate(task.startDate);
    document.getElementById('due-date').value = formatDate(task.dueDate);
    document.getElementById('priority').value = task.priority;

    editingTaskIdEl.value = task.id;
    addTaskSubmitBtn.style.display = 'none';
    editTaskActionsDiv.style.display = 'grid';
    taskModal.hide();
    plannerContainer.scrollIntoView({ behavior: 'smooth' });
    showToast('Editing Mode', `Editing task: "${task.description}"`, 'info');
}

function resetFormState() {
    taskForm.reset();
    editingTaskIdEl.value = '';
    addTaskSubmitBtn.style.display = 'block';
    editTaskActionsDiv.style.display = 'none';
    currentEditingTaskId = null;
    setFormDateLimits();
}

function renderTasks() {
    taskListEl.innerHTML = '';
    const sortedTasks = [...tasks].sort((a,b)=>a.completed!==b.completed?a.completed?1:-1:a.dueDate-b.dueDate);
    if (sortedTasks.length===0){ taskListEl.innerHTML='<li class="list-group-item text-center text-muted">No tasks added yet. Start planning!</li>'; return; }

    sortedTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `list-group-item task-item d-flex align-items-center ${task.completed?'completed':''}`;
        li.dataset.taskId = task.id;

        const today = new Date().setHours(0,0,0,0);
        const taskDueDate = new Date(task.dueDate).setHours(0,0,0,0);
        const isOverdue = !task.completed && taskDueDate<today;

        li.innerHTML = `
            <input type="checkbox" class="form-check-input task-toggle me-3" ${task.completed?'checked':''} />
            <div class="task-info">
                <span class="fw-bold">${task.subject}:</span> ${task.description}
                <span class="task-priority ${task.priority}">${task.priority}</span>
                <div class="text-muted small mt-1">
                    Due: ${formatDate(task.dueDate)} ${isOverdue?'<span class="text-danger fw-bold ms-2">OVERDUE</span>':''}
                </div>
            </div>
            <button class="btn btn-sm btn-outline-primary ms-auto view-task-btn">View</button>
        `;
        li.querySelector('.task-toggle').addEventListener('change',()=>toggleTaskCompletion(task.id));
        li.querySelector('.view-task-btn').addEventListener('click',e=>{e.stopPropagation(); showTaskDetails(task.id);});
        taskListEl.appendChild(li);
    });
}

function toggleTaskCompletion(taskId) {
    const taskIndex = tasks.findIndex(t=>t.id===taskId);
    if(taskIndex>-1){
        tasks[taskIndex].completed=!tasks[taskIndex].completed;
        saveTasks();
        renderTasks();
        renderProgress();
        renderCalendar(currentCalendarDate);
        showToast('Task Status', tasks[taskIndex].completed?'Task marked complete!':'Task marked incomplete.', tasks[taskIndex].completed?'success':'warning');
    }
}

function showTaskDetails(taskId){
    const task = tasks.find(t=>t.id===taskId);
    if(!task) return;
    currentEditingTaskId = taskId;

    const today = new Date().setHours(0,0,0,0);
    const taskDueDate = new Date(task.dueDate).setHours(0,0,0,0);
    const isOverdue = !task.completed && taskDueDate<today;
    const overdueBadge = isOverdue?'<span class="badge text-bg-danger ms-2">OVERDUE</span>':'';

    document.getElementById('modal-details').innerHTML=`
        <p><strong>Subject:</strong> ${task.subject}</p>
        <p><strong>Description:</strong> ${task.description}</p>
        <p><strong>Start Date:</strong> ${formatDate(task.startDate)}</p>
        <p><strong>Due Date:</strong> ${formatDate(task.dueDate)} ${overdueBadge}</p>
        <p><strong>Priority:</strong> <span class="badge text-bg-${task.priority.toLowerCase()}">${task.priority}</span></p>
        <p><strong>Status:</strong> ${task.completed?'✅ Completed':'⏳ Pending'}</p>
    `;
    taskModal.show();
}

function handleDeleteTask(){
    if(!currentEditingTaskId) return;
    const taskIndex=tasks.findIndex(t=>t.id===currentEditingTaskId);
    if(taskIndex>-1){
        const deletedTask=tasks.splice(taskIndex,1)[0];
        saveTasks();
        renderTasks();
        renderProgress();
        renderCalendar(currentCalendarDate);
        taskModal.hide();
        showToast('Task Deleted', `"${deletedTask.subject}" was permanently removed.`, 'danger');
        currentEditingTaskId=null;
    }
}

// --- Calendar and Progress ---
function renderCalendar(startDate = new Date()) {
    calendarEl.innerHTML = '';
    const today = new Date(); today.setHours(0,0,0,0);
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(startDate.setDate(diff)); 
    weekStart.setHours(0,0,0,0);
    currentCalendarDate = new Date(weekStart);
    calendarStartDateEl.value = formatDate(weekStart);
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    for(let i=0;i<7;i++){
        const date = new Date(weekStart); 
        date.setDate(weekStart.getDate()+i);
        date.setHours(0,0,0,0);
        const dateString = formatDate(date);
        const dayTasks = tasks.filter(t => {
            const s = new Date(t.startDate); s.setHours(0,0,0,0);
            const d = new Date(t.dueDate); d.setHours(0,0,0,0);
            return date.getTime() >= s.getTime() && date.getTime() <= d.getTime() && !t.completed;
        });
        const isToday = date.getTime() === today.getTime();
        const dayDiv = document.createElement('div');
        dayDiv.className = `calendar-day ${isToday?'today':''} ${dayTasks.length>0?'has-tasks':''}`;
        dayDiv.setAttribute('role','gridcell');
        let taskSummary = '';
        if(dayTasks.length===1) taskSummary = dayTasks[0].subject.substring(0,10)+(dayTasks[0].subject.length>10?'...':'');
        else if(dayTasks.length>1) taskSummary = `${dayTasks.length} tasks`;
        else taskSummary='No tasks';

        dayDiv.innerHTML=`<strong>${dayNames[i]}</strong><div>${date.getDate()}</div><div class="task-count text-muted">${taskSummary}</div>`;

        dayDiv.addEventListener('click',()=>{
            if(dayTasks.length>0){
                const summary = dayTasks.map(t=>`<li>${t.subject} (${t.priority}) - Due: ${formatDate(t.dueDate)}</li>`).join('');
                showToast(`Tasks for ${dayNames[i]}, ${date.getDate()}`, `<ul>${summary}</ul>`,'info');
            }else{
                showToast(`Tasks for ${dayNames[i]}, ${date.getDate()}`, 'No incomplete tasks scheduled for this day.','info');
            }
        });

        calendarEl.appendChild(dayDiv);
    }
}
// document.getElementById('prev-week').addEventListener('click',()=>{
//     currentCalendarDate.setDate(currentCalendarDate.getDate() - 7);
//     renderCalendar(currentCalendarDate);
// });
// document.getElementById('next-week').addEventListener('click',()=>{
//     currentCalendarDate.setDate(currentCalendarDate.getDate() + 7);
//     renderCalendar(currentCalendarDate);
// });
// calendarStartDateEl.addEventListener('change',(e)=>{
//     const newDate = new Date(e.target.value);
//     renderCalendar(newDate);
// });

function renderProgress(){
    const totalTasks=tasks.length;
    const completedTasks=tasks.filter(t=>t.completed).length;
    let percentage=totalTasks>0?Math.round((completedTasks/totalTasks)*100):0;
    progressBarEl.style.width=`${percentage}%`;
    progressBarEl.textContent=`${percentage}% Complete (${completedTasks}/${totalTasks})`;
    if(percentage<33) progressBarEl.className='progress-bar bg-danger';
    else if(percentage<66) progressBarEl.className='progress-bar bg-warning';
    else progressBarEl.className='progress-bar bg-success';
}
document.addEventListener('DOMContentLoaded',()=>{
    initializeData();
    document.getElementById('login-btn').addEventListener('click',handleLogin);
    document.getElementById('signup-btn').addEventListener('click',handleSignUp);
    document.getElementById('logout-btn').addEventListener('click',handleLogout);
    taskForm.addEventListener('submit',handleTaskSubmit);
    document.getElementById('delete-task-btn').addEventListener('click',handleDeleteTask);
    document.getElementById('edit-task-btn').addEventListener('click',handleEditTask);
    document.getElementById('close-modal').addEventListener('click',()=>taskModal.hide());
    cancelEditBtn.addEventListener('click',resetFormState);
    document.getElementById('prev-week').addEventListener('click',()=>{
        currentCalendarDate.setDate(currentCalendarDate.getDate()-7);
        renderCalendar(currentCalendarDate);
    });
    document.getElementById('next-week').addEventListener('click',()=>{
        currentCalendarDate.setDate(currentCalendarDate.getDate()+7);
        renderCalendar(currentCalendarDate);
    });
    calendarStartDateEl.addEventListener('change',(e)=>renderCalendar(new Date(e.target.value)));
});

