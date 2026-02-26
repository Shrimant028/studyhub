const API = 'http://localhost:5000';
let isLogin = true;

function toggleAuth() {
    isLogin = !isLogin;
    document.getElementById('auth-title').innerText = isLogin ? 'Welcome Back' : 'Create an Account';
    document.getElementById('auth-subtitle').innerText = isLogin ? 'Please enter your details to sign in.' : 'Join StudyHub to manage your engineering life.';
    document.getElementById('auth-btn').innerText = isLogin ? 'Sign In' : 'Sign Up';
    document.getElementById('auth-switch-text').innerHTML = isLogin 
        ? 'Don\'t have an account? <span onclick="toggleAuth()">Create one now</span>'
        : 'Already have an account? <span onclick="toggleAuth()">Sign In here</span>';
}

async function handleAuth() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if(!u || !p) return alert("Please fill all fields");

    const endpoint = isLogin ? '/login' : '/register';
    try {
        const res = await fetch(API + endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: u, password: p})
        });
        const data = await res.json();
        
        if (res.ok) {
            if (isLogin) {
                localStorage.setItem('user_id', data.user_id); 
                window.location.href = 'dashboard.html'; 
            } else {
                alert("Registered Successfully! Please sign in now.");
                toggleAuth(); 
            }
        } else {
            alert(data.message);
        }
    } catch(e) { alert("Server error. Is Termux running?"); }
}

function logout() {
    localStorage.removeItem('user_id');
    window.location.href = 'index.html'; 
}

window.onload = () => {
    const userId = localStorage.getItem('user_id');
    const isLoginPage = document.getElementById('auth-view') !== null;

    if (userId && isLoginPage) {
        window.location.href = 'dashboard.html';
    } else if (!userId && !isLoginPage) {
        window.location.href = 'index.html';
    } else if (userId && !isLoginPage) {
        nav('dashboard');
    }
};

function nav(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active-page');
    document.getElementById('nav-' + pageId).classList.add('active');
    
    if(pageId === 'dashboard') loadDashboard();
    if(pageId === 'schedule') loadSchedule();
}

async function loadDashboard() {
    const uid = localStorage.getItem('user_id');
    try {
        const res = await fetch(`${API}/dashboard/${uid}`);
        const data = await res.json();
        document.getElementById('dash-stats').innerHTML = `
            <div class="card"><h2>${data.total_notes}</h2><p>Total Platform Notes</p></div>
            <div class="card"><h2>${data.my_notes}</h2><p>My Uploads</p></div>
            <div class="card"><h2>${data.my_schedule_entries}</h2><p>My Schedule Tasks</p></div>
            <div class="card"><h2>${data.my_groups}</h2><p>My Groups Joined</p></div>
        `;
    } catch(e) {}
}

async function uploadNote() {
    const file = document.getElementById('file').files[0];
    const subject = document.getElementById('upload-subject').value;
    if(!file || !subject) return alert("Select a file and subject!");

    const fd = new FormData();
    fd.append('subject', subject);
    fd.append('user_id', localStorage.getItem('user_id'));
    fd.append('file', file);

    try {
        const res = await fetch(`${API}/upload_note`, { method: 'POST', body: fd });
        if(res.ok) { 
            alert("Uploaded successfully!"); 
            document.getElementById('upload-subject').value = '';
            document.getElementById('file').value = ''; 
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch(e) { alert("Upload failed. Make sure Termux is running."); }
}

async function fetchNotes() {
    const sub = document.getElementById('search-subject').value;
    if(!sub) return alert("Enter a subject to search");

    try {
        const res = await fetch(`${API}/notes/${sub}`);
        const notes = await res.json();
        const container = document.getElementById('notes-results');
        
        if (notes.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted);">No notes found for this subject.</p>';
            return;
        }

        container.innerHTML = '';
        notes.forEach(n => {
            container.innerHTML += `
                <div class="card" style="text-align: left;">
                    <h3 style="color: var(--primary-blue); margin-bottom: 0.5rem;">${n.subject}</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">File: ${n.filename}</p>
                    <a href="${API}/download/${n.filename}" download class="btn-primary" style="display: block; text-align: center; text-decoration: none;">Download PDF</a>
                </div>`;
        });
    } catch(e) { alert("Search failed."); }
}

async function addSchedule() {
    const body = {
        day: document.getElementById('sch-day').value,
        subject: document.getElementById('sch-subject').value,
        time: document.getElementById('sch-time').value,
        user_id: localStorage.getItem('user_id')
    };
    if(!body.subject || !body.time) return alert("Fill all fields");

    try {
        const res = await fetch(`${API}/add_schedule`, {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(body)
        });
        
        if(res.ok) {
            document.getElementById('sch-subject').value = '';
            document.getElementById('sch-time').value = '';
            loadSchedule();
        }
    } catch(e) { alert("Failed to add task."); }
}

async function loadSchedule() {
    const uid = localStorage.getItem('user_id');
    try {
        const res = await fetch(`${API}/schedule/${uid}`);
        const schedules = await res.json();
        const container = document.getElementById('schedule-list');
        container.innerHTML = '';
        
        if(schedules.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted);">Your schedule is empty. Add a task above.</p>';
            return;
        }

        schedules.forEach(s => {
            container.innerHTML += `
                <div class="card" style="text-align: left;">
                    <h3 style="color:var(--primary-blue); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">${s.day}</h3>
                    <p style="font-weight: 600;">${s.subject}</p>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">${s.time}</p>
                </div>`;
        });
    } catch(e) {}
}

async function joinGroup() {
    const sub = document.getElementById('group-subject').value;
    if(!sub) return alert("Enter a subject name");

    const body = {
        subject: sub,
        user_id: localStorage.getItem('user_id')
    };
    try {
        const res = await fetch(`${API}/join_group`, {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(body)
        });
        
        if(res.ok) {
            alert(`Successfully joined the ${sub} group!`);
            document.getElementById('group-subject').value = '';
            nav('dashboard'); 
        }
    } catch(e) { alert("Failed to join group."); }
}
