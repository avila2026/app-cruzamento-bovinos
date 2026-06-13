<?php
/**
 * MODELO de endpoint de funcionalidade nova apoiada no MySQL da Hostinger.
 *
 * Demonstra o padrão completo: CORS, autorização, leitura (GET) e escrita
 * (POST) com prepared statements. Copie este arquivo, renomeie e adapte para
 * a sua funcionalidade. Pressupõe uma tabela `app_note` (veja HOSTINGER_BACKEND.md).
 *
 * GET  /api/example_endpoint.php          -> lista as anotações
 * POST /api/example_endpoint.php {body}   -> cria uma anotação
 */

declare(strict_types=1);
require __DIR__ . '/_db.php';

cors();

// --- Autorização -----------------------------------------------------------
// Estes endpoints ficam públicos na internet. ANTES de expor dados reais,
// proteja-os. O app já mantém uma sessão Supabase (JWT); o padrão recomendado
// é enviar esse token no header Authorization e validá-lo aqui.
// Enquanto a verificação real não é implementada, exigimos ao menos a presença
// de um token para não deixar o endpoint totalmente aberto.
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!str_starts_with($authHeader, 'Bearer ')) {
    send_error('Não autorizado.', 401);
}
// TODO: validar o JWT do Supabase (HS256) usando o JWT secret do projeto.

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $rows = db()->query('SELECT id, content, created_at FROM app_note ORDER BY created_at DESC LIMIT 100')->fetchAll();
    send_json(['data' => $rows]);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    $content = is_array($body) ? trim((string) ($body['content'] ?? '')) : '';
    if ($content === '') {
        send_error("Campo 'content' é obrigatório.", 422);
    }
    $stmt = db()->prepare('INSERT INTO app_note (content) VALUES (:content)');
    $stmt->execute([':content' => $content]);
    send_json(['id' => (int) db()->lastInsertId(), 'content' => $content], 201);
}

send_error('Método não suportado.', 405);
