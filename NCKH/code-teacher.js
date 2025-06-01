function addTestcase() {
    const tcDiv = document.createElement('div');
    tcDiv.className = 'testcase-group';
    tcDiv.innerHTML = '<input type="text" placeholder="Input" class="tc-input"> <input type="text" placeholder="Expected Output" class="tc-output"> <button type="button" onclick="this.parentNode.remove()">X</button>';
    document.getElementById('testcases').appendChild(tcDiv);
}

document.getElementById('addTestcaseBtn').onclick = addTestcase;

// Thêm bài tập mới
document.getElementById('problemForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const language = document.getElementById('problemLanguage').value;
    const tcInputs = document.querySelectorAll('.tc-input');
    const tcOutputs = document.querySelectorAll('.tc-output');
    const testcases = [];
    for (let i = 0; i < tcInputs.length; i++) {
        if (tcInputs[i].value.trim() !== '' && tcOutputs[i].value.trim() !== '') {
            testcases.push({ input: tcInputs[i].value, expected: tcOutputs[i].value });
        }
    }
    if (!title || !description || testcases.length === 0) {
        alert('Vui lòng nhập đầy đủ thông tin và ít nhất 1 test case!');
        return;
    }
    // Gửi lên server
    await fetch('api.php?action=add_problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, language, testcases })
    });
    await renderProblems();
    this.reset();
    document.getElementById('testcases').innerHTML = '<label>Test case:</label> <div class="testcase-group"><input type="text" placeholder="Input" class="tc-input"> <input type="text" placeholder="Expected Output" class="tc-output"></div>';
});

// Lấy danh sách bài tập từ server
async function renderProblems() {
    const res = await fetch('api.php?action=get_problems');
    let problems = await res.json();
    const problemsDiv = document.getElementById('problems');
    problemsDiv.innerHTML = '';
    problems.forEach((p, idx) => {
        const div = document.createElement('div');
        div.className = 'problem-item';
        div.innerHTML = `<b>${p.title}</b> <span style="color:#888;">(${p.language ? getLangName(p.language) : 'C++'})</span><br><span>${p.description}</span><br><b>Test cases:</b> ${p.testcases.length} <button class="open-problem-btn" data-idx="${p.id}">Lấy link cho sinh viên</button> <button onclick="showSubmissions(${p.id},'${p.title.replace(/'/g, "\\'")}')">Xem bài nộp</button> <button onclick="editProblem(${p.id})">Sửa</button> <button onclick="deleteProblem(${p.id})" style="color:red;">Xóa</button>`;
        problemsDiv.appendChild(div);
    });

    document.querySelectorAll('.open-problem-btn').forEach(btn => {
        btn.onclick = function () {
            const id = btn.getAttribute('data-idx');
            const url = `${window.location.origin}${window.location.pathname.replace('code-teacher.html', 'code-student.html')}?problem_id=${id}`;
            prompt('Copy link này gửi cho sinh viên:', url);
        };
    });
}

// Sửa bài tập (lấy dữ liệu từ server)
async function editProblem(id) {
    const res = await fetch('api.php?action=get_problem&id=' + id);
    const p = await res.json();
    const section = document.getElementById('editProblemSection');
    section.style.display = '';
    section.innerHTML = `
        <h3>Sửa bài tập</h3>
        <form id="editForm">
            <label>Tên bài tập:</label>
            <input type="text" id="editTitle" value="${p.title}" style="width:100%;margin-bottom:12px;" required>
            <label>Mô tả đề bài:</label>
            <textarea id="editDescription" rows="4" style="width:100%;margin-bottom:12px;" required>${p.description}</textarea>
            <label>Ngôn ngữ:</label>
            <select id="editLanguage" style="width:100%;margin-bottom:12px;">
                <option value="cpp" ${p.language === 'cpp' ? 'selected' : ''}>C++</option>
                <option value="java" ${p.language === 'java' ? 'selected' : ''}>Java</option>
                <option value="csharp" ${p.language === 'csharp' ? 'selected' : ''}>C#</option>
            </select>
            <div id="editTestcases">
                <label>Test case:</label>
                ${p.testcases.map(tc => `<div class='testcase-group'><input type='text' class='tc-input' value="${tc.input.replace(/"/g, '&quot;')}"> <input type='text' class='tc-output' value="${tc.expected.replace(/"/g, '&quot;')}"> <button type='button' onclick='this.parentNode.remove()'>X</button></div>`).join('')}
            </div>
            <button type="button" id="addEditTestcaseBtn">+ Thêm test case</button>
            <button type="submit">Lưu thay đổi</button>
        </form>
    `;
    document.getElementById('addEditTestcaseBtn').onclick = function () {
        const tcDiv = document.createElement('div');
        tcDiv.className = 'testcase-group';
        tcDiv.innerHTML = "<input type='text' class='tc-input'> <input type='text' class='tc-output'> <button type='button' onclick='this.parentNode.remove()'>X</button>";
        document.getElementById('editTestcases').appendChild(tcDiv);
    };
    document.getElementById('editForm').onsubmit = async function (e) {
        e.preventDefault();
        const title = document.getElementById('editTitle').value.trim();
        const description = document.getElementById('editDescription').value.trim();
        const language = document.getElementById('editLanguage').value;
        const tcInputs = section.querySelectorAll('.tc-input');
        const tcOutputs = section.querySelectorAll('.tc-output');
        const testcases = [];
        for (let i = 0; i < tcInputs.length; i++) {
            if (tcInputs[i].value.trim() !== '' && tcOutputs[i].value.trim() !== '') {
                testcases.push({ input: tcInputs[i].value, expected: tcOutputs[i].value });
            }
        }
        if (!title || !description || testcases.length === 0) {
            alert('Vui lòng nhập đầy đủ thông tin và ít nhất 1 test case!');
            return;
        }
        // Gửi lên server để cập nhật
        await fetch('api.php?action=update_problem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, title, description, language, testcases })
        });
        section.style.display = 'none';
        await renderProblems();
    };
}

// Xóa bài tập
async function deleteProblem(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bài tập này?')) return;
    await fetch('api.php?action=delete_problem&id=' + id);
    await renderProblems();
    document.getElementById('editProblemSection').style.display = 'none';
}

// Xem bài nộp
async function showSubmissions(problemId, problemTitle) {
    document.getElementById('submissionsSection').style.display = '';
    const res = await fetch('api.php?action=get_submissions&problem_id=' + problemId);
    let submissions = await res.json();
    const tbody = document.querySelector('#submissionsTable tbody');
    tbody.innerHTML = '';
    submissions.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${s.student_name || 'Sinh viên'}</td><td>${problemTitle}</td><td>${s.score}</td><td><pre>${s.details || ''}</pre></td>`;
        tbody.appendChild(tr);
    });
}

renderProblems();
