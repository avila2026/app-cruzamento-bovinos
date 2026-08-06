<?php
/**
 * Modelo de configuração do banco MySQL da Hostinger.
 *
 * COPIE este arquivo para `db_config.php` (no mesmo diretório) e preencha com
 * as credenciais reais. O arquivo `db_config.php` é ignorado pelo Git e NUNCA
 * deve ser versionado.
 *
 * Na Hostinger (hospedagem compartilhada), o MySQL aceita conexão apenas via
 * 'localhost' — por isso a API PHP roda no mesmo servidor que o banco.
 */
return [
    'host'    => 'localhost',
    'name'    => 'u786088869_Genetica',
    'user'    => 'u786088869_Claude',
    'pass'    => 'SUA_SENHA_AQUI',
    'charset' => 'utf8mb4',

    // Origem permitida para CORS. Em produção, o app e a API ficam no mesmo
    // domínio (mesma origem), então isto só importa para chamadas externas.
    // Use a URL exata do app ou '*' para liberar geral (menos seguro).
    'cors_origin' => '*',
];
