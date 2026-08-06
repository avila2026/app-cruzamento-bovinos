<?php
/**
 * Infraestrutura compartilhada da API PHP da Hostinger.
 *
 * Fornece:
 *  - db(): conexão PDO única com o MySQL (lazy, reutilizada na requisição)
 *  - send_json() / send_error(): respostas JSON padronizadas
 *  - cors(): cabeçalhos CORS + tratamento de preflight
 *
 * Esta camada é ADITIVA: o app continua usando o Supabase para tudo que já
 * existe. Use estes helpers para construir endpoints de funcionalidades novas
 * apoiadas no MySQL da Hostinger.
 */

declare(strict_types=1);

function db_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }
    $path = __DIR__ . '/db_config.php';
    if (!is_file($path)) {
        send_error(
            'Configuração ausente: crie db_config.php a partir de db_config.example.php.',
            500
        );
    }
    /** @var array<string,string> $config */
    $config = require $path;
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $c = db_config();
    $host    = $c['host'] ?? 'localhost';
    $name    = $c['name'] ?? '';
    $charset = $c['charset'] ?? 'utf8mb4';
    $user    = $c['user'] ?? '';
    $pass    = $c['pass'] ?? '';
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $host, $name, $charset);
    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        // Não vaza credenciais nem detalhes internos para o cliente.
        error_log('DB connection failed: ' . $e->getMessage());
        send_error('Falha ao conectar ao banco de dados.', 500);
    }
    return $pdo;
}

/**
 * Lê o header Authorization de forma robusta. Em Apache/LiteSpeed (Hostinger)
 * o header costuma ser descartado ou renomeado antes de chegar ao PHP, então
 * checamos múltiplas fontes.
 */
function get_authorization_header(): string
{
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        return trim($_SERVER['HTTP_AUTHORIZATION']);
    }
    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    }
    if (function_exists('apache_request_headers')) {
        $headers = array_change_key_case(apache_request_headers(), CASE_LOWER);
        if (isset($headers['authorization'])) {
            return trim($headers['authorization']);
        }
    }
    return '';
}

function cors(): void
{
    $origin = db_config()['cors_origin'] ?? '*';
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function send_json(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function send_error(string $message, int $status = 400): never
{
    send_json(['error' => $message], $status);
}
