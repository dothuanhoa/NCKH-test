<?php
$mysqli = new mysqli("localhost", "root", "", "nckh");
header('Content-Type: application/json');

switch ($_GET['action']) {
    case 'get_problems':
        $res = $mysqli->query("SELECT * FROM problems");
        $arr = [];
        while($row = $res->fetch_assoc()) {
            $row['testcases'] = [];
            $tc = $mysqli->query("SELECT input, expected_output as expected FROM testcases WHERE problem_id=".$row['id']);
            while($t = $tc->fetch_assoc()) $row['testcases'][] = $t;
            $arr[] = $row;
        }
        echo json_encode($arr);
        break;

    case 'add_problem':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $mysqli->prepare("INSERT INTO problems(title, description) VALUES (?,?)");
        $stmt->bind_param("ss", $data['title'], $data['description']);
        $stmt->execute();
        $pid = $stmt->insert_id;
        foreach($data['testcases'] as $tc) {
            $stmt2 = $mysqli->prepare("INSERT INTO testcases(problem_id, input, expected_output, is_public) VALUES (?,?,?,1)");
            $stmt2->bind_param("iss", $pid, $tc['input'], $tc['expected']);
            $stmt2->execute();
        }
        echo json_encode(['success'=>true]);
        break;

    case 'get_problem':
        $id = intval($_GET['id']);
        $res = $mysqli->query("SELECT * FROM problems WHERE id=$id");
        $row = $res->fetch_assoc();
        if ($row) {
            $row['testcases'] = [];
            $tc = $mysqli->query("SELECT input, expected_output as expected FROM testcases WHERE problem_id=".$row['id']);
            while($t = $tc->fetch_assoc()) $row['testcases'][] = $t;
        }
        echo json_encode($row);
        break;

    case 'update_problem':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $mysqli->prepare("UPDATE problems SET title=?, description=? WHERE id=?");
        $stmt->bind_param("ssi", $data['title'], $data['description'], $data['id']);
        $stmt->execute();
        // Xóa testcases cũ
        $mysqli->query("DELETE FROM testcases WHERE problem_id=".$data['id']);
        // Thêm lại testcases mới
        foreach($data['testcases'] as $tc) {
            $stmt2 = $mysqli->prepare("INSERT INTO testcases(problem_id, input, expected_output, is_public) VALUES (?,?,?,1)");
            $stmt2->bind_param("iss", $data['id'], $tc['input'], $tc['expected']);
            $stmt2->execute();
        }
        echo json_encode(['success'=>true]);
        break;

    case 'delete_problem':
        $id = intval($_GET['id']);
        $mysqli->query("DELETE FROM problems WHERE id=$id");
        $mysqli->query("DELETE FROM testcases WHERE problem_id=$id");
        $mysqli->query("DELETE FROM submissions WHERE problem_id=$id");
        echo json_encode(['success'=>true]);
        break;

    case 'get_submissions':
        $pid = intval($_GET['problem_id']);
        // Join với bảng users để lấy tên sinh viên
        $res = $mysqli->query("SELECT s.*, u.name as student_name FROM submissions s LEFT JOIN users u ON s.user_id = u.id WHERE s.problem_id=$pid");
        $arr = [];
        while($row = $res->fetch_assoc()) $arr[] = $row;
        echo json_encode($arr);
        break;

    case 'add_submission':
        $data = json_decode(file_get_contents('php://input'), true);
        //$user_id = isset($data['user_id']) ? intval($data['user_id']) : null;
        $user_id =1;
        $problem_id = intval($data['problem_id']);
        $code = $data['code'];
        $score = intval($data['score']);
        $status = "submitted";

        $stmt = $mysqli->prepare("INSERT INTO submissions(user_id, problem_id, code, score, status) VALUES (?,?,?,?,?)");
        $stmt->bind_param("iisis", $user_id, $problem_id, $code, $score, $status);
        $stmt->execute();
        echo json_encode(['success'=>true]);
        break;
        
        // Thêm trường student để lưu tên sinh viên
        $stmt = $mysqli->prepare("INSERT INTO submissions(user_id, problem_id, code, score, status, student, details) VALUES (?,?,?,?,?,?,?)");
        $stmt->bind_param("iisisss", $user_id, $problem_id, $code, $score, $status, $student_name, $details);
        $stmt->execute();
        echo json_encode(['success'=>true]);
        break;
}
?>