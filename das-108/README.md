# das108api

Aplicação .NET Minimal API com frontend DataTables e backend CRUD para perfis de veículos.

- Backend: ASP.NET Core Minimal API, banco em memória (Entity Framework Core InMemory)
- Frontend: HTML/JS estático, integração DataTables
- Endpoints principais:
  - GET /api/veiculos
  - GET /api/perfis
  - PUT /api/veiculos/{id}
  - POST /api/veiculos/batch

## Como rodar

1. Execute `dotnet run` na raiz do projeto.
2. Acesse http://localhost:5000 (ou porta exibida no terminal).
3. Use o frontend para gerenciar perfis de veículos.

## Observações
- O banco é volátil: reiniciar o app apaga os dados.
- O Swagger está disponível em /swagger para testar os endpoints.
