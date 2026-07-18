<?php

declare(strict_types=1);

namespace Myloc;

use Myloc\Middleware\AuthMiddleware;
use Myloc\Utils\Response;

class Router
{
    /** @var array<int, array{method: string, pattern: string, handler: callable, role: string|null}> */
    private array $routes = [];

    public function get(string $pattern, callable $handler, ?string $role = null): self
    {
        return $this->add('GET', $pattern, $handler, $role);
    }

    public function post(string $pattern, callable $handler, ?string $role = null): self
    {
        return $this->add('POST', $pattern, $handler, $role);
    }

    public function put(string $pattern, callable $handler, ?string $role = null): self
    {
        return $this->add('PUT', $pattern, $handler, $role);
    }

    public function patch(string $pattern, callable $handler, ?string $role = null): self
    {
        return $this->add('PATCH', $pattern, $handler, $role);
    }

    public function delete(string $pattern, callable $handler, ?string $role = null): self
    {
        return $this->add('DELETE', $pattern, $handler, $role);
    }

    private function add(string $method, string $pattern, callable $handler, ?string $role = null): self
    {
        $this->routes[] = [
            'method' => $method,
            'pattern' => $pattern,
            'handler' => $handler,
            'role' => $role,
        ];
        return $this;
    }

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $basePath = dirname($_SERVER['SCRIPT_NAME']);
        if ($basePath !== '/' && str_starts_with($uri, $basePath)) {
            $uri = substr($uri, strlen($basePath));
        }
        if ($uri === '' || $uri === false) {
            $uri = '/';
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $params = $this->match($route['pattern'], $uri);
            if ($params === null) {
                continue;
            }

            if ($route['role'] === 'admin') {
                AuthMiddleware::requireAdmin();
            } elseif ($route['role'] === 'client') {
                AuthMiddleware::requireClient();
            }

            $handler = $route['handler'];
            $handler($params);
            return;
        }

        Response::error('Route not found.', 404);
    }

    /**
     * @return array<string, string>|null
     */
    private function match(string $pattern, string $uri): ?array
    {
        $regex = preg_replace('/\{([^}]+)\}/', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';

        if (!preg_match($regex, $uri, $matches)) {
            return null;
        }

        return array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
    }
}
