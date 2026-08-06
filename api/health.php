<?php
/**
 * GET /api/health.php
 *
 * Verifica se a API PHP está no ar e se a conexão com o MySQL funciona.
 * Não retorna dados de negócio — serve apenas para validar a integração.
 */

declare(strict_types=1);
require __DIR__ . '/_db.php';

cors();

try {
    $row = db()->query('SELECT VERSION() AS mysql_version, NOW() AS server_time')->fetch();
    send_json([
        'status'        => 'ok',
        'db'            => 'connected',
        'mysql_version' => $row['mysql_version'] ?? null,
        'server_time'   => $row['server_time'] ?? null,
    ]);
} catch (Throwable $e) {
    error_log('health check failed: ' . $e->getMessage());
    send_error('Banco indisponível.', 503);
}
