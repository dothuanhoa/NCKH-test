<?php
$output = shell_exec('docker --version 2>&1');
echo "<pre>$output</pre>";
?>