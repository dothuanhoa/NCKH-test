let editor;
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });

// Sửa function này để lấy problem_id từ URL và fetch từ server
async function getProblemFromQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    const problemId = urlParams.get('problem_id'); // Đổi từ 'problem' thành 'problem_id'

    if (problemId === null) return null;

    try {
        // Lấy dữ liệu từ server thay vì localStorage
        const response = await fetch(`api.php?action=get_problem&id=${problemId}`);
        const problem = await response.json();
        return problem;
    } catch (error) {
        console.error('Error fetching problem:', error);
        return null;
    }
}

function renderProblem(problem) {
    const infoDiv = document.getElementById('problemInfo');
    if (!problem) {
        infoDiv.innerHTML = '<div style="color:red">Không tìm thấy đề bài. Vui lòng truy cập từ link giáo viên cung cấp.</div>';
        document.getElementById('submitForm').style.display = 'none';
        return;
    }
    let html = `<h2>${problem.title}</h2><div>${problem.description}</div><h4>Test case mẫu:</h4><ul>`;
    problem.testcases.forEach((tc, i) => {
        html += `<li><b>Input:</b> <pre>${tc.input}</pre> <b>Output:</b> <pre>${tc.expected}</pre></li>`;
    });
    html += '</ul>';
    infoDiv.innerHTML = html;
    document.getElementById('submitForm').style.display = '';
}

function runStudentCode(studentCode, input) {
    try {
        const nums = input.trim().split(/\s+/).map(Number);
        let a = nums[0], b = nums[1];

        let match = studentCode.match(/cout\s*<<\s*([^;]+);/);
        if (match) {

            let expr = match[1].replace(/a/g, a).replace(/b/g, b);

            expr = expr.replace(/\(int\)\s*\(([^\)]+)\)/g, 'parseInt($1)');

            let result = eval(expr);
            return result.toString();
        }
        return '';
    } catch (e) {
        return '[Lỗi khi chạy code sinh viên]';
    }
}

// Sửa window.onload để sử dụng async/await
window.onload = async function () {
    const problem = await getProblemFromQuery(); // Thêm await
    renderProblem(problem);
    if (!problem) return;

    require(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(document.getElementById('editor'), {
            value: '',
            language: 'cpp',
            theme: 'vs-light',
            fontSize: 16,
            minimap: { enabled: false }
        });
    });

    document.getElementById('language').addEventListener('change', function (e) {
        if (editor) monaco.editor.setModelLanguage(editor.getModel(), e.target.value === 'cpp' ? 'cpp' : (e.target.value === 'java' ? 'java' : 'csharp'));
    });

    document.getElementById('submitForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        await runJudge(false);
    });

    if (!document.getElementById('checkBtn')) {
        const checkBtn = document.createElement('button');
        checkBtn.type = 'button';
        checkBtn.id = 'checkBtn';
        checkBtn.textContent = 'Kiểm tra kết quả';
        document.querySelector('.actions').appendChild(checkBtn);
        checkBtn.onclick = async function () {
            await runJudge(true);
        };
    }

    async function runJudge(isCheckOnly) {
        const code = editor.getValue();
        let total = problem.testcases.length, passed = 0, details = '', outputDetails = '';

        for (let i = 0; i < problem.testcases.length; i++) {
            const tc = problem.testcases[i];
            let studentOutput = runStudentCode(code, tc.input);
            let isCorrect = compareOutput(studentOutput, tc.expected);
            if (isCorrect) {
                passed++;
                details += `Test case ${i + 1}: Đúng\n`;
            } else {
                details += `Test case ${i + 1}: Sai\n`;
            }
            outputDetails += `Test case ${i + 1}:\nInput: ${tc.input}\nOutput mẫu: ${tc.expected}\nKết quả trả về: ${studentOutput}\n\n`;
        }

        const score = Math.round((passed / total) * 100);
        document.getElementById('result').textContent = `Số test đúng: ${passed}/${total}\nĐiểm: ${score}\n\n${details}\n---\n${outputDetails}`;

        if (!isCheckOnly) {
            const studentName = prompt('Nhập tên sinh viên:');
            if (studentName) {
                // Gửi submission lên server
                const urlParams = new URLSearchParams(window.location.search);
                const problemId = urlParams.get('problem_id');

                try {
                    await fetch('api.php?action=add_submission', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            problem_id: problemId,
                            code: code,
                            score: score,
                            student: studentName,
                            details: details
                        })
                    });
                    alert('Nộp bài thành công!');
                } catch (error) {
                    console.error('Error submitting:', error);
                    alert('Có lỗi khi nộp bài. Vui lòng thử lại.');
                }
            }
        }
    }
}

function compareOutput(a, b) {
    a = (a || '').trim();
    b = (b || '').trim();
    if (/^-?\d+(\.\d+)?$/.test(a) && /^-?\d+(\.\d+)?$/.test(b)) {
        return Math.abs(parseFloat(a) - parseFloat(b)) < 1e-6;
    }
    return a === b;
}