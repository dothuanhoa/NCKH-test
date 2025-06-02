<?php
$data = json_decode(file_get_contents('php://input'), true);
$code = $data['code'] ?? '';
$input = $data['input'] ?? '';

$filename = "student_" . uniqid() . ".cpp";
file_put_contents($filename, $code);

$input = escapeshellarg($input); // bảo vệ input
$dockerCmd = "docker run --rm -v " . escapeshellarg(getcwd()) . ":/work gcc:latest bash -c "
    . escapeshellarg("g++ /work/$filename -o /work/student_exec && echo $input | /work/student_exec");

$output = shell_exec($dockerCmd);

// Xóa file tạm
unlink($filename);
if (file_exists("student_exec")) unlink("student_exec");

echo json_encode([
    'output' => $output,
    'cmd' => $dockerCmd,
    'filename' => $filename
]);
exit;
?>